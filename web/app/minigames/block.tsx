'use client';

/**
 * 블록 퍼즐 (자재 옮기기) — 조각을 끌어다 수레 판에 앉힌다.
 * 드래그가 기본: 잡은 칸이 고스트로 보이는 그 자리에 떨어진다.
 * 미리보기 탭 = 회전 (움직임 없는 pointerup으로 드래그와 구분).
 * 판 칸 탭은 폴백(키보드 접근 유지) — 탭한 칸이 조각의 좌상단 기준.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { MinigameProps } from '../minigame-shell';
import { useCountdown } from './countdown';
import { canPlace, generateBlockPuzzle, gradeBlock, place, rotatePiece } from './block-logic';
import type { BlockPiece } from './block-logic';

const TOTAL_MS = 30000;

/** 판 칸 40px + 간격 2px — 고스트·앵커 계산이 이 피치를 공유한다 */
const CELL = 40;
const PITCH = CELL + 2;
/** 미리보기 칸 18px + 간격 1px */
const PREVIEW_PITCH = 19;
/** 터치는 손가락이 조각을 가린다 — 고스트를 위로 띄우고, 떨어지는 자리도 같이 띄운다 */
const TOUCH_LIFT = 44;

/** 이 거리(px)를 넘게 움직여야 드래그 — 못 미치면 탭 = 회전 */
const DRAG_THRESHOLD = 6;

interface DragState {
  /** 조각에서 잡은 칸 (조각 상대 좌표) — 이 칸이 포인터 아래에 온다 */
  grab: [number, number];
  /** 잡은 칸의 중심이 올 위치, 판 좌상단 기준 px (터치 리프트 반영 후) */
  x: number;
  y: number;
  /** 임계 거리를 넘었는가 — 넘기 전엔 고스트를 그리지 않는다 (탭 후보) */
  moved: boolean;
}

/** 미리보기에서 잡은 지점을 조각의 실제 칸으로 붙인다 — 빈 칸을 잡아도 드래그가 된다 */
function nearestCell(piece: BlockPiece, r: number, c: number): [number, number] {
  let best = piece.cells[0];
  let bestDist = Infinity;
  for (const cell of piece.cells) {
    const dist = Math.abs(cell[0] - r) + Math.abs(cell[1] - c);
    if (dist < bestDist) {
      bestDist = dist;
      best = cell;
    }
  }
  return best;
}

