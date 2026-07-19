/* =====================================================================
 * scenes/town.ts — 마을 모드 (1인칭 그리드 탐험형, New Sorpigal풍)
 *  남문—중앙 분수 광장—북단 신전의 대로를 걸으며 건물·NPC와 상호작용.
 *  건물 문 정면 [Z] → 시설 / NPC 정면 [Z] → 주제 대화 / 남문 [Z] → 탐험.
 *  전직·기술 수련은 계열 건물로 분산:
 *   무기점(물리 기술·소드맨 트리) / 방어구점(방어 기술·스펠소드 트리)
 *   영혼 길드(영혼 마법·애콜라이트 트리) / 원소 길드(원소 마법·메이지 트리)
 *   현상금 길드(의뢰 게시판) / 신전(상태이상 정화) / 도구점·여관(기존 역할)
 * ===================================================================== */
import * as PIXI from "pixi.js";
import {
  GearDef, NPCS, NpcDef, QUESTS, SHOP_ITEMS,
} from "../defs";
import {
  C, H, SceneHandle, SceneScope, W, button, fullFlash, nav, overlayRoot, panel,
  sceneRoot, setModeBadge, toast, tween, txt, ui,
} from "../core";
import { G, partyLevel } from "../state";
import { acceptQuest, questList, questStatus, reportQuest } from "../core/quests";
import type { RelativeMove } from "../grid";
import { compileTown } from "../town/compile";
import { townContentUnlocked } from "../town/content";
import { openTownFacility, type TownFacilityHandlers } from "../town/facilities";
import { TownNavigation } from "../town/navigation";
import { createTownPresentation } from "../town/presentation";
import { advanceTownTime, enterTown, townTime } from "../town/world-state";
import type { TownFacilityDef, TownGateDef, TownSpawn } from "../town/types";
import { CARRIAGE_FARE, TOWNS, otherTown } from "../towns";
import { portraitTexture } from "../portraits";
import { buildPartyHUD } from "../hud";
import { openShopMenu, type ShopKind } from "../ui/shop-menu";
import { openTrainingHall } from "../ui/training-hall";

