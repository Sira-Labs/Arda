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
 * The player's controls above the page (spec F4): play the page or go on, the reciter, the
 * speed (0.5×–1×) and repeating. The reciter and the speed are kept on the device.
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
          disabled={!player.playing && !player.paused && page.length === 0}
          onClick={() =>
            player.playing
              ? player.pause()
              : player.paused
                ? player.resume()
                : player.play(page)
          }
        >
          <PlayIcon pause={player.playing} />{' '}
          {player.playing ? t.pause : player.paused ? t.resume : t.playPage}
        </button>
        <button
          type="button"
          className="btn"
          aria-pressed={player.loop}
          onClick={() => player.setLoop(!player.loop)}
        >
          <span aria-hidden="true">↻</span> {t.loop}
        </button>
      </div>
      <div className="row player-row">
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
      {!player.reciter.timed && <p className="muted">{t.ayaByAya}</p>}
      {player.failed && <p role="alert">{t.failed}</p>}
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
