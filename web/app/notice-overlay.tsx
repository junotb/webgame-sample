'use client';

/**
 * L4 통지 — 게임이 끼어드는 층 (UI 층위 사양 §6).
 *
 * 메나스가 상한에 닿았을 때 한 번. 이전에는 로그 한 줄(`⚠ 주목이 한계에 달했다`)로
 * 흘러가서 존재감이 없었고, "경고"라는 이름은 정작 사무소 장면이 달고 있었다.
 *
 * 붉은 색·경고 아이콘·느낌표를 쓰지 않는다. v3 §1의 톤 기준은 정체 놀람에 대한
 * 것이지만, 조직이 나에게 보내는 통지 역시 조직의 언어여야 한다.
 *
 * **동요만 서식이 다르다.** 동요는 조직이 인지하지 못하는 축이라 공문이 올 수 없다.
 * 발신처가 없는 종이 한 장으로 둔다 — 형식의 부재가 곧 정보다.
 */
import type { MenaceId } from '../core/schema';

interface NoticeCopy {
  from: string;
  kind: string;
  heading: string;
  body: string;
}

const NOTICES: Record<MenaceId, NoticeCopy> = {
  scrutiny: {
    from: '중앙 시설국 감사과',
    kind: '열람 통지',
    heading: '근무 기록 열람 개시',
    body:
      '귀하의 최근 근무 기록에 대하여 정기 외 열람이 개시되었음을 통지합니다. ' +
      '본 통지는 절차상의 고지이며, 귀하가 취해야 할 별도의 조치는 없습니다. ' +
      '평소와 같이 근무하십시오.',
  },
  fatigue: {
    from: '중앙 시설국 인사과',
    kind: '근무 적합성 확인',
    heading: '처리 지연 반복 확인',
    body:
      '최근 근무 기록에서 처리 지연이 반복 확인되었습니다. ' +
      '귀하의 건강은 조직의 자산입니다. 다음 정기 검진일까지 근무 강도를 ' +
      '자율적으로 조정하시기 바랍니다. 조정 결과는 별도로 보고하지 않아도 됩니다.',
  },
  unrest: {
    // 공문이 아니다 — 발신처 자리가 비어 있는 것이 이 통지의 내용이다
    from: '발신처 없음',
    kind: '사무소 게시판',
    heading: '',
    body:
      '누가 붙였는지 모르는 종이가 사무소 게시판에 있었다. ' +
      '구역 이름과 날짜, 그리고 아무도 확인해 주지 않는 문장 하나. ' +
      '오후에 다시 지나갔을 때는 사라져 있었다.',
  },
};

export function NoticeOverlay({ menace, onDismiss }: { menace: MenaceId; onDismiss: () => void }) {
  const copy = NOTICES[menace];
  return (
    <div className="notice-layer" role="dialog" aria-modal="true" aria-label="통지">
      <article className={`document notice-document${menace === 'unrest' ? ' is-unsigned' : ''}`}>
        <header className="document-header">
          <span>{copy.from}</span>
          <span>{copy.kind}</span>
        </header>
        {copy.heading ? <h2>{copy.heading}</h2> : null}
        <p className="document-copy">{copy.body}</p>
        <button className="primary-action" onClick={onDismiss}>
          확인
        </button>
      </article>
    </div>
  );
}