export function townScene(spawn: TownSpawn = "gate"): SceneHandle {
  const scope = new SceneScope();
  const T = TOWNS[G.town];
  enterTown(G, G.town);
  setModeBadge(T.badge, C.border);
  const root = new PIXI.Container(); sceneRoot.addChild(root);
  const npcs = NPCS.filter((n) => (n.town ?? "crossvale") === G.town);
  const spatial = compileTown(T, npcs);
  const start = T.starts[spawn] ?? T.starts.carriage ?? T.starts.gate
    ?? T.starts.fountain ?? T.starts.throne!;
  const movement = new TownNavigation(T.map, spatial, start);
  const presentation = createTownPresentation(root, T, npcs, spatial, townTime(G));
  const contentContext = () => ({
    questCompleted: (id: string) => questStatus(id) === "rewarded",
    flagEnabled: (id: "intro" | "ending" | "letter") => G.flags[id],
    partyLevel: partyLevel(),
  });

  const refreshNpcMarks = presentation.refreshNpcMarks;

  /* ---- 로그 / 프롬프트 / 힌트 ---- */
  const logP = panel(620, 46, { alpha: 0.82 }); logP.x = (W - 620) / 2; logP.y = 12; root.addChild(logP);
  const logT = txt("", 15, C.text); logT.x = logP.x + 16; logT.y = 25; root.addChild(logT);
  const log = (s: string) => { logT.text = s; };
  log(
    spawn === "fountain" ? `${T.name}의 광장 — 분수 곁에 장로 카엘이 서 있다.`
      : spawn === "carriage" ? `역마차에서 내려 ${T.name}에 도착했다.`
        : spawn === "throne" ? "연방 군주에게 인사를 마치고 물러났다."
          : `남문을 지나 ${T.name}(으)로 돌아왔다.`);

  const prompt = txt("", 16, C.text, { weight: "700", shadow: true });
  prompt.anchor.set(0.5, 1); prompt.x = W / 2; prompt.y = H - 168; root.addChild(prompt);
  const hint = txt("W/S 전진·후진   A/D 옆걸음   Q/E·←→ 회전   Z/스페이스 조사", 13, C.dim);
  hint.x = 16; hint.y = H - 28; root.addChild(hint);

  const hud = buildPartyHUD(root);

  /* =====================================================================
   * 이동
   * ===================================================================== */
  let overlayOpen = false;
  const busy = (): boolean => overlayOpen || ui.menuOpen;

  function tryMove(rel: RelativeMove): void {
    if (busy()) return;
    if (!movement.move(rel)) { bump(); return; }
    stepBob();
    refresh();
  }
  function rotate(dir: -1 | 1): void {
    if (busy()) return;
    movement.rotate(dir);
    refresh();
  }
  function bump(): void {
    tween(presentation.viewRoot, { x: 6 }, 45, {
      onDone: () => tween(presentation.viewRoot, { x: -5 }, 45, {
        onDone: () => tween(presentation.viewRoot, { x: 0 }, 60),
      }),
    });
  }
  function stepBob(): void {
    presentation.viewRoot.y = 7;
    tween(presentation.viewRoot, { y: 0 }, 130);
  }

  /* =====================================================================
   * 상호작용 — 자기 칸(성문·문) 우선, 다음 정면 칸
   * ===================================================================== */
  const enterGate = (gate: TownGateDef): void => {
    fullFlash(0x000000, 500, () => nav.field(gate.target));
  };
  function interact(): void {
    if (busy()) return;
    const target = movement.interaction();
    if (target.kind === "gate") enterGate(target.value);
    else if (target.kind === "facility") {
      presentation.visitFacility(target.value.id);
      presentation.render(movement.pose);
      openFacility(target.value);
    }
    else if (target.kind === "npc") openNpc(target.value);
    else if (target.kind === "deco") log(target.value.text);
    else log("아무것도 없다.");
  }

  /* ---- 화면 갱신 ---- */
  function refresh(): void {
    presentation.render(movement.pose);
    const target = movement.interaction();
    if (target.kind === "gate") prompt.text = target.value.prompt;
    else if (target.kind === "facility") prompt.text = `[Z] ${target.value.name}에 들어간다`;
    else if (target.kind === "npc") prompt.text = `[Z] ${target.value.name}와(과) 대화`;
    else if (target.kind === "deco") prompt.text = `[Z] ${target.value.name}을(를) 들여다본다`;
    else prompt.text = "";
  }

  /* =====================================================================
   * 시설 라우팅
   * ===================================================================== */
  const facilityHandlers: TownFacilityHandlers = {
    item: (facility) => openShop(facility.title ?? facility.name, SHOP_ITEMS, "item"),
    inn,
    temple: openTemple,
    bountyGuild: () => openBountyGuild(),
    stable: () => openStable(),
    throne: () => openThrone(),
    spiritGuild: openHall,
    elementsGuild: openHall,
    weapon: openHall,
    armor: openHall,
  };
  function openFacility(f: TownFacilityDef): void {
    if (busy()) return;
    openTownFacility(f, facilityHandlers);
  }

  /* ---------- 마굿간: 역마차 빠른이동 ---------- */
  function openStable(): void {
    overlayOpen = true;
    const dest = otherTown(G.town);
    const destName = TOWNS[dest].name;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const p = panel(620, 300); p.x = (W - 620) / 2; p.y = (H - 300) / 2; rootS.addChild(p);
    const tt = txt("마굿간 — 역마차", 24, C.border, { serif: true });
    tt.x = p.x + 26; tt.y = p.y + 18; rootS.addChild(tt);
    const ds = txt(
      `${T.facilities.find((facility) => facility.id === "stable")?.description ?? "역마차가 출발을 기다린다."}\n${destName}(으)로 가는 삯은 ${CARRIAGE_FARE} G다.`,
      15, C.text, { lh: 24 });
    ds.x = p.x + 26; ds.y = p.y + 64; rootS.addChild(ds);
    function close(): void { overlayOpen = false; rootS.destroy({ children: true }); }
    const go = button(`${destName}(으)로 출발 — ${CARRIAGE_FARE} G`, 340, 50, () => {
      if (G.gold < CARRIAGE_FARE) return toast(`역마차 삯 ${CARRIAGE_FARE} G가 부족하다.`, C.dim);
      G.gold -= CARRIAGE_FARE;
      G.town = dest;
      close();
      fullFlash(0x000000, 800, () => nav.town("carriage"));
    }, { size: 16, border: C.border });
    go.x = p.x + 26; go.y = p.y + 150; rootS.addChild(go);
    const closeBtn = button("나가기", 110, 40, close, { size: 15 });
    closeBtn.x = p.x + 620 - 136; closeBtn.y = p.y + 300 - 56; rootS.addChild(closeBtn);
  }

  /* ---------- 알현실: 연방 군주에게 편지 전달 ---------- */
  function openThrone(): void {
    if (!G.flags.letter) { fullFlash(0x000000, 600, () => nav.letter()); return; }
    overlayOpen = true;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const p = panel(620, 240); p.x = (W - 620) / 2; p.y = (H - 240) / 2; rootS.addChild(p);
    const tt = txt("알현실 — 연방 군주", 24, C.border, { serif: true });
    tt.x = p.x + 26; tt.y = p.y + 18; rootS.addChild(tt);
    const ds = txt(
      "\"헤르만의 제자들이여, 그의 뜻은 잘 새겼네.\n크로스베일의 앞날은 그대들 손에 달렸으니 — 부디 몸조심하게.\"",
      15, C.text, { lh: 24 });
    ds.x = p.x + 26; ds.y = p.y + 64; rootS.addChild(ds);
    const closeBtn = button("물러난다", 130, 44, () => {
      overlayOpen = false; rootS.destroy({ children: true });
    }, { size: 15 });
    closeBtn.x = p.x + 620 - 156; closeBtn.y = p.y + 240 - 60; rootS.addChild(closeBtn);
  }

  /* ---------- 상점 (도구점 직행 / 무기·방어구점 하위 메뉴) ---------- */
  function openShop(shopTitle: string, goods: GearDef[], kind: ShopKind, onClose?: () => void): void {
    overlayOpen = true;
    openShopMenu({
      title: shopTitle, goods, kind, onChange: hud.redraw,
      onClose: () => { overlayOpen = false; onClose?.(); },
    });
  }
  /* ---------- 여관: 숙박·소문·시설 의뢰 ---------- */
  function inn(f: TownFacilityDef): void {
    overlayOpen = true;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const PW = 720, PH = 430;
    const p = panel(PW, PH); p.x = (W - PW) / 2; p.y = (H - PH) / 2; rootS.addChild(p);
    const title = txt(f.name, 24, C.border, { serif: true }); title.x = p.x + 28; title.y = p.y + 20; rootS.addChild(title);
    const intro = txt(f.description ?? "여행객들이 잠시 쉬어가는 곳이다.", 14, C.dim);
    intro.x = p.x + 28; intro.y = p.y + 58; rootS.addChild(intro);
    const speech = txt("따뜻한 불빛 아래, 잠시 발걸음을 멈출 수 있다.", 15, C.text, { wrap: 650, lh: 24 });
    speech.x = p.x + 28; speech.y = p.y + 94; rootS.addChild(speech);
    const say = (text: string) => { speech.text = text; };
    const opts = new PIXI.Container(); rootS.addChild(opts);
    const clearOpts = () => opts.removeChildren().forEach((child) => child.destroy({ children: true }));
    const option = (label: string, i: number, fn: () => void, gold = false) => {
      const b = button(label, 360, 38, fn, { size: 14, border: gold ? C.border : 0x555068 });
      b.x = p.x + 28; b.y = p.y + 160 + i * 44; opts.addChild(b);
    };

    function menu(): void {
      clearOpts();
      let i = 0;
      for (const qid of f.quests ?? []) {
        const q = QUESTS.find((entry) => entry.id === qid);
        if (!q) continue;
        const status = questStatus(qid);
        if (status === "available") {
          option(`[의뢰] ${q.name}`, i++, () => {
            if (!acceptQuest(qid)) return;
            say(`${q.desc}\n\n— 의뢰 [${q.name}] 수주! (${q.objectives.map((o) => `${o.desc} 0/${o.count}`).join(" · ")})`);
            toast(`의뢰 수주: ${q.name}`, C.border);
            menu();
          }, true);
        } else if (status === "done") {
          option(`[보고] ${q.name}`, i++, () => {
            const reward = reportQuest(qid);
            if (!reward) return;
            const parts = [
              reward.gold ? `${reward.gold} G` : "", reward.exp ? `경험치 ${reward.exp}` : "", ...reward.items,
            ].filter(Boolean).join(" · ");
            say(`옛길에는 다시 조용함이 찾아들었다. [${q.name}]의 완수를 확인했다.\n\n보상: ${parts}`);
            toast(`의뢰 완수! 보상: ${parts}`, C.border);
            if (reward.ups.length) toast(`레벨 업! ${reward.ups.join(" · ")} (HP/MP 전부 회복)`, C.border);
            hud.redraw(); menu();
          }, true);
        } else if (status === "active") {
          const progress = G.quests[qid];
          option(`[진행 중] ${q.name}`, i++, () => {
            say(`여관 장부에는 아직 이 의뢰가 남아 있다. (${q.objectives.map((o) => `${o.desc} ${Math.min(progress.counts[o.id] ?? 0, o.count)}/${o.count}`).join(" · ")})`);
          });
        }
      }
      option("숙박 — 30 G (전원 HP/MP 회복)", i++, () => {
        if (G.gold < 30) return toast("숙박비 30 G가 부족하다.", C.dim);
        G.gold -= 30;
        G.party.forEach((m) => { m.hp = m.maxHp; m.mp = m.maxMp; });
        advanceTownTime(G, 8 * 60);
        presentation.setTime(townTime(G));
        presentation.render(movement.pose);
        hud.redraw();
        say("푹신한 침대와 잔잔한 난롯불 아래에서 파티가 푹 쉬었다.\n\n전원 HP/MP가 회복되었다.");
        fullFlash(0x000000, 900, () => toast("파티가 푹 쉬었다. 전원 HP/MP 회복!", C.text));
      }, true);
      for (const topic of (f.topics ?? []).filter((entry) => townContentUnlocked(entry.requires, contentContext()))) {
        option(topic.label, i++, () => say(topic.text));
      }
      option("나가기", i, close);
    }

    function close(): void { overlayOpen = false; rootS.destroy({ children: true }); }
    menu();
  }

  /* ---------- 신전: 상태이상 정화 ---------- */
  function openTemple(f: TownFacilityDef): void {
    overlayOpen = true;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const p = panel(640, 320); p.x = (W - 640) / 2; p.y = (H - 320) / 2; rootS.addChild(p);
    const tt = txt(f.title ?? f.name, 24, C.border, { serif: true });
    tt.x = p.x + 26; tt.y = p.y + 18; rootS.addChild(tt);
    const ds = txt(
      `${f.description ?? "사제가 파티를 맞는다."}\n독·저주 같은 상태이상을 정화해 준다.`,
      15, C.text, { lh: 24 });
    ds.x = p.x + 26; ds.y = p.y + 64; rootS.addChild(ds);
    const cure = button("정화 의식 — 상태이상 회복 (무료)", 340, 48, () => {
      /* 지속형 상태이상은 아직 없다(전투 상태는 전투 종료 시 소멸).
       * 독·저주 등 필드 지속 상태 추가 시 이곳에서 정화한다. */
      toast("사제가 파티를 살폈다 — 정화할 상태이상이 없다.", C.dim);
    }, { size: 15, border: C.border });
    cure.x = p.x + 26; cure.y = p.y + 140; rootS.addChild(cure);
    const closeBtn = button("나가기", 110, 40, () => {
      overlayOpen = false; rootS.destroy({ children: true });
    }, { size: 15 });
    closeBtn.x = p.x + 640 - 136; closeBtn.y = p.y + 320 - 56; rootS.addChild(closeBtn);
  }

  /* ---------- 현상금 길드: 의뢰 게시판 ---------- */
  function openBountyGuild(): void {
    overlayOpen = true;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const p = panel(860, 560); p.x = (W - 860) / 2; p.y = (H - 560) / 2; rootS.addChild(p);
    const content = new PIXI.Container(); rootS.addChild(content);
    const closeBtn = button("나가기", 110, 40, close, { size: 15 });
    closeBtn.x = p.x + 860 - 136; closeBtn.y = p.y + 560 - 56; rootS.addChild(closeBtn);

    function board(): void {
      content.removeChildren().forEach((c) => c.destroy({ children: true }));
      const tt = txt("현상금 길드 — 의뢰 게시판", 24, C.border, { serif: true });
      tt.x = p.x + 28; tt.y = p.y + 18; content.addChild(tt);
      const list = questList();
      list.forEach((e, i) => {
        const y = p.y + 62 + i * 54;
        const q = e.def;
        const marker = q.kind === "main" ? "★" : q.kind === "side" ? "◆" : "↻";
        const locked = e.status === "locked";
        const nameLine = locked
          ? `${marker} ???`
          : `${marker} ${q.name}` + (q.kind === "repeat" && (e.progress?.times ?? 0) > 0 ? `  ×${e.progress!.times}` : "");
        const nt = txt(nameLine, 15, locked ? C.dim : e.status === "done" ? C.border : C.text, { weight: "700" });
        nt.x = p.x + 28; nt.y = y; content.addChild(nt);

        let subLine: string;
        if (locked) {
          const r = q.requires;
          subLine = r?.level ? `수주 조건: 파티 Lv${r.level}` : "수주 조건: 선행 의뢰 완료";
        } else if (e.status === "available") {
          subLine = q.desc;
        } else if (e.status === "rewarded") {
          subLine = "완수한 의뢰.";
        } else {
          const pr = e.progress!;
          subLine = q.objectives
            .map((o) => `${o.desc} ${Math.min(pr.counts[o.id] ?? 0, o.count)}/${o.count}`)
            .join(" · ");
          if (e.status === "done") subLine += "  — 보고 가능!";
        }
        const dt = txt(subLine, 12, C.dim, { wrap: 620 });
        dt.x = p.x + 46; dt.y = y + 24; content.addChild(dt);

        /* NPC 또는 특정 시설에서 받는 의뢰는 게시판에서 위치만 안내한다. */
        const facilityName = Object.values(TOWNS)
          .flatMap((town) => town.facilities)
          .find((facility) => facility.quests?.includes(q.id))?.name;
        const giverName = q.giver ? (NPCS.find((n) => n.id === q.giver)?.name ?? q.giver) : facilityName;
        if (e.status === "available" && q.kind !== "main") {
          if (giverName) {
            const gt = txt(`수주처: ${giverName}`, 13, C.dim);
            gt.x = p.x + 860 - 230; gt.y = y + 10; content.addChild(gt);
          } else {
            const b = button("수주", 100, 38, () => {
              if (acceptQuest(q.id)) { toast(`의뢰 수주: ${q.name}`, C.border); refreshNpcMarks(); board(); }
            }, { size: 14 });
            b.x = p.x + 860 - 156; b.y = y; content.addChild(b);
          }
        }
        if (e.status === "done") {
          if (giverName) {
            const gt = txt(`보고처: ${giverName}`, 13, C.border);
            gt.x = p.x + 860 - 230; gt.y = y + 10; content.addChild(gt);
          } else {
            const b = button("보고", 100, 38, () => {
              const r = reportQuest(q.id);
              if (!r) return;
              const parts = [
                r.gold ? `${r.gold} G` : "",
                r.exp ? `경험치 ${r.exp}` : "",
                ...r.items,
              ].filter(Boolean).join(" · ");
              toast(`의뢰 완수! 보상: ${parts}`, C.border);
              if (r.ups.length) toast(`레벨 업! ${r.ups.join(" · ")} (HP/MP 전부 회복)`, C.border);
              hud.redraw(); refreshNpcMarks();
              board();
            }, { size: 14, border: C.border });
            b.x = p.x + 860 - 156; b.y = y; content.addChild(b);
          }
        }
      });
      const note = txt("★메인 ◆서브 ↻현상금(반복) — 현상금은 보고 후 다시 수주할 수 있다.", 13, C.dim);
      note.x = p.x + 28; note.y = p.y + 560 - 52; content.addChild(note);
    }
    board();
    function close(): void { overlayOpen = false; rootS.destroy({ children: true }); }
  }

  /* ---------- 수련관 (무기점·방어구점·영혼 길드·원소 길드) ----------
   *  장비 구매(상점 보유 시) / 기술 수련(trains) / 전직 상담(classes) */
  function openHall(f: TownFacilityDef): void {
    overlayOpen = true;
    openTrainingHall(f, {
      onChange: hud.redraw,
      onClose: () => { overlayOpen = false; },
    });
  }
  /* ---------- NPC 대화 (주제 선택식) ---------- */
  function openNpc(npc: NpcDef): void {
    overlayOpen = true;
    const rootS = new PIXI.Container(); rootS.zIndex = 60; overlayRoot.addChild(rootS);
    const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
    dim.eventMode = "static"; rootS.addChild(dim);
    const PW = 820, PH = 480;
    const p = panel(PW, PH); p.x = (W - PW) / 2; p.y = (H - PH) / 2; rootS.addChild(p);

    /* 좌: 초상화 + 이름 */
    const tex = portraitTexture(npc.portrait);
    if (tex) {
      const sp = new PIXI.Sprite(tex);
      sp.width = 150; sp.height = 150; sp.x = p.x + 40; sp.y = p.y + 46;
      rootS.addChild(sp);
      const fr = new PIXI.Graphics();
      fr.rect(sp.x - 3, sp.y - 3, 156, 156).stroke({ width: 3, color: C.border, alpha: 0.85 });
      rootS.addChild(fr);
    }
    const nm = txt(npc.name, 19, C.border, { serif: true, align: "center" });
    nm.anchor.set(0.5, 0); nm.x = p.x + 115; nm.y = p.y + 206; rootS.addChild(nm);
    const ds = txt(npc.desc, 12, C.dim, { wrap: 200, align: "center", lh: 17 });
    ds.anchor.set(0.5, 0); ds.x = p.x + 115; ds.y = p.y + 238; rootS.addChild(ds);

    /* 우상: 대사 */
    const speech = txt("", 15, C.text, { wrap: 500, lh: 24 });
    speech.x = p.x + 280; speech.y = p.y + 46; rootS.addChild(speech);
    const say = (s: string) => { speech.text = s; };
    say(npc.greeting);

    /* 우하: 선택지 (모드에 따라 재구성) */
    const opts = new PIXI.Container(); rootS.addChild(opts);
    const clearOpts = () => opts.removeChildren().forEach((c) => c.destroy({ children: true }));
    const mkOpt = (label: string, i: number, fn: () => void, gold = false) => {
      const b = button(label, 320, 38, fn, { size: 14, border: gold ? C.border : 0x555068 });
      b.x = p.x + 280; b.y = p.y + 220 + i * 44; opts.addChild(b);
    };

    function menuRoot(): void {
      clearOpts();
      let i = 0;
      for (const qid of npc.quests ?? []) {
        const q = QUESTS.find((x) => x.id === qid)!;
        const st = questStatus(qid);
        if (st === "available") {
          mkOpt(`[의뢰] ${q.name}`, i++, () => {
            if (!acceptQuest(qid)) return;
            say(`${q.desc}\n\n— 의뢰 [${q.name}] 수주! (${q.objectives.map((o) => `${o.desc} 0/${o.count}`).join(" · ")})`);
            toast(`의뢰 수주: ${q.name}`, C.border);
            refreshNpcMarks(); menuRoot();
          }, true);
        } else if (st === "done") {
          mkOpt(`[보고] ${q.name}`, i++, () => {
            const r = reportQuest(qid);
            if (!r) return;
            const parts = [
              r.gold ? `${r.gold} G` : "", r.exp ? `경험치 ${r.exp}` : "", ...r.items,
            ].filter(Boolean).join(" · ");
            say(`수고했네, [${q.name}] 완수를 확인했어.\n\n보상: ${parts}`);
            toast(`의뢰 완수! 보상: ${parts}`, C.border);
            if (r.ups.length) toast(`레벨 업! ${r.ups.join(" · ")} (HP/MP 전부 회복)`, C.border);
            hud.redraw(); refreshNpcMarks(); menuRoot();
          }, true);
        } else if (st === "active") {
          const pr = G.quests[qid];
          mkOpt(`[진행 중] ${q.name}`, i++, () => {
            say(`서두르지 않아도 되네. (${q.objectives.map((o) => `${o.desc} ${Math.min(pr.counts[o.id] ?? 0, o.count)}/${o.count}`).join(" · ")})`);
          });
        }
      }
      mkOpt("대화하기", i++, menuTopics);
      mkOpt("떠난다", i++, close);
    }

    function menuTopics(): void {
      clearOpts();
      const unlocked = npc.topics.filter((topic) => townContentUnlocked(topic.requires, contentContext()));
      unlocked.forEach((t, i) => mkOpt(t.label, i, () => say(t.text)));
      mkOpt("← 돌아가기", unlocked.length, menuRoot);
    }

    function close(): void {
      overlayOpen = false;
      rootS.destroy({ children: true });
    }
    menuRoot();
  }

  /* ---- 방향 패드 (마우스/터치) ---- */
  const mkPad = (label: string, x: number, y: number, fn: () => void) => {
    const b = new PIXI.Container();
    const g = new PIXI.Graphics();
    g.roundRect(-26, -26, 52, 52, 10).fill({ color: 0xffffff, alpha: 0.07 });
    g.roundRect(-26, -26, 52, 52, 10).stroke({ width: 2, color: C.border, alpha: 0.4 });
    const t = txt(label, 19, C.text, { weight: "700" }); t.anchor.set(0.5);
    b.addChild(g, t); b.x = x; b.y = y;
    b.eventMode = "static"; b.cursor = "pointer";
    b.on("pointertap", fn);
    root.addChild(b);
  };
  const PX0 = W - 200, PY0 = H - 150;
  mkPad("↺", PX0, PY0, () => rotate(-1));
  mkPad("▲", PX0 + 60, PY0, () => tryMove("fwd"));
  mkPad("↻", PX0 + 120, PY0, () => rotate(1));
  mkPad("◀", PX0, PY0 + 60, () => tryMove("sl"));
  mkPad("▼", PX0 + 60, PY0 + 60, () => tryMove("back"));
  mkPad("▶", PX0 + 120, PY0 + 60, () => tryMove("sr"));
  mkPad("✦", PX0 + 180, PY0 + 30, () => interact());

  /* ---- ticker: 횃불 플리커 ---- */
  const ticker = (t: PIXI.Ticker) => { presentation.tick(t.deltaMS); };
  scope.ticker(ticker);

  refresh();

  /* ---- 키 입력 (한글 자판 포함) ---- */
  const KEYMAP: Record<string, () => void> = {
    w: () => tryMove("fwd"), s: () => tryMove("back"),
    a: () => tryMove("sl"), d: () => tryMove("sr"),
    q: () => rotate(-1), e: () => rotate(1),
    z: () => interact(), " ": () => interact(),
    "ㅈ": () => tryMove("fwd"), "ㄴ": () => tryMove("back"),
    "ㅁ": () => tryMove("sl"), "ㅇ": () => tryMove("sr"),
    "ㅂ": () => rotate(-1), "ㄷ": () => rotate(1), "ㅋ": () => interact(),
    ArrowUp: () => tryMove("fwd"), ArrowDown: () => tryMove("back"),
    ArrowLeft: () => rotate(-1), ArrowRight: () => rotate(1),
  };

  return {
    onKey(k) { (KEYMAP[k.length === 1 ? k.toLowerCase() : k])?.(); },
    dispose() { scope.dispose(); },
  };
}
