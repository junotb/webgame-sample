/* =====================================================================
 * ui/spell-shop.ts — 주문 습득 상점 (마법 길드·신전 공용)
 *  starter가 아닌 주문을 학파별로 진열하고, 랭크를 충족한 멤버가
 *  골드를 내고 개인 습득(learnedSpells)한다.
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  ABILITIES, FIELD_SKILLS, MagicSchoolId, RANK_NAME, SKILLS, SpellDef, abilityIcon,
} from "../defs";
import { C, H, W, button, openOverlay, panel, toast, txt } from "../core";
import { G, knowsSpell, learnSpell, memberRanks } from "../state";
import type { TownFacilityDef } from "../town/types";
import { SPELL_PRICE } from "../towns";
import { pickMember } from "./member-picker";
import { keeperSays } from "../town/content";

export interface SpellShopOptions {
  onChange: () => void;
  onClose: () => void;
}

const PW = 860, PH = 620;
const NAV_W = 180;
const NAV_X = PW - NAV_W - 28;
const CONTENT_W = NAV_X - 44;

/** 학파별 판매 주문 — starter 제외, 티어 오름차순 */
function schoolStock(school: MagicSchoolId): SpellDef[] {
  return [...ABILITIES, ...FIELD_SKILLS]
    .filter((a) => a.skill === school && !a.starter)
    .sort((a, b) => a.min - b.min);
}

export function openSpellShop(f: TownFacilityDef, schools: MagicSchoolId[], opts: SpellShopOptions): void {
  const ov = openOverlay({ onClose: opts.onClose }); const root = ov.root;
  const p = panel(PW, PH); p.x = (W - PW) / 2; p.y = (H - PH) / 2; root.addChild(p);
  const content = new PIXI.Container(); root.addChild(content);

  /* ---- 우측 학파 내비게이션 ---- */
  let school: MagicSchoolId = schools[0];
  const navBtns: Partial<Record<MagicSchoolId, ReturnType<typeof button>>> = {};
  let navY = p.y + 88;
  for (const s of schools) {
    const meta = SKILLS[s];
    const b = button(`${meta.icon} ${meta.name}`, NAV_W, 46, () => setSchool(s), { size: 15, border: meta.color });
    b.x = p.x + NAV_X; b.y = navY; navY += 56; root.addChild(b);
    navBtns[s] = b;
  }
  const closeBtn = button("나가기", NAV_W, 44, () => ov.close(), { size: 15 });
  closeBtn.x = p.x + NAV_X; closeBtn.y = p.y + PH - 60; root.addChild(closeBtn);

  function setSchool(next: MagicSchoolId): void {
    school = next;
    for (const s of schools) navBtns[s]!.alpha = s === school ? 1 : 0.55;
    page();
  }

  function clear(): void { content.removeChildren().forEach((child) => child.destroy({ children: true })); }

  function page(): void {
    clear();
    const meta = SKILLS[school];
    const heading = txt(`${f.name} — ${meta.icon} ${meta.name} 주문 습득`, 24, C.border, { serif: true });
    heading.x = p.x + 28; heading.y = p.y + 18; content.addChild(heading);
    const sub = txt(
      keeperSays(f.keeper, "기본 주문은 수련만으로 충분하지만, 깊은 주문은 문서를 사서 익혀야 해요."),
      13, C.dim, { wrap: CONTENT_W });
    sub.x = p.x + 28; sub.y = p.y + 56; content.addChild(sub);
    const gold = txt(`보유 골드: ${G.gold} G`, 13, C.text);
    gold.x = p.x + 28; gold.y = p.y + 80; content.addChild(gold);

    schoolStock(school).forEach((a, i) => {
      const y = p.y + 108 + i * 52;
      const price = SPELL_PRICE[a.min as 1 | 2 | 3];
      const b = button(`${abilityIcon(a)} ${a.name} [${RANK_NAME[a.min]}]  —  ${price} G`, 330, 42, () => {
        if (G.gold < price) return toast(keeperSays(f.keeper, "골드가 모자라네요. 준비되면 다시 와요."), C.dim);
        pickMember(`${a.name} — 누가 배울까?`, (member) => {
          G.gold -= price;
          learnSpell(member, a.id);
          toast(keeperSays(f.keeper, `${member.name}, ${a.name}의 이치를 새겼어요.`), C.border);
          opts.onChange(); page();
        }, {
          filter: (member) => (memberRanks(member)[a.skill] ?? 0) >= a.min && !knowsSpell(member, a),
          note: (member) => {
            const rank = memberRanks(member)[a.skill] ?? 0;
            if (knowsSpell(member, a)) return "(이미 습득)";
            return rank >= a.min ? "(습득 가능)" : `(${RANK_NAME[a.min]} 랭크 필요)`;
          },
        });
      }, { size: 14, border: meta.color });
      b.x = p.x + 28; b.y = y; content.addChild(b);
      const d = txt(`MP ${a.mp} · ${a.desc}`, 13, C.dim, { wrap: CONTENT_W - 360 });
      d.x = p.x + 380; d.y = y + 4; content.addChild(d);
    });
  }

  setSchool(school);
}
