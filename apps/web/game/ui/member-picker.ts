import { CLASSES } from "../defs";
import { C, H, W, button, openOverlay, panel, txt } from "../core";
import { G, Member } from "../state";

export interface MemberPickerOptions {
  filter?: (member: Member) => boolean;
  note?: (member: Member) => string;
}

/** 파티원 한 명을 선택하는 공용 오버레이. */
export function pickMember(
  title: string,
  onPick: (member: Member) => void,
  opts: MemberPickerOptions = {},
): void {
  const ov = openOverlay(); const root = ov.root;
  const ph = 96 + G.party.length * 56;
  const p = panel(520, ph); p.x = (W - 520) / 2; p.y = (H - ph) / 2; root.addChild(p);
  const tt = txt(title, 20, C.border, { serif: true }); tt.x = p.x + 22; tt.y = p.y + 14; root.addChild(tt);
  G.party.forEach((m, i) => {
    const ok = !opts.filter || opts.filter(m);
    const label = `${m.name} — ${CLASSES[m.classId].name} Lv.${m.level}` + (opts.note ? `  ${opts.note(m)}` : "");
    const b = button(label, 380, 44, () => { close(); onPick(m); }, { size: 14 });
    if (!ok) b.setDisabled(true);
    b.x = p.x + 22; b.y = p.y + 52 + i * 56; root.addChild(b);
  });
  const cancel = button("취소", 84, 40, close, { size: 14 });
  cancel.x = p.x + 520 - 106; cancel.y = p.y + ph - 54; root.addChild(cancel);
  function close(): void { ov.close(); }
}
