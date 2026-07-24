import storyJson from "../content/story.json";
import { validateStory } from "../content/validate";
import type { CharacterProfileDef } from "./npcs";
import type { ContentLocale } from "./quests";

export interface StoryCharacterLocaleDef {
  name: string;
  profile: CharacterProfileDef;
}

export interface StoryCharacterDef {
  id: string;
  portrait: number;
  name: string;
  profile: CharacterProfileDef;
  locales: Record<ContentLocale, StoryCharacterLocaleDef>;
}

export interface StoryLineDef {
  speaker?: string;
  name?: string;
  portrait?: number;
  silhouette?: boolean;
  text: string;
  locales: Record<ContentLocale, string>;
}

export interface StoryContentDef {
  characters: Record<string, StoryCharacterDef>;
  events: Record<string, StoryLineDef[]>;
}

export const STORY_CONTENT: StoryContentDef = validateStory(storyJson);

/** Returns fresh line objects so scenes may safely add choices or callbacks. */
export function storyEvent(id: string): StoryLineDef[] {
  const lines = STORY_CONTENT.events[id];
  if (!lines) throw new Error(`unknown story event: ${id}`);
  return lines.map((line) => ({ ...line, locales: { ...line.locales } }));
}
