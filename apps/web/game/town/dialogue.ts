/* =====================================================================
 * town/dialogue.ts — 마을 시설 대화 콘텐츠 결합
 *  시설의 구조(좌표·수련·전직)는 TS에, 담당자·대화 텍스트는
 *  content/town-dialogue.json에 둔다. 마을 정의는 attachDialogue로
 *  둘을 합쳐 완전한 TownFacilityDef를 만든다 — 누락은 즉시 오류.
 * ===================================================================== */
import dialogueJson from "../content/town-dialogue.json";
import { validateTownDialogue } from "../content/validate";
import type { TownFacilityDef } from "./types";

const DIALOGUE = validateTownDialogue(dialogueJson);

/** 대화 콘텐츠를 뺀 시설 구조 정의 */
export type TownFacilityShellDef = Omit<TownFacilityDef, "keeper" | "topics">;

export function attachDialogue(townId: string, facilities: TownFacilityShellDef[]): TownFacilityDef[] {
  return facilities.map((f) => {
    const d = DIALOGUE[townId]?.[f.id];
    if (!d) throw new Error(`town-dialogue.json에 ${townId}.${f.id} 대화 항목이 없다`);
    return { ...f, keeper: d.keeper, ...(d.topics ? { topics: d.topics } : {}) };
  });
}
