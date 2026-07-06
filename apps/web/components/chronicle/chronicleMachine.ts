import { assign, setup } from "xstate";
import { CLASSES, FLAVOR, INN_REST_COST } from "./data";
import type { ClassKey, Enemy, LogEntry, LogKind, Player, Skill, ShopItem } from "./types";
import { expNeed, makePlayer, pick, rand, spawnEnemy } from "./utils";

type PendingRollKind = "encounter" | "treasure" | "trap" | "trapFatal" | "rest" | null;

interface ChronicleContext {
  player: Player | null;
  enemy: Enemy | null;
  nameInput: string;
  selectedClass: ClassKey;
  log: LogEntry[];
  logSeq: number;
  pendingRollKind: PendingRollKind;
}

type ChronicleEvent =
  | { type: "SET_NAME"; name: string }
  | { type: "SELECT_CLASS"; cls: ClassKey }
  | { type: "START_GAME" }
  | { type: "RESTART" }
  | { type: "ADVANCE" }
  | { type: "ATTACK" }
  | { type: "SKILL"; skill: Skill }
  | { type: "GUARD" }
  | { type: "POTION" }
  | { type: "FLEE" }
  | { type: "ENTER_SHOP" }
  | { type: "ENTER_SMITH" }
  | { type: "REST" }
  | { type: "BUY"; item: ShopItem }
  | { type: "LEAVE_SHOP" }
  | { type: "LEAVE_SMITH" };

function pushLogs(
  base: { log: LogEntry[]; logSeq: number },
  entries: Array<{ text: string; kind?: LogKind }>
): { log: LogEntry[]; logSeq: number } {
  let { log, logSeq } = base;
  for (const entry of entries) {
    logSeq += 1;
    log = [...log, { id: logSeq, text: entry.text, kind: entry.kind ?? "sys" }].slice(-80);
  }
  return { log, logSeq };
}

const initialContext: ChronicleContext = {
  player: null,
  enemy: null,
  nameInput: "",
  selectedClass: "warrior",
  log: [],
  logSeq: 0,
  pendingRollKind: null,
};

