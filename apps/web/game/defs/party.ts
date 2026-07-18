/* =====================================================================
 * defs/party.ts — 파티 슬롯·기본 프리셋
 * ===================================================================== */

import { Attrs } from "./attrs";
import { ClassId } from "./classes";
import { SkillId } from "./skills";

/* ---- 파티 슬롯 (4인) — 기본값은 프리셋, 생성 화면에서 자유 수정 ---- */
/** 슬롯별 기본 설정 — 각자 특정 2차 직업으로 성장하기 쉽게 맞춰져 있다 */
export interface PartyPreset {
  /** 초상화 1-based 인덱스 (1~23 남성, 24~48 여성 — portraits.ts) */
  portrait: number;
  classId: ClassId;
  skills: SkillId[];
  attrs: Attrs;
  /** 추천 성장 경로 (전직 목표) */
  path: ClassId[];
}
export interface PartySlot {
  id: string;
  name: string;
  preset: PartyPreset;
}
export const PARTY_SLOTS: PartySlot[] = [
  {
    id: "aeren", name: "에런",
    /* 남성 — 소드마스터 지향: 근력·체력 중심, 창/방패로 전열 완성 */
    preset: {
      portrait: 1, // male01
      classId: "fighter",
      skills: ["spear", "shield"],
      attrs: { might: 14, int: 10, wit: 10, vital: 13, agi: 12, fortune: 11 },
      path: ["fighter", "swordman", "swordmaster"],
    },
  },
  {
    id: "lien", name: "리엔",
    /* 여성 — 레인저 지향: 민첩·운 중심, 활/회피 선행 습득 */
    preset: {
      portrait: 25, // female02
      classId: "fighter",
      skills: ["bow", "dodge"],
      attrs: { might: 12, int: 10, wit: 10, vital: 12, agi: 14, fortune: 12 },
      path: ["fighter", "spellsword", "ranger"],
    },
  },
  {
    id: "cassius", name: "카시우스",
    /* 남성 — 대마법사 지향: 지능 중심, 인지/식별로 보조 커버 */
    preset: {
      portrait: 13, // male13
      classId: "scholar",
      skills: ["perception", "identify"],
      attrs: { might: 10, int: 15, wit: 12, vital: 12, agi: 11, fortune: 10 },
      path: ["scholar", "mage", "archmage"],
    },
  },
  {
    id: "mira", name: "미라",
    /* 여성 — 사제 지향: 지혜 중심, 방패/무술로 근접 대응력 */
    preset: {
      portrait: 37, // female14
      classId: "scholar",
      skills: ["shield", "martial"],
      attrs: { might: 10, int: 11, wit: 15, vital: 12, agi: 10, fortune: 12 },
      path: ["scholar", "acolyte", "priest"],
    },
  },
];
