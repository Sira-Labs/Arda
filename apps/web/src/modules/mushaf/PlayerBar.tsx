import { useI18n } from '@/i18n/I18nProvider';
import {
  RECITERS,
  SPEEDS,
  chooseReciter,
  chooseSpeed,
  useSpeed,
  type ReciterId,
} from './reciters';
import type { Player, PlayItem } from './usePlayer';

/**
 * The player's settings above the page (spec F4): listen to the whole page, the reciter and
 * the speed (0.5×–1×), both kept on the device. Playing is steered from the dock below.
 */
export function PlayerBar({
  player,
  page,
}: {
  player: Player;
  /** What "listen to the page" plays. */
  page: readonly PlayItem[];
}) {
  const { m } = useI18n();
  const speed = useSpeed();
  const t = m.mushaf.player;
  return (
    <section className="player stack" aria-label={t.label}>
      <div className="row player-row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={page.length === 0}
          onClick={() => player.play(page)}
        >
          <PlayIcon pause={false} /> {t.playPage}
        </button>
        <label className="row" style={{ gap: 8 }}>
          <span className="muted">{t.reciter}</span>
          <select
            className="input"
            value={player.reciter.id}
            onChange={(event) => chooseReciter(event.target.value as ReciterId)}
          >
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {t.reciters[r.id]}
              </option>
            ))}
          </select>
        </label>
        <div className="row segmented" role="group" aria-label={t.speed}>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className="btn"
              aria-pressed={s === speed}
              onClick={() => chooseSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
      {player.failed && <p role="alert">{t.failed}</p>}
    </section>
  );
}

/**
 * The player docked at the bottom while an āya plays or is paused, so its buttons stay in
 * reach however far the page is scrolled (owner, 2026-10-05): the āya, pause or go on,
 * repeat, stop.
 */
export function MiniPlayer({ player }: { player: Player }) {
  const { m } = useI18n();
  const t = m.mushaf.player;
  const current = player.current;
  if (!current) return null;
  return (
    <section className="dock card row mini-player" aria-label={t.nowPlaying}>
      <span className="mini-player-aya">{t.aya(current.sura, current.aya)}</span>
      {/* One row of round buttons, named for screen readers and on hover. */}
      <button
        type="button"
        className="btn btn-primary btn-icon"
        aria-label={player.playing ? t.pause : t.resume}
        title={player.playing ? t.pause : t.resume}
        onClick={() => (player.playing ? player.pause() : player.resume())}
      >
        <PlayIcon pause={player.playing} />
      </button>
      <button
        type="button"
        className="btn btn-icon"
        aria-label={t.loop}
        title={t.loop}
        aria-pressed={player.loop}
        onClick={player.toggleLoop}
      >
        <span aria-hidden="true">↻</span>
      </button>
      <button
        type="button"
        className="btn btn-icon"
        aria-label={t.stop}
        title={t.stop}
        onClick={player.stop}
      >
        <span aria-hidden="true">■</span>
      </button>
    </section>
  );
}

/** Play or pause, drawn: the UI font has no such glyphs. */
export function PlayIcon({ pause }: { pause: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      fill="currentColor"
    >
      {pause ? <path d="M3 2h3v10H3zM8 2h3v10H8z" /> : <path d="M3 1.5v11l9-5.5z" />}
    </svg>
  );
}
