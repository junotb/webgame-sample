/* =====================================================================
 * npcs.test.ts — NPC 데이터 정합성 검증
 * ===================================================================== */
import { describe, expect, it } from "vitest";
import { NPCS, QUESTS } from "../defs";
import { passable } from "../grid";
import { TOWNS, TownId } from "../towns";

const questIds = new Set(QUESTS.map((q) => q.id));
const townOf = (t?: TownId): TownId => t ?? "crossvale";

describe("NPC 데이터 규칙", () => {
  it("NPC가 주는 퀘스트 id는 실재하고, giver와 상호 일치한다", () => {
    for (const n of NPCS) {
      for (const qid of n.quests ?? []) {
        expect(questIds.has(qid), `${n.id}: 없는 퀘스트 ${qid}`).toBe(true);
        expect(QUESTS.find((q) => q.id === qid)?.giver, `${qid}의 giver`).toBe(n.id);
      }
    }
    /* giver가 지정된 퀘스트는 반드시 해당 NPC의 quests에 포함 */
    for (const q of QUESTS.filter((q) => q.giver)) {
      const npc = NPCS.find((n) => n.id === q.giver);
      expect(npc, `${q.id}: 없는 NPC ${q.giver}`).toBeTruthy();
      expect(npc!.quests ?? [], `${q.giver}.quests에 ${q.id} 누락`).toContain(q.id);
    }
  });

  it("초상화 인덱스는 1~48, 파티 프리셋과 중복되지 않는다", () => {
    const used = new Set([1, 25, 13, 37]); // 파티 기본 초상화
    for (const n of NPCS) {
      expect(n.portrait).toBeGreaterThanOrEqual(1);
      expect(n.portrait).toBeLessThanOrEqual(48);
      expect(used.has(n.portrait), `${n.id}: 초상화 ${n.portrait} 중복`).toBe(false);
      used.add(n.portrait);
    }
  });

  it("주제 해금 조건은 실재하는 퀘스트를 가리킨다", () => {
    for (const n of NPCS)
      for (const t of n.topics)
        for (const qid of t.requires?.quests ?? [])
          expect(questIds.has(qid), `${n.id}/${t.id}: 없는 퀘스트 ${qid}`).toBe(true);
  });

  it("NPC는 소속 마을 그리드의 통행 칸에 서 있고, POI·같은 마을 NPC와 겹치지 않는다", () => {
    /* 마을별 점유 칸 집합 (데코·시설) */
    const occupied = new Map<TownId, Set<string>>();
    for (const id of Object.keys(TOWNS) as TownId[]) {
      const t = TOWNS[id];
      occupied.set(id, new Set<string>([
        ...t.decos.map((d) => `${d.x},${d.y}`),
        ...t.facilities.map((f) => `${f.x},${f.y}`),
      ]));
    }
    for (const n of NPCS) {
      const id = townOf(n.town);
      const map = TOWNS[id].map;
      const occ = occupied.get(id)!;
      expect(passable(map, n.gx, n.gy), `${n.id}@${id}: (${n.gx},${n.gy}) 통행 불가 칸`).toBe(true);
      const key = `${n.gx},${n.gy}`;
      expect(occ.has(key), `${n.id}@${id}: (${key}) 점유 충돌`).toBe(false);
      occ.add(key);
    }
  });
});
