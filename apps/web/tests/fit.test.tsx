import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetFitsForTests, hasFit, useLineFit, whenIdle } from '@/modules/mushaf/fit';

/** A page of printed lines; jsdom lays nothing out, so the test says how wide things are. */
function Page({ id, lines = 3 }: { id?: string; lines?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useLineFit(ref, lines, id);
  return (
    <div ref={ref} data-testid="page" data-layout="lines">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="mushaf-line">
          line {i}
        </div>
      ))}
    </div>
  );
}

describe('fitting a page of printed lines (technical spec §9)', () => {
  let measured = 0;
  let fontStatus: 'loaded' | 'loading' = 'loaded';
  let fontsReady: () => void = () => undefined;
  /** The widest line fills this share of the column before it is fitted. */
  let widest = 0.8;

  beforeEach(() => {
    forgetFitsForTests();
    measured = 0;
    fontStatus = 'loaded';
    widest = 0.8;
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    Range.prototype.getBoundingClientRect = function () {
      measured += 1;
      return { width: widest * 1000 } as DOMRect;
    };
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        get status() {
          return fontStatus;
        },
        ready: new Promise<void>((resolve) => (fontsReady = resolve)),
      },
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
    Reflect.deleteProperty(document, 'fonts');
  });

  const fitOf = (page: HTMLElement) => page.style.getPropertyValue('--fit');

  it('sizes the lines so the widest just fills the column, and leaves nothing behind', () => {
    const { getByTestId } = render(<Page id="pack@1:7" />);
    const page = getByTestId('page');
    // 0.97 of the column over a line that fills 0.8 of it.
    expect(fitOf(page)).toBe('1.212');
    expect(page.dataset.measuring).toBeUndefined();
    expect(measured).toBe(3);
    expect(hasFit('pack@1:7')).toBe(true);
  });

  it('keeps within its bounds for a very short or very long line', () => {
    widest = 0.2;
    expect(fitOf(render(<Page id="short" />).getByTestId('page'))).toBe('1.350');
    widest = 2;
    expect(fitOf(render(<Page id="long" />).getAllByTestId('page')[1]!)).toBe('0.750');
  });

  it('fits a page seen before from memory, without laying it out to measure', () => {
    render(<Page id="pack@1:7" />).unmount();
    measured = 0;
    widest = 0.5;
    const { getByTestId } = render(<Page id="pack@1:7" />);
    expect(fitOf(getByTestId('page'))).toBe('1.212');
    expect(measured).toBe(0);
  });

  it('measures a page without a name every time', () => {
    render(<Page />).unmount();
    measured = 0;
    render(<Page />);
    expect(measured).toBe(3);
  });

  it('does not keep a fit measured while the font was loading, and measures again when it is here', async () => {
    fontStatus = 'loading';
    widest = 0.9;
    const { getByTestId } = render(<Page id="pack@1:8" />);
    expect(fitOf(getByTestId('page'))).toBe('1.078');
    expect(hasFit('pack@1:8')).toBe(false);
    // The font arrives: its letters are narrower than the stand-in's.
    fontStatus = 'loaded';
    widest = 0.8;
    await act(async () => fontsReady());
    expect(fitOf(getByTestId('page'))).toBe('1.212');
    expect(hasFit('pack@1:8')).toBe(true);
  });

  it('leaves running text alone', () => {
    function Flow() {
      const ref = useRef<HTMLDivElement>(null);
      useLineFit(ref, 1, 'flow');
      return <div ref={ref} data-testid="flow" data-layout="flow" />;
    }
    expect(fitOf(render(<Flow />).getByTestId('flow'))).toBe('');
    expect(hasFit('flow')).toBe(false);
  });

  it('does work when the browser is idle, and can call it off', () => {
    vi.useFakeTimers();
    const work = vi.fn();
    whenIdle(work);
    whenIdle(work)();
    vi.advanceTimersByTime(2500);
    expect(work).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
