import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AerialSignal from '../assets/icons/game-icons.net/lorc/aerial-signal.svg';

describe('SVGR', () => {
  it('SVG를 React 컴포넌트로 import한다', () => {
    const html = renderToStaticMarkup(<AerialSignal />);
    expect(html).toMatch(/^<svg/);
    expect(html).toContain('viewBox="0 0 512 512"');
  });

  it('하드코딩 fill이 currentColor로 치환되어 CSS color로 색이 바뀐다', () => {
    const html = renderToStaticMarkup(
      <AerialSignal style={{ color: 'tomato' }} width={24} height={24} />,
    );
    expect(html).toContain('fill="currentColor"');
    expect(html).not.toContain('#000');
    expect(html).toContain('color:tomato');
    expect(html).toContain('width="24"');
  });
});
