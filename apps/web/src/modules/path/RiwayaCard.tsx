import {
  RIWAYAT,
  changeMark,
  examplesOf,
  type ChangeGroup,
  type RiwayaExample,
} from '@arda/tajweed';
import { TajweedText } from '@/components/TajweedText';
import { placeOf, riwayaAudioOf } from '@/content/riwayaAudio';
import {
  CARD_OF_GROUP,
  CHANGE_CARDS,
  HEARD_RIWAYAT,
  type CardId,
  type ChangeCard,
} from '@/content/units';
import { useI18n } from '@/i18n/I18nProvider';
import { PlayIcon } from '@/modules/mushaf/PlayerBar';
import { focusSegments } from '@/tajweed/segments';
import { useAyaPlayer, type AyaPlayer } from './useAyaPlayer';

/** Whether a card of unit 8 shows what another riwāya changes. */
export const isChangeCard = (id: CardId): id is ChangeCard =>
  (CHANGE_CARDS as readonly string[]).includes(id);

/** The group of changes a card of unit 8 shows. */
const groupOf = (card: ChangeCard): ChangeGroup =>
  (Object.keys(CARD_OF_GROUP) as ChangeGroup[]).find(
    (group) => CARD_OF_GROUP[group] === card
  )!;

/** The five riwāyāt of unit 8: each reader with his narrator, where it is read. */
export function RiwayatList() {
  const { m } = useI18n();
  return (
    <section className="stack" aria-label={m.riwayaCard.list}>
      <ul className="stack signs" style={{ gap: 12 }}>
        {RIWAYAT.map((riwaya) => (
          <li key={riwaya.id} className="paper stack" style={{ gap: 4 }}>
            <p className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <strong>{m.riwayat[riwaya.id].name}</strong>
              <span className="arabic" lang="ar" dir="rtl">
                {riwaya.arabic}
              </span>
            </p>
            <p className="muted">{m.riwayat[riwaya.id].where}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The examples of a card of unit 8, by change: the Ḥafṣ word with the place marked, who reads
 * it otherwise and how, and where the reciter has both, the āya in Ḥafṣ and in Warsh.
 */
export function ChangeExamples({ card }: { card: ChangeCard }) {
  const { m } = useI18n();
  const player = useAyaPlayer();
  const examples = examplesOf(groupOf(card));
  const changes = [...new Set(examples.map((e) => e.change))];
  return (
    <>
      {changes.map((change) => (
        <section
          key={change}
          className="stack"
          aria-label={m.riwayaCard.changes[change].name}
        >
          <h2 className="h-small">{m.riwayaCard.changes[change].name}</h2>
          <p className="muted">{m.riwayaCard.changes[change].what}</p>
          <ul className="stack signs" style={{ gap: 12 }}>
            {examples
              .filter((e) => e.change === change)
              .map((example) => (
                <li key={example.wordKey} className="paper stack" style={{ gap: 6 }}>
                  <Example example={example} player={player} />
                </li>
              ))}
          </ul>
        </section>
      ))}
      {player.failed && <p role="alert">{m.lab.listen.failed}</p>}
      <p className="muted example-source">{m.riwayaCard.source}</p>
    </>
  );
}

function Example({ example, player }: { example: RiwayaExample; player: AyaPlayer }) {
  const { m } = useI18n();
  const mark = changeMark(example);
  const { sura, aya } = placeOf(example);
  const by = example.by.map((id) => m.riwayat[id].short).join(', ');
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span className="muted">
          {m.riwayaCard.hafs} · {m.lab.listen.where(sura, aya)}
        </span>
        <TajweedText
          segments={focusSegments(example.text, {
            start: mark.start,
            carrierEnd: mark.end,
          })}
        />
      </div>
      <p className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span>{by}</span>
        {example.spoken && (
          <bdi className="arabic spoken" lang="ar" dir="rtl">
            {example.spoken}
          </bdi>
        )}
      </p>
      {example.audio && (
        <div className="row" style={{ gap: 8 }}>
          {HEARD_RIWAYAT.map((riwaya) => {
            const src = riwayaAudioOf(example, riwaya)!;
            return (
              <button
                key={riwaya}
                type="button"
                className="btn"
                data-playing={player.playing === src ? 'true' : undefined}
                aria-label={m.riwayaCard.play(m.riwayat[riwaya].short, sura, aya)}
                onClick={() => player.play(src)}
              >
                <PlayIcon pause={player.playing === src} /> {m.riwayat[riwaya].short}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