export const chronicleMachine = setup({
  types: {} as {
    context: ChronicleContext;
    events: ChronicleEvent;
  },
  guards: {
    rollIsEncounter: ({ context }) => context.pendingRollKind === "encounter",
    rollIsTrapFatal: ({ context }) => context.pendingRollKind === "trapFatal",
    hasEnoughMp: ({ context, event }) =>
      event.type === "SKILL" && !!context.player && context.player.mp >= event.skill.mp,
    hasPotion: ({ context }) => !!context.player && context.player.potions > 0,
    fleeSucceeds: () => Math.random() < 0.7,
    enemyDefeated: ({ context }) => !!context.enemy && context.enemy.hp <= 0,
    playerDefeated: ({ context }) => !!context.player && context.player.hp <= 0,
  },
  actions: {
    startGame: assign(({ context }) => {
      const finalName = context.nameInput.trim() || "이름 없는 방랑자";
      const player = makePlayer(finalName, context.selectedClass);
      const { log, logSeq } = pushLogs(
        { log: [], logSeq: 0 },
        [{ text: `${finalName}, ${CLASSES[context.selectedClass].name}은(는) 잊혀진 대지에 첫발을 내디뎠다.` }]
      );
      return { player, enemy: null, log, logSeq };
    }),
    resetGame: assign(() => ({ ...initialContext })),

    rollExplore: assign(({ context }) => {
      const { player } = context;
      if (!player) return {};
      const roll = Math.random() * 100;

      if (roll < 53) {
        const newEnemy = spawnEnemy(player.level);
        const { log, logSeq } = pushLogs(context, [
          { text: pick(FLAVOR.encounter), kind: "danger" },
          {
            text: `${newEnemy.name}${newEnemy.isStrong ? " (강력한 개체)" : ""}이(가) 나타났다!`,
            kind: "combat",
          },
        ]);
        return {
          enemy: newEnemy,
          player: { ...player, guarding: false },
          log,
          logSeq,
          pendingRollKind: "encounter" as PendingRollKind,
        };
      }

      if (roll < 74) {
        const goldFound = rand(4, 12) + player.level * 2;
        const potionFound = Math.random() < 0.25;
        const entries: Array<{ text: string; kind?: LogKind }> = [
          { text: pick(FLAVOR.treasure) },
          { text: `골드 ${goldFound}을(를) 발견했다.`, kind: "loot" },
        ];
        if (potionFound) entries.push({ text: "치유의 물약도 함께 발견했다.", kind: "loot" });
        const { log, logSeq } = pushLogs(context, entries);
        return {
          player: {
            ...player,
            gold: player.gold + goldFound,
            potions: player.potions + (potionFound ? 1 : 0),
          },
          log,
          logSeq,
          pendingRollKind: "treasure" as PendingRollKind,
        };
      }

      if (roll < 89) {
        const dmg = rand(3, 8) + Math.floor(player.level * 0.8);
        const hp = Math.max(0, player.hp - dmg);
        const fatal = hp <= 0;
        const entries: Array<{ text: string; kind?: LogKind }> = [
          { text: pick(FLAVOR.trap), kind: "danger" },
          { text: `함정으로 ${dmg}의 피해를 입었다.`, kind: "danger" },
        ];
        if (fatal) entries.push({ text: `${player.name}은(는) 함정에 목숨을 잃었다...`, kind: "danger" });
        const { log, logSeq } = pushLogs(context, entries);
        return {
          player: { ...player, hp },
          log,
          logSeq,
          pendingRollKind: (fatal ? "trapFatal" : "trap") as PendingRollKind,
        };
      }

      const healAmt = Math.round(player.maxHp * 0.3);
      const { log, logSeq } = pushLogs(context, [
        { text: pick(FLAVOR.rest) },
        { text: `체력 ${healAmt}을(를) 회복했다.`, kind: "loot" },
      ]);
      return {
        player: { ...player, hp: Math.min(player.maxHp, player.hp + healAmt) },
        log,
        logSeq,
        pendingRollKind: "rest" as PendingRollKind,
      };
    }),

    playerAttack: assign(({ context }) => {
      const { player, enemy } = context;
      if (!player || !enemy) return {};
      const dmg = Math.max(1, Math.round(player.atk - enemy.def * 0.5 + rand(-2, 2)));
      const hp = Math.max(0, enemy.hp - dmg);
      const { log, logSeq } = pushLogs(context, [
        { text: `${player.name}의 공격! ${dmg}의 피해를 입혔다.`, kind: "combat" },
      ]);
      return { enemy: { ...enemy, hp }, log, logSeq };
    }),

    logInsufficientMana: assign(({ context }) => pushLogs(context, [{ text: "마나가 부족하다." }])),

    playerUseSkill: assign(({ context, event }) => {
      if (event.type !== "SKILL" || !context.player || !context.enemy) return {};
      const skill = event.skill;
      const player = { ...context.player, mp: context.player.mp - skill.mp };

      if (skill.type === "heal") {
        const healAmt = Math.round(skill.calc(player));
        const healedPlayer = { ...player, hp: Math.min(player.maxHp, player.hp + healAmt) };
        const { log, logSeq } = pushLogs(context, [
          { text: `${player.name}이(가) [${skill.name}]을(를) 사용했다. HP ${healAmt} 회복.`, kind: "loot" },
        ]);
        return { player: healedPlayer, log, logSeq };
      }

      const defFactor = skill.ignoreDef ? context.enemy.def * skill.ignoreDef : context.enemy.def;
      const dmg = Math.max(1, Math.round(skill.calc(player) - defFactor * 0.5 + rand(-2, 2)));
      const hp = Math.max(0, context.enemy.hp - dmg);
      const { log, logSeq } = pushLogs(context, [
        { text: `${player.name}이(가) [${skill.name}]을(를) 사용했다! ${dmg}의 피해.`, kind: "combat" },
      ]);
      return { player, enemy: { ...context.enemy, hp }, log, logSeq };
    }),

    playerGuardAction: assign(({ context }) => {
      if (!context.player) return {};
      const { log, logSeq } = pushLogs(context, [
        { text: `${context.player.name}이(가) 방어 태세를 취했다.` },
      ]);
      return { player: { ...context.player, guarding: true }, log, logSeq };
    }),

    usePotionAction: assign(({ context }) => {
      if (!context.player) return {};
      const healAmt = 30;
      const { log, logSeq } = pushLogs(context, [
        { text: `${context.player.name}이(가) 치유의 물약을 마셨다. HP ${healAmt} 회복.`, kind: "loot" },
      ]);
      return {
        player: {
          ...context.player,
          hp: Math.min(context.player.maxHp, context.player.hp + healAmt),
          potions: context.player.potions - 1,
        },
        log,
        logSeq,
      };
    }),

    logFleeSuccess: assign(({ context }) => {
      if (!context.player) return {};
      const { log, logSeq } = pushLogs(context, [
        { text: `${context.player.name}은(는) 성공적으로 도망쳤다.` },
      ]);
      return { enemy: null, log, logSeq };
    }),
    logFleeFail: assign(({ context }) =>
      pushLogs(context, [{ text: "도망에 실패했다!", kind: "danger" }])
    ),

    enemyTurn: assign(({ context }) => {
      if (!context.player || !context.enemy) return {};
      const rawDmg = Math.max(
        1,
        Math.round(context.enemy.atk - context.player.def * 0.55 + rand(-2, 2))
      );
      const dmg = context.player.guarding ? Math.max(1, Math.round(rawDmg * 0.5)) : rawDmg;
      const hp = Math.max(0, context.player.hp - dmg);
      const { log, logSeq } = pushLogs(context, [
        { text: `${context.enemy.name}의 반격! ${dmg}의 피해.`, kind: "combat" },
      ]);
      return { player: { ...context.player, hp, guarding: false }, log, logSeq };
    }),

    logPlayerDefeat: assign(({ context }) => {
      if (!context.player) return {};
      return pushLogs(context, [{ text: `${context.player.name}은(는) 쓰러졌다...`, kind: "danger" }]);
    }),

    resolveEnemyDefeat: assign(({ context }) => {
      if (!context.player || !context.enemy) return {};
      const enemy = context.enemy;
      let { log, logSeq } = pushLogs(context, [
        {
          text: `${enemy.name}을(를) 쓰러뜨렸다! 경험치 ${enemy.exp}, 골드 ${enemy.gold} 획득.`,
          kind: "loot",
        },
      ]);
      let updated: Player = {
        ...context.player,
        exp: context.player.exp + enemy.exp,
        gold: context.player.gold + enemy.gold,
      };
      while (updated.exp >= updated.expNeed) {
        const g = CLASSES[updated.cls].growth;
        const nextLevel = updated.level + 1;
        updated = {
          ...updated,
          exp: updated.exp - updated.expNeed,
          level: nextLevel,
          expNeed: expNeed(nextLevel),
          maxHp: updated.maxHp + g.hp,
          maxMp: updated.maxMp + g.mp,
          atk: updated.atk + g.atk,
          def: updated.def + g.def,
          mag: updated.mag + g.mag,
        };
        updated.hp = updated.maxHp;
        updated.mp = updated.maxMp;
        const r = pushLogs({ log, logSeq }, [
          { text: `레벨 업! ${updated.name}은(는) 이제 Lv.${updated.level}이 되었다.`, kind: "loot" },
        ]);
        log = r.log;
        logSeq = r.logSeq;
      }
      return { player: updated, enemy: null, log, logSeq };
    }),

    buyItemAction: assign(({ context, event }) => {
      if (event.type !== "BUY" || !context.player) return {};
      const item = event.item;
      if (context.player.gold < item.cost) {
        return pushLogs(context, [{ text: "골드가 부족하다." }]);
      }
      const updated = { ...context.player, gold: context.player.gold - item.cost };
      if (item.id === "potion") updated.potions += 1;
      if (item.id === "weapon") updated.atk += 3;
      if (item.id === "armor") updated.def += 3;
      const { log, logSeq } = pushLogs(context, [{ text: `[${item.name}]을(를) 구매했다.`, kind: "loot" }]);
      return { player: updated, log, logSeq };
    }),

    logLeaveShop: assign(({ context }) =>
      pushLogs(context, [{ text: "상인과 작별하고 다시 길을 나섰다." }])
    ),
    logLeaveSmith: assign(({ context }) =>
      pushLogs(context, [{ text: "대장장이와 작별하고 다시 길을 나섰다." }])
    ),

    restAction: assign(({ context }) => {
      if (!context.player) return {};
      if (context.player.gold < INN_REST_COST) {
        return pushLogs(context, [{ text: "골드가 부족하다." }]);
      }
      const { log, logSeq } = pushLogs(context, [
        {
          text: `여관에서 휴식을 취해 체력과 마나를 모두 회복했다. (-${INN_REST_COST}G)`,
          kind: "loot",
        },
      ]);
      return {
        player: {
          ...context.player,
          gold: context.player.gold - INN_REST_COST,
          hp: context.player.maxHp,
          mp: context.player.maxMp,
        },
        log,
        logSeq,
      };
    }),
  },
}).createMachine({
  id: "chronicle",
  context: initialContext,
  initial: "create",
  states: {
    create: {
      on: {
        SET_NAME: {
          actions: assign(({ event }) => (event.type === "SET_NAME" ? { nameInput: event.name } : {})),
        },
        SELECT_CLASS: {
          actions: assign(({ event }) =>
            event.type === "SELECT_CLASS" ? { selectedClass: event.cls } : {}
          ),
        },
        START_GAME: { target: "game.explore", actions: "startGame" },
      },
    },
    game: {
      initial: "explore",
      on: {
        RESTART: { target: "create", actions: "resetGame" },
      },
      states: {
        explore: {
          initial: "idle",
          states: {
            idle: {
              on: {
                ADVANCE: "rolling",
                ENTER_SHOP: "#chronicle.game.shop",
                ENTER_SMITH: "#chronicle.game.smith",
                REST: { actions: "restAction" },
              },
            },
            rolling: {
              entry: "rollExplore",
              always: [
                { guard: "rollIsEncounter", target: "#chronicle.game.combat" },
                { guard: "rollIsTrapFatal", target: "#chronicle.game.gameover" },
                { target: "idle" },
              ],
            },
          },
        },
        combat: {
          initial: "playerTurn",
          states: {
            playerTurn: {
              on: {
                ATTACK: { target: "resolving", actions: "playerAttack" },
                SKILL: [
                  { guard: "hasEnoughMp", target: "resolving", actions: "playerUseSkill" },
                  { actions: "logInsufficientMana" },
                ],
                GUARD: { target: "resolving", actions: "playerGuardAction" },
                POTION: [
                  { guard: "hasPotion", target: "resolving", actions: "usePotionAction" },
                ],
                FLEE: [
                  {
                    guard: "fleeSucceeds",
                    target: "#chronicle.game.explore",
                    actions: "logFleeSuccess",
                  },
                  { target: "resolving", actions: "logFleeFail" },
                ],
              },
            },
            resolving: {
              initial: "wait",
              states: {
                wait: {
                  after: {
                    350: [
                      {
                        guard: "enemyDefeated",
                        target: "#chronicle.game.explore",
                        actions: "resolveEnemyDefeat",
                      },
                      { target: "enemyAttack" },
                    ],
                  },
                },
                enemyAttack: {
                  entry: "enemyTurn",
                  always: [
                    {
                      guard: "playerDefeated",
                      target: "#chronicle.game.gameover",
                      actions: "logPlayerDefeat",
                    },
                    { target: "#chronicle.game.combat.playerTurn" },
                  ],
                },
              },
            },
          },
        },
        shop: {
          on: {
            BUY: { actions: "buyItemAction" },
            LEAVE_SHOP: { target: "explore", actions: "logLeaveShop" },
          },
        },
        smith: {
          on: {
            BUY: { actions: "buyItemAction" },
            LEAVE_SMITH: { target: "explore", actions: "logLeaveSmith" },
          },
        },
        gameover: {},
      },
    },
  },
});
