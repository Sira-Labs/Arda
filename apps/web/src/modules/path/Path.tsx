import { RULES } from '@arda/tajweed';
import { Link } from 'react-router-dom';
import { CARDS, CARD_UNITS, UNIT_CARDS, cardName, type CardUnit } from '@/content/units';
import { useI18n } from '@/i18n/I18nProvider';
import { SaveProgressHint } from '@/modules/account/SaveProgressHint';
import { useReview } from '@/review/ReviewProvider';

/** The games of each unit: where they live, and their title and intro in the catalog. */
const GAMES: Record<
  CardUnit,
  readonly { path: string; game: 'whichRule' | 'sort' | 'unit3' | 'qalqala' }[]
> = {
  2: [
    { path: '/pfad/2/spiel/welche-regel', game: 'whichRule' },
    { path: '/pfad/2/spiel/sortieren', game: 'sort' },
  ],
  3: [{ path: '/pfad/3/spiel/welche-regel', game: 'unit3' }],
  4: [{ path: '/pfad/4/spiel/buchstaben', game: 'qalqala' }],
};

/**
 * The path (spec F1, spec 01 §4): unit 1 in the letter lab, then units 2–4 from the sheikh's
 * sheet, each with its rule cards in the order of the sheet and its games; the review of every
 * unit at the end.
 */
export function Path() {
  const { m } = useI18n();
  const review = useReview();
  return (
    <div className="stack" style={{ gap: 32, maxWidth: 720 }}>
      <h1>{m.path.eyebrow}</h1>

      <section className="stack" style={{ gap: 12 }} aria-labelledby="unit-1">
        <h2 id="unit-1">{m.path.units[1].title}</h2>
        <p className="muted">{m.path.units[1].intro}</p>
        <Link className="card path-card" to="/labor">
          <strong>{m.path.lab}</strong>
        </Link>
      </section>

      {CARD_UNITS.map((unit) => (
        <section
          key={unit}
          className="stack"
          style={{ gap: 12 }}
          aria-labelledby={`unit-${unit}`}
        >
          <h2 id={`unit-${unit}`}>{m.path.units[unit].title}</h2>
          <p className="muted">{m.path.units[unit].intro}</p>
          <Unit unit={unit} />
        </section>
      ))}

      <section className="card stack" style={{ gap: 8 }} aria-labelledby="review">
        <h2 id="review" className="h-small">
          {m.games.review.title}
        </h2>
        <p className="muted">{m.games.review.intro}</p>
        {review.due.length > 0 ? (
          <Link
            className="btn btn-primary"
            to="/pfad/wiederholen"
            style={{ alignSelf: 'flex-start' }}
          >
            {m.games.review.open(review.due.length)}
          </Link>
        ) : (
          <p>{m.games.review.none}</p>
        )}
      </section>

      <SaveProgressHint />
      <p className="muted">{m.path.next}</p>
    </div>
  );
}

/** A unit's rule cards, then its games. */
function Unit({ unit }: { unit: CardUnit }) {
  const { m, language } = useI18n();
  return (
    <>
      <ol className="stack path-cards" style={{ gap: 12 }}>
        {UNIT_CARDS[unit].map((id) => {
          const card = CARDS[id];
          const letters = card.groups.reduce(
            (count, group) => count + RULES[group.rule].letters.length,
            0
          );
          return (
            <li key={id}>
              <Link className="card path-card" to={`/pfad/${unit}/${id}`}>
                <span className="stack" style={{ gap: 4 }}>
                  <strong>{cardName(id, language)}</strong>
                  <span>{m.cards[id].title}</span>
                  {letters > 0 && (
                    <span className="muted">{m.path.letters(letters)}</span>
                  )}
                </span>
                {card.review.status === 'draft' && (
                  <span className="chip chip-quiet">{m.ruleCard.draft}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
      <ul className="stack path-cards" style={{ gap: 12 }} aria-label={m.games.practise}>
        {GAMES[unit].map(({ path, game }) => (
          <li key={path}>
            <Link className="card path-card" to={path}>
              <span className="stack" style={{ gap: 4 }}>
                <strong>{m.games[game].title}</strong>
                <span className="muted">{m.games[game].intro}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
