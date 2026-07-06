import { CLASSES } from "./data";
import { Panel } from "@/components/ui/panel";
import { StatBar } from "@/components/ui/stat-bar";
import { Button } from "@/components/ui/button";
import type { Enemy, Mode, Player, Skill, ShopItem } from "./types";

interface MainStageProps {
  mode: Mode;
  player: Player;
  enemy: Enemy | null;
  turnBusy: boolean;
  shopItems: ShopItem[];
  smithItems: ShopItem[];
  innRestCost: number;
  advance: () => void;
  enterShop: () => void;
  enterSmith: () => void;
  rest: () => void;
  playerAttack: () => void;
  playerSkill: (skill: Skill) => void;
  playerGuard: () => void;
  usePotionInCombat: () => void;
  flee: () => void;
  buyItem: (item: ShopItem) => void;
  leaveShop: () => void;
  leaveSmith: () => void;
  restart: () => void;
}

function ShopList({
  title,
  items,
  gold,
  onBuy,
  onLeave,
}: {
  title: string;
  items: ShopItem[];
  gold: number;
  onBuy: (item: ShopItem) => void;
  onLeave: () => void;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-muted-foreground">{title}</div>
      <div className="divide-y">
        {items.map((item) => (
          <div className="flex items-center justify-between py-2" key={item.id}>
            <div>
              <div className="text-sm font-medium">{item.name} — {item.cost}G</div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </div>
            <Button size="sm" onClick={() => onBuy(item)} disabled={gold < item.cost}>
              구매
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <Button onClick={onLeave}>떠나기</Button>
      </div>
    </div>
  );
}

export function MainStage({
  mode,
  player,
  enemy,
  turnBusy,
  shopItems,
  smithItems,
  innRestCost,
  advance,
  enterShop,
  enterSmith,
  rest,
  playerAttack,
  playerSkill,
  playerGuard,
  usePotionInCombat,
  flee,
  buyItem,
  leaveShop,
  leaveSmith,
  restart,
}: MainStageProps) {
  return (
    <Panel style={{ marginBottom: 16 }}>
      {mode === "explore" && (
        <>
          <p className="text-center text-sm text-muted-foreground">
            마을에 도착했다. 어디로 향할까?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-1 whitespace-normal p-3 text-left"
              onClick={enterShop}
            >
              <span className="text-sm font-medium">상점</span>
              <span className="text-xs font-normal text-muted-foreground">물약을 구매한다</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-1 whitespace-normal p-3 text-left"
              onClick={enterSmith}
            >
              <span className="text-sm font-medium">대장간</span>
              <span className="text-xs font-normal text-muted-foreground">장비를 강화한다</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-1 whitespace-normal p-3 text-left"
              onClick={rest}
              disabled={player.gold < innRestCost}
            >
              <span className="text-sm font-medium">여관</span>
              <span className="text-xs font-normal text-muted-foreground">
                {innRestCost}G로 체력·마나 완전 회복
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col items-start gap-1 whitespace-normal p-3 text-left"
              onClick={advance}
            >
              <span className="text-sm font-medium">모험 떠나기</span>
              <span className="text-xs font-normal text-muted-foreground">길 위에서 무슨 일이든 벌어진다</span>
            </Button>
          </div>
        </>
      )}

      {mode === "combat" && enemy && (
        <>
          <div className="space-y-2 text-center">
            <div className="text-sm font-semibold">
              {enemy.name}{enemy.isStrong ? " ★" : ""}
            </div>
            <StatBar variant="hp" value={enemy.hp} max={enemy.maxHp} className="mx-auto max-w-xs" />
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={playerAttack} disabled={turnBusy}>
              공격
            </Button>
            {CLASSES[player.cls].skills.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                onClick={() => playerSkill(s)}
                disabled={turnBusy || player.mp < s.mp}
                title={s.desc}
              >
                {s.name} (MP{s.mp})
              </Button>
            ))}
            <Button variant="outline" onClick={playerGuard} disabled={turnBusy}>
              방어
            </Button>
            <Button variant="outline" onClick={usePotionInCombat} disabled={turnBusy || player.potions <= 0}>
              물약 ({player.potions})
            </Button>
            <Button variant="ghost" onClick={flee} disabled={turnBusy}>
              도망
            </Button>
          </div>
        </>
      )}

      {mode === "shop" && (
        <ShopList
          title="떠돌이 상인의 좌판"
          items={shopItems}
          gold={player.gold}
          onBuy={buyItem}
          onLeave={leaveShop}
        />
      )}

      {mode === "smith" && (
        <ShopList
          title="대장간"
          items={smithItems}
          gold={player.gold}
          onBuy={buyItem}
          onLeave={leaveSmith}
        />
      )}

      {mode === "gameover" && (
        <div className="space-y-3 py-4 text-center">
          <h2 className="text-lg font-semibold">여정의 끝</h2>
          <p className="text-sm text-muted-foreground">
            {player.name}의 이야기는 여기서 막을 내린다. Lv.{player.level}까지 도달했다.
          </p>
          <Button onClick={restart}>다시 시작하다</Button>
        </div>
      )}
    </Panel>
  );
}
