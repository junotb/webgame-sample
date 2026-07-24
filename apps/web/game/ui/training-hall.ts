import * as PIXI from "pixi.js";
import { CLASSES, ClassId, MagicSchoolId, RANK_NAME, SKILLS, isMagicSchool } from "../defs";
import { C, H, W, button, openOverlay, panel, toast, txt } from "../core";
import { G, Member, canClassChange, classOptions, doClassChange, memberRanks } from "../state";
import type { TownFacilityDef } from "../town/types";
import { SKILL_PRICE } from "../towns";
import { pickMember } from "./member-picker";
import { openSpellShop } from "./spell-shop";
import { keeperSays } from "../town/content";

export type HallTab = "train" | "class";

export interface TrainingHallOptions {
  onChange: () => void;
  onClose: () => void;
  /** 처음 보여줄 탭 */
  initialTab?: HallTab;
  /** 무기·방어구점: 장비 구매 버튼 — 상점 오버레이로 전환 */
  onShop?: () => void;
}

/* 우측 세로 내비게이션 + 좌측 콘텐츠 한 화면 — 페이지를 쌓지 않는다. */
const PW = 860, PH = 560;
const NAV_W = 180;
const NAV_X = PW - NAV_W - 28;
const CONTENT_W = NAV_X - 44;

