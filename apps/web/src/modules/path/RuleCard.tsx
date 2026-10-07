import { RULES } from '@arda/tajweed';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LearningShell } from '@/components/LearningShell';
import { TajweedText } from '@/components/TajweedText';
import {
  UNIT2,
  UNIT2_CARDS,
  cardArabicName,
  cardName,
  isUnit2Card,
  type ExampleGroup,
  type Unit2Card,
} from '@/content/unit2';
import { useI18n } from '@/i18n/I18nProvider';
import { Soon } from '@/modules/Soon';
import { useReview } from '@/review/ReviewProvider';
import { ruleName, type RuleFamily } from '@/tajweed/rules';
import { segmentsOf } from '@/tajweed/segments';

/** `/pfad/2/:rule`: a rule card of unit 2, or "not found" for anything else. */
export function RuleCardPage() {
  const { rule } = useParams();
  if (!isUnit2Card(rule)) return <Soon page="notFound" />;
  return <RuleCard id={rule} />;
}

/**
 * A rule card (spec F2, screen 1): the rule's Arabic name and one line, the letters that call
 * for it, every example of the sheet coloured by the engine with its case, the steps, and
 * where sources differ. Every colour on the card is named next to it.
 */
export function RuleCard({ id }: { id: Unit2Card }) {
  const { m } = useI18n();
  const review = useReview();
  const card = UNIT2[id];
  const index = UNIT2_CARDS.indexOf(id);
  const previous = UNIT2_CARDS[index - 1];
  const next = UNIT2_CARDS[index + 1];
  const families = [
    ...new Set(card.groups.map((group) => RULES[group.rule].family)),
  ].filter((family): family is RuleFamily => family !== null);
  const hasClear = card.groups.some((group) => RULES[group.rule].family === null);

  return (
    <LearningShell closeTo="/pfad" progress={(index + 1) / UNIT2_CARDS.length}>
      <article className="stack" style={{ gap: 20 }} aria-labelledby="rule-card-title">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p className="eyebrow">{m.ruleCard.eyebrow}</p>
          <span className="muted">
            {m.ruleCard.progress(index + 1, UNIT2_CARDS.length)}
          </span>
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
          <Group key={group.rule} group={group} titled={card.groups.length > 1} />
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
          <span>
            <span className="arabic tj-follower" lang="ar" aria-hidden="true">
              ب
            </span>{' '}
            {m.ruleCard.followerKey}
          </span>
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
                  <TajweedText segments={segmentsOf(text, new Set(['izhar']))} />
                </figure>
              ))}
            </div>
          </section>
        )}

        {card.sourcesDiffer && (
          <aside className="note stack" style={{ gap: 4 }}>
            <strong>{m.ruleCard.sourcesDiffer}</strong>
            <p>{m.ruleCard.sources[card.sourcesDiffer]}</p>
            <p className="muted">{m.ruleCard.teacherNote}</p>
          </aside>
        )}

        <nav className="row card-nav">
          {previous ? (
            <Link className="btn" to={`/pfad/2/${previous}`}>
              {m.ruleCard.previous}
            </Link>
          ) : (
            <span />
          )}
          <Link
            className="btn btn-primary"
            to={next ? `/pfad/2/${next}` : '/pfad'}
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
function CardName({ id }: { id: Unit2Card }) {
  const { language } = useI18n();
  return <>{cardName(id, language)}</>;
}

/** One rule of the card: the letters that call for it and the sheet's examples. */
function Group({ group, titled }: { group: ExampleGroup; titled: boolean }) {
  const { m, language } = useI18n();
  const rule = RULES[group.rule];
  const only = useMemo(() => new Set([group.rule]), [group.rule]);
  const ghunna = rule.ghunna ? m.ruleCard.withGhunna : m.ruleCard.withoutGhunna;
  return (
    // Both idghām groups share the term, so the label names the ghunna too.
    <section
      className="stack"
      aria-label={`${ruleName(group.rule, language)} · ${ghunna}`}
    >
      <div className="row" style={{ gap: 8 }}>
        {titled && <h2 className="h-small">{ruleName(group.rule, language)}</h2>}
        <span className="chip chip-quiet">{ghunna}</span>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <p className="muted">{m.ruleCard.letters}</p>
        <p className="letters arabic" lang="ar" dir="rtl">
          {rule.letters.join(' ')}
        </p>
      </div>
      {/* Right to left, so the examples read in the order of the sheet. */}
      <div className="paper examples" dir="rtl" aria-label={m.ruleCard.examples}>
        {group.examples.map((example) => (
          <figure key={example.text} className="example">
            <TajweedText segments={segmentsOf(example.text, only)} />
            <figcaption className="muted" dir="auto">
              {m.ruleCard.cases[example.case]}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
