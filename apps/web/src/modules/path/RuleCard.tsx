import { RULES, type RuleId } from '@arda/tajweed';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LearningShell } from '@/components/LearningShell';
import { TajweedText } from '@/components/TajweedText';
import { CARD_AUDIO } from '@/content/cardAudio';
import {
  CARDS,
  UNIT_CARDS,
  cardArabicName,
  cardName,
  isCardOf,
  isCardUnit,
  unitOf,
  type CardId,
  type CardUnit,
  type ExampleGroup,
} from '@/content/units';
import { useI18n } from '@/i18n/I18nProvider';
import { useWordPlayer, type WordPlayer } from '@/modules/lab/useWordPlayer';
import { PlayIcon } from '@/modules/mushaf/PlayerBar';
import { Soon } from '@/modules/Soon';
import { useReview } from '@/review/ReviewProvider';
import { ruleName, type RuleFamily } from '@/tajweed/rules';
import { segmentsOf } from '@/tajweed/segments';

/** `/pfad/:unit/:rule`: a rule card of units 2–5, or "not found" for anything else. */
export function RuleCardPage() {
  const { unit, rule } = useParams();
  if (!isCardUnit(unit) || !isCardOf(Number(unit) as CardUnit, rule)) {
    return <Soon page="notFound" />;
  }
  return <RuleCard id={rule} />;
}

/**
 * A rule card (spec F2, screen 1): the rule's Arabic name and one line, the letters that call
 * for it, every example of the sheet coloured by the engine with its case, the steps, and
 * where sources differ. Every colour on the card is named next to it.
 */
