import { useLayoutEffect, type RefObject } from 'react';

/** How much of a line the longest printed line may fill (the rest is the justified slack). */
const FILL = 0.97;
const MIN = 0.75;
const MAX = 1.35;

/**
 * Sizes a page of printed lines so its longest line just fills the column, as the printed
 * page does, instead of leaving wide gaps between its words; every line keeps the same size.
 * Sets `--fit` on the page, read by the stylesheet. Runs again when the font has loaded.
 * Ratios are measured, not widths: the lines scale with the column, so a resize keeps them.
 */
export function useLineFit(ref: RefObject<HTMLElement | null>, key: unknown): void {
  useLayoutEffect(() => {
    const page = ref.current;
    if (!page || page.dataset.layout !== 'lines') return;
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
      if (widest > 0) {
        const fit = Math.min(MAX, Math.max(MIN, FILL / widest));
        page.style.setProperty('--fit', fit.toFixed(3));
      }
    };
    measure();
    void document.fonts?.ready.then(measure);
    return () => {
      live = false;
    };
  }, [ref, key]);
}
