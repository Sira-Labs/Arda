import { RULES } from '@arda/tajweed';
import { Link } from 'react-router-dom';
import { UNIT2, UNIT2_CARDS, cardName } from '@/content/unit2';
import { useI18n } from '@/i18n/I18nProvider';

/** The path (spec F1): unit 2 first, its four rule cards in the order of the sheet. */
export function Path() {
  const { m, language } = useI18n();
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

      <p className="muted">{m.path.next}</p>
    </div>
  );
}
