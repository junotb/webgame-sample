import { describe, expect, it } from "vitest";
import { ABILITIES, FIELD_SKILLS, MAGIC_TRADITIONS, MagicSchoolId } from "../defs";
import { Stats, knowsSpell, magicBase } from "../state";

const SCHOOLS = Object.values(MAGIC_TRADITIONS)
  .flatMap((tradition) => tradition.schools) as MagicSchoolId[];

describe("spell content rules", () => {
  it("defines exactly 12 combat and field spells per school in a 6/3/3 tier split", () => {
    const allSpells = [...ABILITIES, ...FIELD_SKILLS]
      .filter((spell) => SCHOOLS.includes(spell.skill as MagicSchoolId));
    expect(allSpells)
      .toHaveLength(108);

    for (const school of SCHOOLS) {
      const spells = allSpells.filter((spell) => spell.skill === school);
      expect(spells, school).toHaveLength(12);
      expect(spells.filter((ability) => ability.min === 1), school).toHaveLength(6);
      expect(spells.filter((ability) => ability.min === 2), school).toHaveLength(3);
      expect(spells.filter((ability) => ability.min === 3), school).toHaveLength(3);
    }
  });

  it("gives every school a novice single-target attack and ward, plus an expert area attack", () => {
    for (const school of SCHOOLS) {
      const novice = ABILITIES.filter((ability) => ability.skill === school && ability.min === 1);
      const expert = ABILITIES.filter((ability) => ability.skill === school && ability.min === 2);

      expect(novice.some((ability) => ability.kind === "mag" && !ability.all
        && (ability.target ?? "enemy") === "enemy"), `${school}: novice attack`).toBe(true);
      expect(novice.some((ability) => ability.resistBuff !== undefined),
        `${school}: novice ward`).toBe(true);
      expect(expert.some((ability) => ability.kind === "mag" && ability.all
        && (ability.target ?? "enemy") === "enemy"), `${school}: expert area attack`).toBe(true);
    }
  });

  it("keeps two starter spells per school free and gates the rest behind learning", () => {
    for (const school of SCHOOLS) {
      const spells = [...ABILITIES, ...FIELD_SKILLS].filter((spell) => spell.skill === school);
      const starters = spells.filter((spell) => spell.starter);
      const purchasable = spells.find((spell) => !spell.starter)!;
      const member = { learnedSpells: [] } as unknown as Parameters<typeof knowsSpell>[0];

      expect(starters, school).toHaveLength(2);
      expect(starters.every((ability) => knowsSpell(member, ability)), school).toBe(true);
      expect(knowsSpell(member, purchasable), school).toBe(false);
      member.learnedSpells.push(purchasable.id);
      expect(knowsSpell(member, purchasable), school).toBe(true);
    }
  });

  it("requires field spells to be learned just like combat spells", () => {
    const recall = FIELD_SKILLS.find((spell) => spell.id === "recall")!;
    const member = { learnedSpells: [] } as unknown as Parameters<typeof knowsSpell>[0];
    expect(knowsSpell(member, recall)).toBe(false);
    member.learnedSpells.push(recall.id);
    expect(knowsSpell(member, recall)).toBe(true);
  });
});

describe("divine casting attribute", () => {
  const stats = {
    atk: 0, magInt: 18, magWit: 13, def: 0, spd: 0, evAC: 0, crit: 0, guardCut: 0,
    mods: { might: 0, int: 0, wit: 0, vital: 0, agi: 0, fortune: 0 },
  } satisfies Stats;

  it("uses the higher of INT and WIT for both divine schools", () => {
    expect(magicBase(stats, "light")).toBe(18);
    expect(magicBase(stats, "dark")).toBe(18);
    expect(magicBase({ ...stats, magInt: 9, magWit: 16 }, "light")).toBe(16);
  });

  it("leaves elemental and self-school casting attributes unchanged", () => {
    expect(magicBase(stats, "fire")).toBe(18);
    expect(magicBase(stats, "spirit")).toBe(13);
  });
});
