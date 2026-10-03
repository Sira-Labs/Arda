import { RULES } from '@arda/tajweed';
import { Link } from 'react-router-dom';
import { UNIT2, UNIT2_CARDS, cardName } from '@/content/unit2';
import { useI18n } from '@/i18n/I18nProvider';
import { useReview } from '@/review/ReviewProvider';

/** The path (spec F1): unit 2 first, its four rule cards in the order of the sheet. */
export function Path() {
  const { m, language } = useI18n();
  const review = useReview();
  return (
    <div className="stack" style={{ gap: 24, maxWidth: 720 }}>
      <header className="stack" style={{ gap: 8 }}>
        <p className="eyebrow">{m.path.eyebrow}</p>
        <h1>{m.path.unitTitle}</h1>
        <p className="muted">{m.path.intro}</p>
      </header>

      <ol className="stack path-cards" style={{ gap: 12 }}>
        {UNIT2_CARDS.map((id) => {
          const card = UNIT2[id];
          const letters = card.groups.reduce(
            (count, group) => count + RULES[group.rule].letters.length,
            0
          );
          return (
            <li key={id}>
              <Link className="card path-card" to={`/pfad/2/${id}`}>
                <span className="stack" style={{ gap: 4 }}>
                  <strong>{cardName(id, language)}</strong>
                  <span>{m.cards[id].title}</span>
                  <span className="muted">{m.path.letters(letters)}</span>
                </span>
                {card.review.status === 'draft' && (
                  <span className="chip chip-quiet">{m.ruleCard.draft}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>

      <section className="stack" style={{ gap: 12 }} aria-labelledby="practise">
        <h2 id="practise">{m.games.practise}</h2>
        <ul className="stack path-cards" style={{ gap: 12 }}>
          <li>
            <Link className="card path-card" to="/pfad/2/spiel/welche-regel">
              <span className="stack" style={{ gap: 4 }}>
                <strong>{m.games.whichRule.title}</strong>
                <span className="muted">{m.games.whichRule.intro}</span>
              </span>
            </Link>
          </li>
          <li>
            <Link className="card path-card" to="/pfad/2/spiel/sortieren">
              <span className="stack" style={{ gap: 4 }}>
                <strong>{m.games.sort.title}</strong>
                <span className="muted">{m.games.sort.intro}</span>
              </span>
            </Link>
          </li>
        </ul>
        <div className="card stack" style={{ gap: 8 }}>
          <strong>{m.games.review.title}</strong>
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
        </div>
      </section>

      <p className="muted">{m.path.next}</p>
    </div>
  );
}
