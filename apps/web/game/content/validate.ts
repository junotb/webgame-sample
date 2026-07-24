/* =====================================================================
 * content/validate.ts — 콘텐츠 JSON 스키마 검증
 *  quests.json·npcs.json·town-dialogue.json은 코드가 아닌 데이터라
 *  타입 검사가 닿지 않는다. 모듈 로드 시 여기서 형태를 검증해
 *  잘못된 편집을 즉시(부팅·테스트에서) 잡는다. 오류 메시지는
 *  json 안의 경로를 함께 담는다.
 * ===================================================================== */
import type {
  CharacterProfileDef, NpcDef, NpcLocaleDef, NpcQuestDialogueDef, NpcTopicDef,
} from "../defs/npcs";
import type { ContentLocale, QuestDef, QuestLocaleDef } from "../defs/quests";
import type {
  StoryCharacterDef, StoryCharacterLocaleDef, StoryContentDef, StoryLineDef,
} from "../defs/story";
import type { TownContentRequirement, TownKeeperDef } from "../town/types";

class ContentError extends Error {
  constructor(path: string, expected: string, actual: unknown) {
    super(`콘텐츠 스키마 오류 — ${path}: ${expected}이어야 하는데 ${JSON.stringify(actual)}를 받았다`);
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function str(v: unknown, path: string): string {
  if (typeof v !== "string" || v.length === 0) throw new ContentError(path, "비어 있지 않은 문자열", v);
  return v;
}
function num(v: unknown, path: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new ContentError(path, "숫자", v);
  return v;
}
function optStr(v: unknown, path: string): string | undefined {
  return v === undefined ? undefined : str(v, path);
}
function rec(v: unknown, path: string): Record<string, unknown> {
  if (!isRecord(v)) throw new ContentError(path, "객체", v);
  return v;
}
function arr(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) throw new ContentError(path, "배열", v);
  return v;
}
function strArr(v: unknown, path: string): string[] {
  return arr(v, path).map((s, i) => str(s, `${path}[${i}]`));
}
/** "#rrggbb" 문자열을 PIXI 색 숫자로 */
function hexColor(v: unknown, path: string): number {
  const s = str(v, path);
  if (!/^#[0-9a-fA-F]{6}$/.test(s)) throw new ContentError(path, '"#rrggbb" 색상', v);
  return parseInt(s.slice(1), 16);
}

function requirement(v: unknown, path: string): TownContentRequirement | undefined {
  if (v === undefined) return undefined;
  const r = rec(v, path);
  const out: TownContentRequirement = {};
  if (r.quests !== undefined) out.quests = strArr(r.quests, `${path}.quests`);
  if (r.minLevel !== undefined) out.minLevel = num(r.minLevel, `${path}.minLevel`);
  if (r.flags !== undefined) {
    out.flags = arr(r.flags, `${path}.flags`).map((f, i) => {
      const s = str(f, `${path}.flags[${i}]`);
      if (s !== "intro" && s !== "ending" && s !== "letter")
        throw new ContentError(`${path}.flags[${i}]`, "intro|ending|letter", f);
      return s;
    });
  }
  return out;
}

function topic(v: unknown, path: string): NpcTopicDef {
  const t = rec(v, path);
  return {
    id: str(t.id, `${path}.id`),
    label: str(t.label, `${path}.label`),
    text: str(t.text, `${path}.text`),
    ...(t.requires !== undefined ? { requires: requirement(t.requires, `${path}.requires`) } : {}),
  };
}

/* ---- quests.json ---- */
const QUEST_KINDS = ["main", "side", "job", "repeat"];
const OBJECTIVE_TYPES = ["kill", "clear", "reach", "talk", "collect", "rescue"];
const CONTENT_LOCALES: ContentLocale[] = ["en", "ko"];

function questLocale(v: unknown, path: string, objectiveIds: string[]): QuestLocaleDef {
  const r = rec(v, path);
  const localizedObjectives = rec(r.objectives, `${path}.objectives`);
  const objectives: Record<string, string> = {};
  for (const id of objectiveIds)
    objectives[id] = str(localizedObjectives[id], `${path}.objectives.${id}`);
  return {
    name: str(r.name, `${path}.name`),
    desc: str(r.desc, `${path}.desc`),
    objectives,
    ...(r.turnIn !== undefined ? { turnIn: str(r.turnIn, `${path}.turnIn`) } : {}),
  };
}

export function validateQuests(data: unknown): QuestDef[] {
  const root = rec(data, "quests.json");
  return arr(root.quests, "quests").map((q, qi) => {
    const path = `quests[${qi}]`;
    const r = rec(q, path);
    const kind = str(r.kind, `${path}.kind`);
    if (!QUEST_KINDS.includes(kind)) throw new ContentError(`${path}.kind`, QUEST_KINDS.join("|"), kind);
    const rewards = rec(r.rewards ?? {}, `${path}.rewards`);
    if (rewards.items !== undefined) {
      arr(rewards.items, `${path}.rewards.items`).forEach((it, i) => {
        const item = rec(it, `${path}.rewards.items[${i}]`);
        str(item.id, `${path}.rewards.items[${i}].id`);
        num(item.n, `${path}.rewards.items[${i}].n`);
      });
    }
    const rawObjectives = arr(r.objectives, `${path}.objectives`);
    const objectiveIds = rawObjectives.map((o, oi) =>
      str(rec(o, `${path}.objectives[${oi}]`).id, `${path}.objectives[${oi}].id`));
    const localeRoot = rec(r.locales, `${path}.locales`);
    const locales = Object.fromEntries(CONTENT_LOCALES.map((locale) => [
      locale,
      questLocale(localeRoot[locale], `${path}.locales.${locale}`, objectiveIds),
    ])) as Record<ContentLocale, QuestLocaleDef>;
    const selected = locales.ko;
    const objectives = rawObjectives.map((o, oi) => {
      const oPath = `${path}.objectives[${oi}]`;
      const obj = rec(o, oPath);
      const type = str(obj.type, `${oPath}.type`);
      if (!OBJECTIVE_TYPES.includes(type)) throw new ContentError(`${oPath}.type`, OBJECTIVE_TYPES.join("|"), type);
      return {
        id: str(obj.id, `${oPath}.id`),
        type,
        target: str(obj.target, `${oPath}.target`),
        count: num(obj.count, `${oPath}.count`),
        desc: selected.objectives[objectiveIds[oi]],
      };
    });
    if (r.requires !== undefined) requirement({ ...rec(r.requires, `${path}.requires`), flags: undefined }, `${path}.requires`);
    return {
      id: str(r.id, `${path}.id`),
      kind,
      name: selected.name,
      desc: selected.desc,
      objectives,
      locales,
      rewards,
      ...(r.requires !== undefined ? { requires: r.requires } : {}),
      ...(r.giver !== undefined ? { giver: str(r.giver, `${path}.giver`) } : {}),
      ...(r.autoStart !== undefined ? { autoStart: r.autoStart === true } : {}),
      ...(r.sequential !== undefined ? { sequential: r.sequential === true } : {}),
      ...(r.turnIn !== undefined ? (() => {
        const turnIn = rec(r.turnIn, `${path}.turnIn`);
        const type = str(turnIn.type, `${path}.turnIn.type`);
        if (!["npc", "facility", "automatic"].includes(type))
          throw new ContentError(`${path}.turnIn.type`, "npc|facility|automatic", type);
        return {
          turnIn: {
            type,
            target: str(turnIn.target, `${path}.turnIn.target`),
            label: selected.turnIn ?? str(turnIn.target, `${path}.turnIn.target`),
          },
        };
      })() : {}),
      ...(r.repeatEveryDays !== undefined ? { repeatEveryDays: num(r.repeatEveryDays, `${path}.repeatEveryDays`) } : {}),
    } as QuestDef;
  });
}

/* ---- npcs.json ---- */
function profile(v: unknown, path: string): CharacterProfileDef {
  const r = rec(v, path);
  return {
    background: str(r.background, `${path}.background`),
    personality: str(r.personality, `${path}.personality`),
    desire: str(r.desire, `${path}.desire`),
    fear: str(r.fear, `${path}.fear`),
    secret: str(r.secret, `${path}.secret`),
    voice: str(r.voice, `${path}.voice`),
  };
}

function questDialogue(v: unknown, path: string): NpcQuestDialogueDef {
  const r = rec(v, path);
  return {
    offer: str(r.offer, `${path}.offer`),
    active: str(r.active, `${path}.active`),
    complete: str(r.complete, `${path}.complete`),
  };
}

function npcLocale(
  v: unknown, path: string, topicIds: string[], questIds: string[],
): NpcLocaleDef {
  const r = rec(v, path);
  const rawTopics = rec(r.topics, `${path}.topics`);
  const topics = Object.fromEntries(topicIds.map((id) => {
    const value = rec(rawTopics[id], `${path}.topics.${id}`);
    return [id, {
      label: str(value.label, `${path}.topics.${id}.label`),
      text: str(value.text, `${path}.topics.${id}.text`),
    }];
  }));
  const rawDialogue = rec(r.questDialogue ?? {}, `${path}.questDialogue`);
  const dialogue = Object.fromEntries(questIds.map((id) => [
    id, questDialogue(rawDialogue[id], `${path}.questDialogue.${id}`),
  ]));
  return {
    name: str(r.name, `${path}.name`),
    desc: str(r.desc, `${path}.desc`),
    greeting: str(r.greeting, `${path}.greeting`),
    profile: profile(r.profile, `${path}.profile`),
    topics,
    questDialogue: dialogue,
  };
}

export function validateNpcs(data: unknown): NpcDef[] {
  const root = rec(data, "npcs.json");
  return arr(root.npcs, "npcs").map((n, ni) => {
    const path = `npcs[${ni}]`;
    const r = rec(n, path);
    const rawTopics = arr(r.topics, `${path}.topics`);
    const topicIds = rawTopics.map((t, ti) =>
      str(rec(t, `${path}.topics[${ti}]`).id, `${path}.topics[${ti}].id`));
    const questIds = r.quests === undefined ? [] : strArr(r.quests, `${path}.quests`);
    const localeRoot = rec(r.locales, `${path}.locales`);
    const locales = Object.fromEntries(CONTENT_LOCALES.map((locale) => [
      locale,
      npcLocale(localeRoot[locale], `${path}.locales.${locale}`, topicIds, questIds),
    ])) as Record<ContentLocale, NpcLocaleDef>;
    const selected = locales.ko;
    return {
      id: str(r.id, `${path}.id`),
      name: selected.name,
      portrait: num(r.portrait, `${path}.portrait`),
      desc: selected.desc,
      greeting: selected.greeting,
      profile: selected.profile,
      questDialogue: selected.questDialogue,
      locales,
      gx: num(r.gx, `${path}.gx`),
      gy: num(r.gy, `${path}.gy`),
      color: hexColor(r.color, `${path}.color`),
      accent: hexColor(r.accent, `${path}.accent`),
      topics: rawTopics.map((t, ti) => {
        const structural = rec(t, `${path}.topics[${ti}]`);
        const localized = selected.topics[topicIds[ti]];
        return {
          id: topicIds[ti],
          label: localized.label,
          text: localized.text,
          ...(structural.requires !== undefined
            ? { requires: requirement(structural.requires, `${path}.topics[${ti}].requires`) }
            : {}),
        };
      }),
      ...(r.town !== undefined ? { town: str(r.town, `${path}.town`) } : {}),
      ...(r.sprite !== undefined ? { sprite: optStr(r.sprite, `${path}.sprite`) } : {}),
      ...(questIds.length ? { quests: questIds } : {}),
    } as NpcDef;
  });
}

/* ---- story.json ---- */
export function validateStory(data: unknown): StoryContentDef {
  const root = rec(data, "story.json");
  const characters: Record<string, StoryCharacterDef> = {};
  for (const [ci, raw] of arr(root.characters, "story.json.characters").entries()) {
    const path = `story.json.characters[${ci}]`;
    const r = rec(raw, path);
    const id = str(r.id, `${path}.id`);
    const localeRoot = rec(r.locales, `${path}.locales`);
    const locales = Object.fromEntries(CONTENT_LOCALES.map((locale) => {
      const localePath = `${path}.locales.${locale}`;
      const value = rec(localeRoot[locale], localePath);
      return [locale, {
        name: str(value.name, `${localePath}.name`),
        profile: profile(value.profile, `${localePath}.profile`),
      }];
    })) as Record<ContentLocale, StoryCharacterLocaleDef>;
    if (characters[id]) throw new ContentError(`${path}.id`, "고유한 캐릭터 id", id);
    characters[id] = {
      id,
      portrait: num(r.portrait, `${path}.portrait`),
      name: locales.ko.name,
      profile: locales.ko.profile,
      locales,
    };
  }

  const events: Record<string, StoryLineDef[]> = {};
  for (const [eventId, rawLines] of Object.entries(rec(root.events, "story.json.events"))) {
    events[eventId] = arr(rawLines, `story.json.events.${eventId}`).map((raw, li) => {
      const path = `story.json.events.${eventId}[${li}]`;
      const r = rec(raw, path);
      const localized = rec(r.text, `${path}.text`);
      const locales = Object.fromEntries(CONTENT_LOCALES.map((locale) => [
        locale, str(localized[locale], `${path}.text.${locale}`),
      ])) as Record<ContentLocale, string>;
      const speaker = optStr(r.speaker, `${path}.speaker`);
      const character = speaker ? characters[speaker] : undefined;
      if (speaker && !character) throw new ContentError(`${path}.speaker`, "등록된 캐릭터 id", speaker);
      return {
        ...(speaker ? { speaker } : {}),
        ...(character ? { name: character.name, portrait: character.portrait } : {}),
        ...(r.anonymous === true ? { name: "???", silhouette: true } : {}),
        text: locales.ko,
        locales,
      };
    });
  }
  return { characters, events };
}

/* ---- town-dialogue.json ---- */
export interface FacilityDialogue {
  keeper: TownKeeperDef;
  topics?: NpcTopicDef[];
}

export function validateTownDialogue(data: unknown): Record<string, Record<string, FacilityDialogue>> {
  const root = rec(data, "town-dialogue.json");
  const out: Record<string, Record<string, FacilityDialogue>> = {};
  for (const [townId, facilities] of Object.entries(root)) {
    out[townId] = {};
    for (const [facilityId, entry] of Object.entries(rec(facilities, townId))) {
      const path = `${townId}.${facilityId}`;
      const e = rec(entry, path);
      const k = rec(e.keeper, `${path}.keeper`);
      const greetings = strArr(k.greetings, `${path}.keeper.greetings`);
      if (greetings.length !== 3) throw new ContentError(`${path}.keeper.greetings`, "인사 3종", greetings.length);
      out[townId][facilityId] = {
        keeper: {
          name: str(k.name, `${path}.keeper.name`),
          role: str(k.role, `${path}.keeper.role`),
          portrait: num(k.portrait, `${path}.keeper.portrait`),
          greetings: greetings as unknown as TownKeeperDef["greetings"],
        },
        ...(e.topics !== undefined
          ? { topics: arr(e.topics, `${path}.topics`).map((t, ti) => topic(t, `${path}.topics[${ti}]`)) }
          : {}),
      };
    }
  }
  return out;
}
