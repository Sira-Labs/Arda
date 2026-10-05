import { useRef, useState, type TouchEvent } from 'react';

/** How far a finger must travel sideways to turn the page. */
const TURN_AT = 60;

/** Whether the reader has pinch-zoomed: then a finger moves the zoomed view, not the page. */
const zoomed = () => (window.visualViewport?.scale ?? 1) > 1.01;

interface Gesture {
  x: number;
  y: number;
  axis: 'x' | 'y' | null;
  /** A second finger touched (a pinch) or the view is zoomed: this is not a page turn. */
  cancelled: boolean;
}

const sideways = (dx: number, dy: number) => Math.abs(dx) > 1.5 * Math.abs(dy);

/**
 * Turning the page by swiping, as with a printed muṣḥaf: the page follows one finger moving
 * sideways and turns once it has moved far enough. Pinching (two fingers), scrolling (mostly
 * up or down) and moving a zoomed-in view never turn it (owner, 2026-10-05).
 *
 * @param turn called with 1 for a swipe to the right (the next page of a right-to-left book)
 *   and -1 for a swipe to the left.
 */
export function usePageSwipe(turn: (by: 1 | -1) => void) {
  const gesture = useRef<Gesture | null>(null);
  const [offset, setOffset] = useState(0);

  const cancel = () => {
    if (gesture.current) gesture.current.cancelled = true;
    setOffset(0);
  };

  const handlers = {
    onTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      if (event.touches.length !== 1 || !touch || zoomed()) return cancel();
      gesture.current = {
        x: touch.clientX,
        y: touch.clientY ?? 0,
        axis: null,
        cancelled: false,
      };
    },
    onTouchMove(event: TouchEvent) {
      const g = gesture.current;
      const touch = event.touches[0];
      if (!g || g.cancelled || !touch) return;
      if (event.touches.length !== 1 || zoomed()) return cancel();
      const dx = touch.clientX - g.x;
      const dy = (touch.clientY ?? 0) - g.y;
      // The first clear movement decides: sideways turns, up or down scrolls.
      if (!g.axis && Math.hypot(dx, dy) > 10) g.axis = sideways(dx, dy) ? 'x' : 'y';
      if (g.axis === 'x') setOffset(dx);
    },
    onTouchEnd(event: TouchEvent) {
      const g = gesture.current;
      // A finger lifted while another stays down ends a pinch, not a swipe.
      if (event.touches.length > 0) return cancel();
      gesture.current = null;
      setOffset(0);
      const touch = event.changedTouches[0];
      if (!g || g.cancelled || !touch) return;
      const dx = touch.clientX - g.x;
      const dy = (touch.clientY ?? 0) - g.y;
      const axis = g.axis ?? (sideways(dx, dy) ? 'x' : 'y');
      if (axis === 'x' && Math.abs(dx) >= TURN_AT) turn(dx > 0 ? 1 : -1);
    },
    onTouchCancel() {
      gesture.current = null;
      setOffset(0);
    },
  };

  return { offset, handlers };
}