export function RuleCard({ id }: { id: CardId }) {
  const { m } = useI18n();
  const review = useReview();
  // Every example is heard in al-Ḥuṣarī's teaching recitation where the Qurʾān says it.
  const player = useWordPlayer();
  const card = CARDS[id];
  const unit = unitOf(id);
  const cards: readonly CardId[] = UNIT_CARDS[unit];
  const index = cards.indexOf(id);
  const previous = cards[index - 1];
  const next = cards[index + 1];
  // Nūn and mīm sākina are decided by the next letter, a long madd by the hamza, shadda or
  // sukūn after it; a shadda or a sukūn on the letter itself is not.
  const decided = card.groups.some(
    (group) =>
      ['nun-sakina-tanwin', 'mim-sakina'].includes(RULES[group.rule].subject) ||
      (RULES[group.rule].subject === 'madd' && group.rule !== 'madd-tabii')
  );
  const families = [
    ...new Set(card.groups.map((group) => RULES[group.rule].family)),
  ].filter((family): family is RuleFamily => family !== null);
  const hasClear = card.groups.some((group) => RULES[group.rule].family === null);

  return (
    <LearningShell closeTo="/pfad" progress={(index + 1) / cards.length}>
      <article className="stack" style={{ gap: 20 }} aria-labelledby="rule-card-title">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p className="eyebrow">{m.ruleCard.eyebrow(unit)}</p>
          <span className="muted">{m.ruleCard.progress(index + 1, cards.length)}</span>
        </div>

        <header
          className="stack"
          style={{ gap: 4, alignItems: 'center', textAlign: 'center' }}
        >
          <p className="quran rule-name" lang="ar" dir="rtl">
            {cardArabicName(id)}
          </p>
          <h1 id="rule-card-title" className="rule-title">
            <CardName id={id} /> – {m.cards[id].title}
          </h1>
          {card.review.status === 'draft' && (
            <p className="row" style={{ justifyContent: 'center', gap: 8 }}>
              <span className="chip chip-quiet">{m.ruleCard.draft}</span>
              <span className="muted">{m.ruleCard.draftHint}</span>
            </p>
          )}
        </header>

        {card.groups.map((group) => (
          <Group
            key={group.rule}
            group={group}
            titled={card.groups.length > 1}
            player={player}
          />
        ))}

        <div className="legend" aria-label={m.today.legend}>
          {families.map((family) => (
            <span key={family}>
              <b className="tj" data-rule={family}>
                ●
              </b>{' '}
              {m.ruleCard.colourKey(
                m.ruleCard.colours[family],
                m.rules[family].name,
                m.rules[family].hint
              )}
            </span>
          ))}
          {hasClear && <span>{m.ruleCard.clear}</span>}
          {decided && (
            <span>
              <span className="arabic tj-follower" lang="ar" aria-hidden="true">
                ب
              </span>{' '}
              {m.ruleCard.followerKey}
            </span>
          )}
        </div>

        <ol className="steps">
          {m.cards[id].steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="muted">{m.cards[id].tip}</p>

        {card.exceptions.length > 0 && (
          <section className="card stack" aria-labelledby="exceptions">
            <h2 id="exceptions" className="h-small">
              {m.ruleCard.exceptions}
            </h2>
            <div className="examples" dir="rtl">
              {card.exceptions.map((text) => (
                <figure key={text} className="example">
                  <Example text={text} only={IZHAR} player={player} />
                </figure>
              ))}
            </div>
          </section>
        )}

        {player.failed && <p role="alert">{m.lab.listen.failed}</p>}
        <p className="muted example-source">{m.lab.listen.source}</p>

        {card.sourcesDiffer && (
          <aside className="note stack" style={{ gap: 4 }}>
            <strong>{m.ruleCard.sourcesDiffer}</strong>
            <p>{m.ruleCard.sources[card.sourcesDiffer]}</p>
            <p className="muted">{m.ruleCard.teacherNote}</p>
          </aside>
        )}

        <nav className="row card-nav">
          {previous ? (
            <Link className="btn" to={`/pfad/${unit}/${previous}`}>
              {m.ruleCard.previous}
            </Link>
          ) : (
            <span />
          )}
          <Link
            className="btn btn-primary"
            to={next ? `/pfad/${unit}/${next}` : '/pfad'}
            // Read to its end (ADR-0023): XP the first time, the streak every time.
            onClick={() =>
              review.logActivity({ kind: 'rule-card', ref: id, right: 0, total: 0 })
            }
          >
            {next ? (
              <>
                {m.ruleCard.next}: <CardName id={next} />
              </>
            ) : (
              m.ruleCard.done
            )}
          </Link>
        </nav>
      </article>
    </LearningShell>
  );
}

/** The card's name in the reader's interface language. */
function CardName({ id }: { id: CardId }) {
  const { language } = useI18n();
  return <>{cardName(id, language)}</>;
}

const IZHAR = new Set(['izhar'] as const);

/** The madd letters (alif after fatḥa, wāw after ḍamma, yāʾ after kasra, as the label says). */
const MADD_LETTERS = 'ا و ي';

/**
 * An example as the sheet writes it, coloured by the engine; where the Qurʾān has it, a button
 * that plays it in al-Ḥuṣarī's teaching recitation, with where it is and, if the reciter's
 * vowels differ from the sheet's, the Qurʾān's wording.
 */
function Example({
  text,
  only,
  player,
}: {
  text: string;
  only: ReadonlySet<RuleId>;
  player: WordPlayer;
}) {
  const { m } = useI18n();
  const coloured = <TajweedText segments={segmentsOf(text, only)} />;
  const audio = CARD_AUDIO[text];
  if (!audio) return coloured;
  return (
    <>
      <button
        type="button"
        className="example-play"
        data-playing={player.playing === audio.key ? 'true' : undefined}
        aria-label={m.ruleCard.play(audio.sura, audio.aya)}
        disabled={!player.ready}
        onClick={() => player.play(audio.key)}
      >
        {coloured}
        <span className="example-where" dir="ltr">
          <PlayIcon pause={false} /> {m.lab.listen.where(audio.sura, audio.aya)}
        </span>
      </button>
      {audio.quran && (
        // The examples run right to left; the label reads in the interface's direction.
        <span className="example-quran muted" dir="auto">
          {m.ruleCard.inQuran}{' '}
          <bdi className="arabic" lang="ar" dir="rtl">
            {audio.quran}
          </bdi>
        </span>
      )}
    </>
  );
}

/** One rule of the card: the letters that call for it and the sheet's examples. */
function Group({
  group,
  titled,
  player,
}: {
  group: ExampleGroup;
  titled: boolean;
  player: WordPlayer;
}) {
  const { m, language } = useI18n();
  const rule = RULES[group.rule];
  const only = useMemo(() => new Set([group.rule]), [group.rule]);
  // Qalqala and madd are no question of ghunna; a madd says how long it is held instead.
  const quality = rule.counts
    ? m.ruleCard.counts(...rule.counts)
    : rule.subject === 'qalqala'
      ? null
      : rule.ghunna
        ? m.ruleCard.withGhunna
        : m.ruleCard.withoutGhunna;
  const decided = rule.subject === 'nun-sakina-tanwin' || rule.subject === 'mim-sakina';
  const lettersLabel =
    rule.subject === 'ghunna'
      ? m.ruleCard.lettersShadda
      : rule.subject === 'qalqala'
        ? m.ruleCard.lettersSukun
        : m.ruleCard.letters;
  return (
    // Both idghām groups share the term, so the label names the ghunna (or the length) too.
    <section
      className="stack"
      aria-label={
        quality
          ? `${ruleName(group.rule, language)} · ${quality}`
          : ruleName(group.rule, language)
      }
    >
      {(titled || quality) && (
        <div className="row" style={{ gap: 8 }}>
          {titled && <h2 className="h-small">{ruleName(group.rule, language)}</h2>}
          {quality && <span className="chip chip-quiet">{quality}</span>}
        </div>
      )}
      <div className="stack" style={{ gap: 6 }}>
        {rule.subject === 'madd' ? (
          <>
            <p className="muted">{m.ruleCard.maddLetters}</p>
            <p className="letters arabic" lang="ar" dir="rtl">
              {MADD_LETTERS}
            </p>
            {rule.letters.length > 0 && (
              <p className="muted">
                {m.ruleCard.thenHamza}{' '}
                <span className="arabic" lang="ar" dir="rtl">
                  {rule.letters.join(' ')}
                </span>
              </p>
            )}
          </>
        ) : rule.letters.length > 0 ? (
          <>
            <p className="muted">{lettersLabel}</p>
            <p className="letters arabic" lang="ar" dir="rtl">
              {rule.letters.join(' ')}
            </p>
          </>
        ) : (
          // Iẓhār shafawī: every letter but bāʾ and mīm.
          <p className="muted">{m.ruleCard.allOtherLetters}</p>
        )}
      </div>
      {/* Right to left, so the examples read in the order of the sheet. */}
      <div className="paper examples" dir="rtl" aria-label={m.ruleCard.examples}>
        {group.examples.map((example) => (
          <figure key={example.text} className="example">
            <Example text={example.text} only={only} player={player} />
            {/* Where it happens matters for nūn and mīm sākina, not for a shadda or a sukūn. */}
            {decided && (
              <figcaption className="muted" dir="auto">
                {m.ruleCard.cases[example.case]}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
