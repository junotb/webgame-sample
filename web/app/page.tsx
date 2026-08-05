import { loadContent } from '../content/loader';
import { GameClient } from './game-client';

export default function Home() {
  const [content] = loadContent();
  return <GameClient content={content} />;
}
