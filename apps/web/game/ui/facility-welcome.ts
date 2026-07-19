import * as PIXI from "pixi.js";
import { C, H, W, button, overlayRoot, panel, txt } from "../core";
import { portraitTexture } from "../portraits";
import { pickKeeperGreeting } from "../town/content";
import type { TownFacilityDef } from "../town/types";

export function openFacilityWelcome(
  facility: TownFacilityDef,
  options: { onEnter: () => void; onClose: () => void },
): void {
  const root = new PIXI.Container(); root.zIndex = 60; overlayRoot.addChild(root);
  const dim = new PIXI.Graphics(); dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.68 });
  dim.eventMode = "static"; root.addChild(dim);
  const box = panel(760, 390); box.x = (W - 760) / 2; box.y = (H - 390) / 2; root.addChild(box);
  const title = txt(facility.title ?? facility.name, 25, C.border, { serif: true });
  title.x = box.x + 28; title.y = box.y + 20; root.addChild(title);

  const keeper = facility.keeper;
  const texture = portraitTexture(keeper.portrait);
  if (texture) {
    const portrait = new PIXI.Sprite(texture);
    portrait.width = 160; portrait.height = 160; portrait.x = box.x + 32; portrait.y = box.y + 76;
    root.addChild(portrait);
    const frame = new PIXI.Graphics();
    frame.rect(portrait.x - 3, portrait.y - 3, 166, 166).stroke({ width: 3, color: C.border, alpha: 0.85 });
    root.addChild(frame);
  }
  const name = txt(keeper.name, 20, C.border, { serif: true, weight: "700" });
  name.x = box.x + 32; name.y = box.y + 252; root.addChild(name);
  const role = txt(keeper.role, 13, C.dim); role.x = box.x + 32; role.y = box.y + 284; root.addChild(role);
  const speech = txt(`“${pickKeeperGreeting(keeper)}”`, 17, C.text, { wrap: 480, lh: 28 });
  speech.x = box.x + 230; speech.y = box.y + 92; root.addChild(speech);

  const enter = button("용무를 본다", 180, 46, () => {
    root.destroy({ children: true });
    options.onEnter();
  }, { size: 16, border: C.border });
  enter.x = box.x + 230; enter.y = box.y + 300; root.addChild(enter);
  const leave = button("나간다", 120, 46, () => {
    root.destroy({ children: true });
    options.onClose();
  }, { size: 16 });
  leave.x = box.x + 430; leave.y = box.y + 300; root.addChild(leave);
}