export function BlockGame({ session, onFinish }: MinigameProps) {
  const puzzle = useMemo(() => generateBlockPuzzle(session.seed, session.difficulty), [session]);
  const [occupied, setOccupied] = useState<boolean[][]>(() =>
    Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill(false)),
  );
  const [pieceIndex, setPieceIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [placedCells, setPlacedCells] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const finishedRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  // 드래그 시작 시점에 고정 — 스크롤 없는 화면이라 드래그 중 판이 움직이지 않는다
  const boardRectRef = useRef<DOMRect | null>(null);
  // 드래그 시작점 (뷰포트 좌표) — 임계 거리 판정용
  const dragStartRef = useRef<[number, number]>([0, 0]);

  const totalCells = puzzle.size * puzzle.size;
  const piece = useMemo(() => {
    let p: BlockPiece | undefined = puzzle.pieces[pieceIndex];
    for (let i = 0; p && i < rotation; i += 1) p = rotatePiece(p);
    return p;
  }, [puzzle, pieceIndex, rotation]);

  const rotate = () => {
    if (finishedRef.current) return;
    setRotation((r) => (r + 1) % 4);
  };

  // 자리가 없는 조각은 내려놓는다 — 남긴 만큼 성적에서 빠진다
  const pass = () => {
    if (finishedRef.current) return;
    if (pieceIndex + 1 >= puzzle.pieces.length) finish(placedCells);
    else {
      setPieceIndex(pieceIndex + 1);
      setRotation(0);
    }
  };

  // 단축키: R 돌리기 · X 내려놓기. 물리 키(e.code)로 듣는다 — 한글 자판에서도 같은 자리
  const keysRef = useRef({ rotate, pass });
  keysRef.current = { rotate, pass };
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') keysRef.current.rotate();
      else if (e.code === 'KeyX') keysRef.current.pass();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // 드래그 중 앵커 = 잡은 칸이 덮는 판 칸에서 역산. 판 밖이면 canPlace가 거른다
  const dragAnchor: [number, number] | null = drag?.moved
    ? [Math.floor(drag.y / PITCH) - drag.grab[0], Math.floor(drag.x / PITCH) - drag.grab[1]]
    : null;
  const dragValid = dragAnchor !== null && piece !== undefined && canPlace(occupied, piece, dragAnchor);
  const dragCovers = (r: number, c: number): boolean =>
    dragAnchor !== null &&
    (piece?.cells.some(([dr, dc]) => dragAnchor[0] + dr === r && dragAnchor[1] + dc === c) ?? false);

  const finish = (cells: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish(gradeBlock(cells, totalCells));
  };

  const remaining = useCountdown(TOTAL_MS, () => finish(placedCells));

  const advance = (nextOccupied: boolean[][], nextPlaced: number) => {
    setOccupied(nextOccupied);
    setPlacedCells(nextPlaced);
    if (pieceIndex + 1 >= puzzle.pieces.length) {
      finish(nextPlaced);
    } else {
      setPieceIndex(pieceIndex + 1);
      setRotation(0);
    }
  };

  const dragPoint = (e: ReactPointerEvent): { x: number; y: number } | null => {
    const rect = boardRectRef.current;
    if (!rect) return null;
    const lift = e.pointerType === 'mouse' ? 0 : TOUCH_LIFT;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top - lift };
  };

  const onPiecePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!piece || !boardRef.current || finishedRef.current) return;
    boardRectRef.current = boardRef.current.getBoundingClientRect();
    const preview = e.currentTarget.getBoundingClientRect();
    const grab = nearestCell(
      piece,
      Math.floor((e.clientY - preview.top) / PREVIEW_PITCH),
      Math.floor((e.clientX - preview.left) / PREVIEW_PITCH),
    );
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = [e.clientX, e.clientY];
    const point = dragPoint(e);
    if (point) setDrag({ grab, ...point, moved: false });
  };

  const onPiecePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const point = dragPoint(e);
    if (!point) return;
    const [sx, sy] = dragStartRef.current;
    const moved = drag.moved || Math.hypot(e.clientX - sx, e.clientY - sy) > DRAG_THRESHOLD;
    setDrag({ grab: drag.grab, ...point, moved });
  };

  const onPiecePointerUp = () => {
    if (drag && !drag.moved) {
      rotate(); // 제자리 탭 = 회전
    } else if (drag && dragValid && dragAnchor && piece) {
      advance(place(occupied, piece, dragAnchor), placedCells + piece.cells.length);
    }
    setDrag(null);
  };

  return (
    <div className="minigame" data-minigame="block">
      <header className="minigame-head">
        <span>자재 옮기기 — 남은 조각 {puzzle.pieces.length - pieceIndex}</span>
        <span className="minigame-clock">{Math.ceil(remaining / 1000)}</span>
      </header>
      <div className="minigame-split" style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        <div style={{ position: 'relative' }}>
          <div
            ref={boardRef}
            className="minigame-board"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${puzzle.size}, ${CELL}px)`, gap: 2 }}
          >
            {Array.from({ length: totalCells }, (_, i) => {
              const r = Math.floor(i / puzzle.size);
              const c = i % puzzle.size;
              const ok = piece ? canPlace(occupied, piece, [r, c]) : false;
              const covered = dragCovers(r, c);
              const background = occupied[r][c]
                ? 'rgba(127,127,127,.55)'
                : covered
                  ? dragValid
                    ? 'rgba(127,127,127,.4)'
                    : 'rgba(122,49,38,.3)'
                  : 'rgba(127,127,127,.14)';
              return (
                <button
                  key={i}
                  aria-label={`적재 ${r + 1}행 ${c + 1}열`}
                  disabled={!ok}
                  style={{
                    width: CELL,
                    height: CELL,
                    background,
                    // 전역 button:disabled 흐림(0.48)을 무효화 — 유효/무효 칸이 평시에 구분되어
                    // 보이면 안 된다. 어디 놓이는지는 드래그 중 스냅 하이라이트만 말한다
                    opacity: 1,
                    // 평시 유효 앵커 표시는 두지 않는다 — 어디 놓이는지는 드래그 중 스냅 하이라이트가 말한다.
                    // 미지정으로 두어 키보드 포커스 링(탭 폴백)은 브라우저 기본대로 살린다
                    outline: covered && dragValid ? '1.5px solid currentColor' : undefined,
                  }}
                  onClick={() => {
                    if (!piece) return;
                    advance(place(occupied, piece, [r, c]), placedCells + piece.cells.length);
                  }}
                />
              );
            })}
          </div>
          {drag?.moved && piece && (
            // 끌리는 조각 — 잡은 칸의 중심이 포인터(리프트 반영) 아래에 온다
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: drag.x - (drag.grab[1] * PITCH + CELL / 2),
                top: drag.y - (drag.grab[0] * PITCH + CELL / 2),
                pointerEvents: 'none',
                opacity: 0.55,
              }}
            >
              {piece.cells.map(([dr, dc]) => (
                <span
                  key={`${dr}-${dc}`}
                  style={{
                    position: 'absolute',
                    left: dc * PITCH,
                    top: dr * PITCH,
                    width: CELL,
                    height: CELL,
                    background: 'currentColor',
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <div>
          <p style={{ margin: '0 0 4px' }}>이번 조각 — 끌어 앉히고, 탭해 돌린다</p>
          <div
            onPointerDown={onPiecePointerDown}
            onPointerMove={onPiecePointerMove}
            onPointerUp={onPiecePointerUp}
            onPointerCancel={() => setDrag(null)}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 18px)',
              gap: 1,
              touchAction: 'none',
              cursor: drag?.moved ? 'grabbing' : 'grab',
              userSelect: 'none',
              opacity: drag?.moved ? 0.35 : 1,
            }}
          >
            {Array.from({ length: 16 }, (_, i) => {
              const r = Math.floor(i / 4);
              const c = i % 4;
              const filled = piece?.cells.some(([pr, pc]) => pr === r && pc === c) ?? false;
              return (
                <span key={i} style={{ width: 18, height: 18, background: filled ? 'currentColor' : 'transparent' }} />
              );
            })}
          </div>
        </div>
      </div>
      {/* 조작 버튼 겸 안내 — 우하단. 단축키 표기는 키보드 있을 환경에서만 붙는다.
          아이콘은 카드 아이콘 관례(24 viewBox·선 1.4)를 따르되 어휘 밖의 조작 표기 —
          회전은 순찰 카드의 원형 화살과 겹치지 않게 "조각을 돌리는" 그림으로 그린다 */}
      <div className="minigame-controls">
        <button type="button" aria-label="이 조각을 돌린다" onClick={rotate}>
          <span className="control-label">
            돌리기<span className="minigame-kbd-inline"> R</span>
          </span>
          <svg
            aria-hidden="true"
            className="control-glyph"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.4"
            viewBox="0 0 24 24"
          >
            <rect x="8" y="11.5" width="8" height="8" />
            <path d="M6.5 8.5a7 7 0 0 1 11.4-.4" />
            <path d="M18.5 4.3v4h-4" />
          </svg>
        </button>
        <button type="button" aria-label="이 조각을 내려놓는다" onClick={pass}>
          <span className="control-label">
            내려놓기<span className="minigame-kbd-inline"> X</span>
          </span>
          <svg
            aria-hidden="true"
            className="control-glyph"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.4"
            viewBox="0 0 24 24"
          >
            {/* 돌리기와 같은 문법 — 같은 네모(조각), 화살표만 다르다: 내려앉는 화살 */}
            <rect x="8" y="11.5" width="8" height="8" />
            <path d="M12 3.5v6" />
            <path d="M9.2 7.1L12 9.9l2.8-2.8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