/** 무기·방어구점과 마법 길드의 수련·전직 흐름. */
export function openTrainingHall(f: TownFacilityDef, opts: TrainingHallOptions): void {
  const ov = openOverlay({ onClose: opts.onClose }); const root = ov.root;
  const p = panel(PW, PH); p.x = (W - PW) / 2; p.y = (H - PH) / 2; root.addChild(p);
  const content = new PIXI.Container(); root.addChild(content);

  const magic = f.id === "spiritGuild" || f.id === "elementsGuild";
  const trainLabel = magic ? "마법 수련" : "기술 수련";
  const pathNames = (f.classes ?? []).map((c) => CLASSES[c].name);

  /* ---- 우측 내비게이션 ---- */
  let tab: HallTab = opts.initialTab ?? (f.trains?.length ? "train" : "class");
  const navBtns: Partial<Record<HallTab, ReturnType<typeof button>>> = {};
  let navY = p.y + 88;
  const navBtn = (label: string, onTap: () => void) => {
    const b = button(label, NAV_W, 46, onTap, { size: 15 });
    b.x = p.x + NAV_X; b.y = navY; navY += 56; root.addChild(b);
    return b;
  };
  if (opts.onShop) navBtn("장비 구매", () => { ov.close({ silent: true }); opts.onShop!(); });
  /* 마법 길드: 학파 주문을 골드로 습득하는 상점으로 전환 (같은 깊이) */
  const spellSchools = (f.trains ?? []).filter(isMagicSchool) as MagicSchoolId[];
  if (spellSchools.length) navBtn("주문 습득", () => {
    ov.close({ silent: true });
    openSpellShop(f, spellSchools, { onChange: opts.onChange, onClose: opts.onClose });
  });
  if (f.trains?.length) navBtns.train = navBtn(trainLabel, () => setTab("train"));
  if (f.classes?.length) navBtns.class = navBtn("전직 상담", () => setTab("class"));
  const closeBtn = button("나가기", NAV_W, 44, () => ov.close(), { size: 15 });
  closeBtn.x = p.x + NAV_X; closeBtn.y = p.y + PH - 60; root.addChild(closeBtn);

  function setTab(next: HallTab): void {
    tab = next;
    (Object.keys(navBtns) as HallTab[]).forEach((k) => { navBtns[k]!.alpha = k === tab ? 1 : 0.55; });
    if (tab === "train") trainPage(); else classPage();
  }

  function clear(): void { content.removeChildren().forEach((child) => child.destroy({ children: true })); }
  function header(text: string): void {
    const heading = txt(text, 24, C.border, { serif: true });
    heading.x = p.x + 28; heading.y = p.y + 18; content.addChild(heading);
  }

  function trainPage(): void {
    clear(); header(`${f.name} — ${trainLabel}`);
    const sub = txt(keeperSays(f.keeper, `처음 배우는 기술은 ${SKILL_PRICE} G예요. 기초부터 제대로 봐 드리죠.`), 13, C.dim, { wrap: CONTENT_W });
    sub.x = p.x + 28; sub.y = p.y + 56; content.addChild(sub);
    (f.trains ?? []).forEach((skill, i) => {
      const y = p.y + 92 + i * 52;
      const icon = SKILLS[skill].icon;
      const b = button(`${icon ? `${icon} ` : ""}${SKILLS[skill].name}  —  ${SKILL_PRICE} G`, 280, 42, () => {
        if (G.gold < SKILL_PRICE) return toast(keeperSays(f.keeper, "수련비가 모자라네요. 준비되면 다시 와요."), C.dim);
        pickMember(`${SKILLS[skill].name} — 누가 배울까?`, (member) => {
          G.gold -= SKILL_PRICE;
          member.bonusSkills.push(skill);
          toast(keeperSays(f.keeper, `${member.name}, 이제 ${SKILLS[skill].name}의 기초는 익혔어요.`), C.border);
          opts.onChange(); trainPage();
        }, {
          filter: (member) => (memberRanks(member)[skill] ?? 0) === 0,
          note: (member) => {
            const rank = memberRanks(member)[skill] ?? 0;
            return rank ? `(이미 ${RANK_NAME[rank]})` : "(미습득)";
          },
        });
      }, { size: 14, border: SKILLS[skill].color });
      b.x = p.x + 28; b.y = y; content.addChild(b);
      const d = txt(`${SKILLS[skill].cat} 계열`, 13, C.dim);
      d.x = p.x + 330; d.y = y + 12; content.addChild(d);
    });
  }

  function hallOptions(member: Member): ClassId[] {
    return classOptions(member).filter((classId) => (f.classes ?? []).includes(classId));
  }

  function classPage(): void {
    clear(); header(`${f.name} — 전직 상담`);
    const sub = txt(keeperSays(f.keeper, `여기선 ${pathNames.join(" · ")}의 길을 안내해요. 선택은 되돌릴 수 없으니 신중히 골라요.`), 13, C.dim, { wrap: CONTENT_W });
    sub.x = p.x + 28; sub.y = p.y + 56; content.addChild(sub);
    G.party.forEach((member, i) => {
      const change = canClassChange(member);
      const choices = hallOptions(member);
      const tier = CLASSES[member.classId].tier;
      const status = change && choices.length
        ? (change === "t1" ? "▶ 1차 전직 가능" : "▶ 2차 전직 가능")
        : change ? "(다른 건물의 길)"
          : tier === 2 ? "(최종 클래스)"
            : tier === 0 ? (member.level < 3 ? "(Lv3 필요)" : "(첫 번째 승급 심사 필요)")
              : (member.level < 6 ? "(Lv6 필요)" : "(최종 승급 심사 필요)");
      const b = button(`${member.name} — ${CLASSES[member.classId].name} Lv.${member.level}  ${status}`, 560, 48, () => memberPage(member), { size: 15 });
      if (!change || !choices.length) b.setDisabled(true);
      b.x = p.x + 28; b.y = p.y + 100 + i * 58; content.addChild(b);
    });
  }

  function memberPage(member: Member): void {
    clear(); header(`${member.name}의 갈림길`);
    const intro = txt(keeperSays(f.keeper, `${member.name}의 ${CLASSES[member.classId].name} 소양이라면 이런 길이 어울리겠네요.`), 15, C.text, { wrap: CONTENT_W });
    intro.x = p.x + 28; intro.y = p.y + 62; content.addChild(intro);
    hallOptions(member).forEach((classId, i) => {
      const cls = CLASSES[classId];
      const mastery = cls.masters
        ? cls.masters.map((skill) => (skill === "LD" ? "빛or어둠" : SKILLS[skill].name)).join("·") + " 달인"
        : cls.desc;
      const b = button(`${cls.name} — ${mastery}`, 560, 48, () => {
        if (cls.ld) alignmentPage(member, classId);
        else { doClassChange(member, classId); done(member, classId); }
      }, { size: 15 });
      b.x = p.x + 28; b.y = p.y + 116 + i * 78; content.addChild(b);
      const d = txt(cls.desc, 13, C.dim, { wrap: 560 });
      d.x = p.x + 28; d.y = p.y + 116 + i * 78 + 50; content.addChild(d);
    });
    const back = button("← 돌아가기", 130, 40, classPage, { size: 14 });
    back.x = p.x + 28; back.y = p.y + PH - 60; content.addChild(back);
  }

  function alignmentPage(member: Member, classId: ClassId): void {
    clear(); header("빛과 어둠의 기로");
    const description = txt(`${CLASSES[classId].name}의 길은 신앙의 선택을 요구하네.\n선택한 계열이 달인/전문가의 경지로 각성한다.`, 16, C.text, { lh: 26, wrap: CONTENT_W });
    description.x = p.x + 28; description.y = p.y + 64; content.addChild(description);
    const light = button("빛의 길 — 성광과 축복", 340, 52, () => { doClassChange(member, classId, "light"); done(member, classId); }, { size: 16 });
    light.x = p.x + 28; light.y = p.y + 150; content.addChild(light);
    const dark = button("어둠의 길 — 암흑과 흡수", 340, 52, () => { doClassChange(member, classId, "dark"); done(member, classId); }, { size: 16 });
    dark.x = p.x + 28; dark.y = p.y + 214; content.addChild(dark);
    const back = button("← 돌아가기", 130, 40, () => memberPage(member), { size: 14 });
    back.x = p.x + 28; back.y = p.y + PH - 60; content.addChild(back);
  }

  function done(member: Member, classId: ClassId): void {
    toast(keeperSays(f.keeper, `${member.name}, 이제 ${CLASSES[classId].name}의 길을 걷는군요.`), C.border);
    opts.onChange(); classPage();
  }

  setTab(tab);
}
