import { CLASSES } from "./data";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatBar } from "@/components/ui/stat-bar";
import type { Player } from "./types";

interface CharacterSheetProps {
  player: Player;
  onQuit: () => void;
}

export function CharacterSheet({ player, onQuit }: CharacterSheetProps) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{player.name}</div>
          <div className="text-xs text-muted-foreground">
            {CLASSES[player.cls].name} · Lv.{player.level}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm("모험을 중단하고 생성 화면으로 돌아갈까요? 진행 상황은 저장되지 않습니다.")) {
              onQuit();
            }
          }}
        >
          나가기
        </Button>
      </div>

      <StatBar label="체력" variant="hp" value={player.hp} max={player.maxHp} />
      <StatBar label="마나" variant="mp" value={player.mp} max={player.maxMp} />
      <StatBar label="경험치" variant="xp" value={player.exp} max={player.expNeed} />

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">공격력</span><span className="font-medium">{player.atk}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">방어력</span><span className="font-medium">{player.def}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">마법력</span><span className="font-medium">{player.mag}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">골드</span><span className="font-medium">{player.gold} G</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">물약</span><span className="font-medium">{player.potions}개</span></div>
      </div>
    </Panel>
  );
}
