import { useMachine } from "@xstate/react";
import { useEffect, useRef } from "react";
import { INN_REST_COST, SHOP_ITEMS, SMITH_ITEMS } from "./data";
import { chronicleMachine } from "./chronicleMachine";
import type { ClassKey, Mode, Skill, ShopItem, View } from "./types";

export function useChronicleGame() {
  const [state, send] = useMachine(chronicleMachine);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [state.context.log]);

  const view: View = state.matches("create") ? "create" : "game";
  const mode: Mode = state.matches({ game: "combat" })
    ? "combat"
    : state.matches({ game: "shop" })
      ? "shop"
      : state.matches({ game: "smith" })
        ? "smith"
        : state.matches({ game: "gameover" })
          ? "gameover"
          : "explore";
  const turnBusy = state.matches({ game: { combat: "resolving" } });

  return {
    view,
    mode,
    player: state.context.player,
    enemy: state.context.enemy,
    nameInput: state.context.nameInput,
    setNameInput: (name: string) => send({ type: "SET_NAME", name }),
    selectedClass: state.context.selectedClass,
    setSelectedClass: (cls: ClassKey) => send({ type: "SELECT_CLASS", cls }),
    log: state.context.log,
    turnBusy,
    logRef,
    startGame: () => send({ type: "START_GAME" }),
    restart: () => send({ type: "RESTART" }),
    advance: () => send({ type: "ADVANCE" }),
    enterShop: () => send({ type: "ENTER_SHOP" }),
    enterSmith: () => send({ type: "ENTER_SMITH" }),
    rest: () => send({ type: "REST" }),
    playerAttack: () => send({ type: "ATTACK" }),
    playerSkill: (skill: Skill) => send({ type: "SKILL", skill }),
    playerGuard: () => send({ type: "GUARD" }),
    usePotionInCombat: () => send({ type: "POTION" }),
    flee: () => send({ type: "FLEE" }),
    buyItem: (item: ShopItem) => send({ type: "BUY", item }),
    leaveShop: () => send({ type: "LEAVE_SHOP" }),
    leaveSmith: () => send({ type: "LEAVE_SMITH" }),
    shopItems: SHOP_ITEMS,
    smithItems: SMITH_ITEMS,
    innRestCost: INN_REST_COST,
  };
}
