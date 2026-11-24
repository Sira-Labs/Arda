import { useLayoutEffect, useRef, type RefObject } from 'react';

/** How much of a line the longest printed line may fill (the rest is the justified slack). */
const FILL = 0.97;
const MIN = 0.75;
const MAX = 1.35;

/**
 * The fit of pages measured before, by what the page is (pack and page number). A fit is a
 * ratio of the font's own widths, so it holds for every column width; it is kept only when
 * it was measured with the font loaded.
 */
const fits = new Map<string, string>();

/** Whether a page's fit is known, so that it need not be measured ahead of a turn. */
export function hasFit(id: string): boolean {
  return fits.has(id);
}

/**
 * Runs `work` when the browser has nothing else to do (or shortly, where it cannot say);
 * returns how to call it off.
 */
export function whenIdle(work: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(work, { timeout: 2000 });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(work, 200);
  return () => window.clearTimeout(handle);
}

/** Forgets what was measured: the tests start each page afresh. */
export function forgetFitsForTests(): void {
  fits.clear();
}

/**
 * Sizes a page of printed lines so its longest line just fills the column, as the printed
 * page does, instead of leaving wide gaps between its words; every line keeps the same size.
 * Sets `--fit` on the page, read by the stylesheet.
 *
 * Measuring lays the page out twice (unjustified, then fitted), which is most of what a page
 * turn costs (technical spec §9). So a page is measured once: `id` names it, and a page seen
 * before is fitted from memory. It is measured again only if a font was still loading.
 * Ratios are measured, not widths: the lines scale with the column, so a resize keeps them.
 */
export function useLineFit(
  ref: RefObject<HTMLElement | null>,
  key: unknown,
  id?: string,
  /** Told once the fit is final: taken with the font loaded, or not to be had here. */
  onSettled?: () => void
): void {
  const settled = useRef(onSettled);
  useLayoutEffect(() => {
    settled.current = onSettled;
  });
  useLayoutEffect(() => {
    const page = ref.current;
    if (!page || page.dataset.layout !== 'lines') return;
    const known = id ? fits.get(id) : undefined;
    if (known) {
      page.style.setProperty('--fit', known);
      settled.current?.();
      return;
    }
    let live = true;
    const measure = () => {
      if (!live) return;
      page.style.removeProperty('--fit');
      // Unjustified for a moment, so a line's width is that of its words.
      page.dataset.measuring = 'true';
      let widest = 0;
      for (const line of page.querySelectorAll<HTMLElement>('.mushaf-line')) {
        const range = document.createRange();
        range.selectNodeContents(line);
        // jsdom has no layout: nothing to measure there.
        if (typeof range.getBoundingClientRect !== 'function' || !line.clientWidth)
          continue;
        widest = Math.max(widest, range.getBoundingClientRect().width / line.clientWidth);
      }
      delete page.dataset.measuring;
      // Nothing to measure (no layout, no lines): this is all there will be.
      if (widest === 0) return settled.current?.();
      const fit = Math.min(MAX, Math.max(MIN, FILL / widest)).toFixed(3);
      page.style.setProperty('--fit', fit);
      // Laying the page out may have asked for a font: then this was measured in a
      // stand-in, and the page is measured once more when the font is here.
      if (document.fonts?.status === 'loading') {
        void document.fonts.ready.then(measure);
        return;
      }
      if (id) fits.set(id, fit);
      settled.current?.();
    };
    measure();
    return () => {
      live = false;
    };
  }, [ref, key, id]);
}
