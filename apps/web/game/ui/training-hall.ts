import * as PIXI from "pixi.js";
import { CLASSES, ClassId, RANK_NAME, SHOP_ARMORS, SHOP_WEAPONS, SKILLS } from "../defs";
import { C, H, W, button, overlayRoot, panel, toast, txt } from "../core";
import { G, Member, canClassChange, classOptions, doClassChange, memberRanks } from "../state";
import type { TownFacilityDef } from "../town/types";
import { SKILL_PRICE } from "../towns";
import { pickMember } from "./member-picker";
import { openShopMenu } from "./shop-menu";
import { keeperSays } from "../town/content";

export interface TrainingHallOptions {
  onChange: () => void;
  onClose: () => void;
}

/** 무기·방어구점과 마법 길드의 구매·수련·전직 흐름. */
export function openTrainingHall(f: TownFacilityDef, opts: TrainingHallOptions): void {
  const root = new PIXI.Container(); root.zIndex = 60; overlayRoot.addChild(root);
  const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
  dim.eventMode = "static"; root.addChild(dim);
  const p = panel(860, 560); p.x = (W - 860) / 2; p.y = (H - 560) / 2; root.addChild(p);
  const content = new PIXI.Container(); root.addChild(content);
  const closeBtn = button("나가기", 110, 40, close, { size: 15 });
  closeBtn.x = p.x + 860 - 136; closeBtn.y = p.y + 560 - 56; root.addChild(closeBtn);

  const shopGoods = f.id === "weapon" ? SHOP_WEAPONS : f.id === "armor" ? SHOP_ARMORS : null;
  const magic = f.id === "spiritGuild" || f.id === "elementsGuild";
  const trainLabel = magic ? "마법 수련" : "기술 수련";
  const pathNames = (f.classes ?? []).map((c) => CLASSES[c].name);

  function clear(): void { content.removeChildren().forEach((child) => child.destroy({ children: true })); }
  function header(text: string): void {
    const heading = txt(text, 24, C.border, { serif: true });
    heading.x = p.x + 28; heading.y = p.y + 18; content.addChild(heading);
  }
  function destroy(): void { root.destroy({ children: true }); }
  function close(): void { destroy(); opts.onClose(); }

  function main(): void {
    clear(); header(f.name);
    const greeting = txt(keeperSays(f.keeper, "뭘 배우고 싶은지 말해 봐요. 맞는 길을 같이 찾아보죠."), 13, C.dim, { wrap: 760 });
    greeting.x = p.x + 28; greeting.y = p.y + 54; content.addChild(greeting);
    let i = 0;
    const option = (label: string, desc: string, onTap: () => void) => {
      const b = button(label, 340, 52, onTap, { size: 16 });
      b.x = p.x + 28; b.y = p.y + 88 + i * 66; content.addChild(b);
      const d = txt(desc, 13, C.dim, { wrap: 420 });
      d.x = p.x + 390; d.y = p.y + 88 + i * 66 + 16; content.addChild(d);
      i++;
    };
    if (shopGoods) {
      option("장비 구매", keeperSays(f.keeper, f.id === "weapon" ? "무기와 방패는 이쪽이에요." : "갑옷과 장신구는 이쪽에서 봐요."), () => {
        destroy();
        openShopMenu({
          title: f.id === "weapon" ? "무기점 — 담금질한 강철" : "방어구점 — 견고한 수호",
          goods: shopGoods,
          kind: f.id === "weapon" ? "weapon" : "armor",
          keeper: f.keeper,
          onChange: opts.onChange,
          onClose: () => openTrainingHall(f, opts),
        });
      });
    }
    if (f.trains?.length)
      option(trainLabel, keeperSays(f.keeper, `${f.trains.map((k) => SKILLS[k].name).join(" · ")} 중 필요한 걸 가르쳐 드리죠.`), trainPage);
    if (f.classes?.length)
      option("전직 상담", keeperSays(f.keeper, `${pathNames.join(" · ")}의 길을 함께 살펴보죠.`), classPage);
  }

  function trainPage(): void {
    clear(); header(`${f.name} — ${trainLabel}`);
    const sub = txt(keeperSays(f.keeper, `처음 배우는 기술은 ${SKILL_PRICE} G예요. 기초부터 제대로 봐 드리죠.`), 13, C.dim);
    sub.x = p.x + 28; sub.y = p.y + 56; content.addChild(sub);
    (f.trains ?? []).forEach((skill, i) => {
      const y = p.y + 92 + i * 52;
      const b = button(`${SKILLS[skill].name}  —  ${SKILL_PRICE} G`, 280, 42, () => {
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
      }, { size: 14 });
      b.x = p.x + 28; b.y = y; content.addChild(b);
      const d = txt(`${SKILLS[skill].cat} 계열`, 13, C.dim);
      d.x = p.x + 330; d.y = y + 12; content.addChild(d);
    });
    const back = button("← 돌아가기", 130, 40, main, { size: 14 });
    back.x = p.x + 28; back.y = p.y + 560 - 56; content.addChild(back);
  }

  function hallOptions(member: Member): ClassId[] {
    return classOptions(member).filter((classId) => (f.classes ?? []).includes(classId));
  }

  function classPage(): void {
    clear(); header(`${f.name} — 전직 상담`);
    const sub = txt(keeperSays(f.keeper, `여기선 ${pathNames.join(" · ")}의 길을 안내해요. 선택은 되돌릴 수 없으니 신중히 골라요.`), 13, C.dim, { wrap: 780 });
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
      b.x = p.x + 28; b.y = p.y + 92 + i * 58; content.addChild(b);
    });
    const back = button("← 돌아가기", 130, 40, main, { size: 14 });
    back.x = p.x + 28; back.y = p.y + 560 - 56; content.addChild(back);
  }

  function memberPage(member: Member): void {
    clear(); header(`${member.name}의 갈림길`);
    const intro = txt(keeperSays(f.keeper, `${member.name}의 ${CLASSES[member.classId].name} 소양이라면 이런 길이 어울리겠네요.`), 15, C.text);
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
      b.x = p.x + 28; b.y = p.y + 104 + i * 58; content.addChild(b);
      const d = txt(cls.desc, 13, C.dim, { wrap: 780 });
      d.x = p.x + 620; d.y = p.y + 104 + i * 58 + 14; content.addChild(d);
    });
    const back = button("← 돌아가기", 130, 40, classPage, { size: 14 });
    back.x = p.x + 28; back.y = p.y + 500; content.addChild(back);
  }

  function alignmentPage(member: Member, classId: ClassId): void {
    clear(); header("빛과 어둠의 기로");
    const description = txt(`${CLASSES[classId].name}의 길은 신앙의 선택을 요구하네.\n선택한 계열이 달인/전문가의 경지로 각성한다.`, 16, C.text, { lh: 26 });
    description.x = p.x + 28; description.y = p.y + 64; content.addChild(description);
    const light = button("빛의 길 — 성광과 축복", 340, 52, () => { doClassChange(member, classId, "light"); done(member, classId); }, { size: 16 });
    light.x = p.x + 28; light.y = p.y + 150; content.addChild(light);
    const dark = button("어둠의 길 — 암흑과 흡수", 340, 52, () => { doClassChange(member, classId, "dark"); done(member, classId); }, { size: 16 });
    dark.x = p.x + 28; dark.y = p.y + 214; content.addChild(dark);
    const back = button("← 돌아가기", 130, 40, () => memberPage(member), { size: 14 });
    back.x = p.x + 28; back.y = p.y + 500; content.addChild(back);
  }

  function done(member: Member, classId: ClassId): void {
    toast(keeperSays(f.keeper, `${member.name}, 이제 ${CLASSES[classId].name}의 길을 걷는군요.`), C.border);
    opts.onChange(); classPage();
  }

  main();
}
