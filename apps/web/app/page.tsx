import contentData from '../content/content.ep1-slice.json';
import type { ContentBundle } from '../core/schema';
import { GameClient } from './game-client';

export default function Home() {
  return <GameClient content={contentData as ContentBundle} />;
}
