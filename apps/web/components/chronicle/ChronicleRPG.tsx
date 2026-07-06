import { CharacterCreateView } from "./CharacterCreateView";
import { CharacterSheet } from "./CharacterSheet";
import { LogScroll } from "./LogScroll";
import { MainStage } from "./MainStage";
import { useChronicleGame } from "./useChronicleGame";

export default function ChronicleRPG() {
  const game = useChronicleGame();

  return (
    <div className="min-h-full bg-background px-4 py-10 text-foreground">
      <h1 className="text-center text-2xl font-semibold">잊혀진 대지의 연대기</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">Chronicle of the Forgotten Land</p>

      <div className="mx-auto mt-8 max-w-4xl">
        {game.view === "create" && (
          <CharacterCreateView
            nameInput={game.nameInput}
            setNameInput={game.setNameInput}
            selectedClass={game.selectedClass}
            setSelectedClass={game.setSelectedClass}
            startGame={game.startGame}
          />
        )}

        {game.view === "game" && game.player && (
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[300px_1fr]">
            <CharacterSheet player={game.player} onQuit={game.restart} />

            <div>
              <MainStage
                mode={game.mode}
                player={game.player}
                enemy={game.enemy}
                turnBusy={game.turnBusy}
                shopItems={game.shopItems}
                smithItems={game.smithItems}
                innRestCost={game.innRestCost}
                advance={game.advance}
                enterShop={game.enterShop}
                enterSmith={game.enterSmith}
                rest={game.rest}
                playerAttack={game.playerAttack}
                playerSkill={game.playerSkill}
                playerGuard={game.playerGuard}
                usePotionInCombat={game.usePotionInCombat}
                flee={game.flee}
                buyItem={game.buyItem}
                leaveShop={game.leaveShop}
                leaveSmith={game.leaveSmith}
                restart={game.restart}
              />
              <LogScroll log={game.log} logRef={game.logRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
