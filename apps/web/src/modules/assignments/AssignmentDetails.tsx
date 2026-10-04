import { sura } from '@arda/quran';
import { useI18n } from '@/i18n/I18nProvider';
import type { Messages } from '@/i18n/messages';
import type { AssignmentBase, AssignmentRange } from '@/services/auth';
import { ruleName } from '@/tajweed/rules';
import { dueState, formatDay, formatMoment } from './format';

/** "Sūra 2, Āyāt 1–5", or with the words it starts and ends at (S3.2). */
export function rangeText(m: Messages, range: AssignmentRange): string {
  return range.words
    ? m.assignments.rangeWords(
        range.sura,
        range.from,
        range.words.from,
        range.to,
        range.words.to
      )
    : m.assignments.range(range.sura, range.from, range.to);
}

/** What every view of an assignment shows: the kind, the āyāt, the rule to watch, the note. */
export function AssignmentDetails({ assignment }: { assignment: AssignmentBase }) {
  const { m, language } = useI18n();
  const { range, focusRule, repetitions, note } = assignment;
  const named = range ? sura(range.sura) : undefined;
  return (
    <span className="stack" style={{ gap: 4 }}>
      <strong>
        {m.assignments.kinds[assignment.kind]}
        {repetitions ? ` · ${m.assignments.times(repetitions)}` : ''}
      </strong>
      {range && (
        <span>
          {rangeText(m, range)}
          {named && (
            <>
              {' · '}
              <span lang="ar" dir="rtl">
                {named.name}
              </span>
            </>
          )}
        </span>
      )}
      {focusRule && (
        <span>
          {m.assignments.focus} <b>{ruleName(focusRule, language)}</b>
          {m.assignments.variant(focusRule) ? ` ${m.assignments.variant(focusRule)}` : ''}
        </span>
      )}
      {/* The sheikh's own words, in whatever script he wrote them. */}
      {note && (
        <span className="assignment-note" dir="auto">
          {note}
        </span>
      )}
    </span>
  );
}

/** "bis Fr., 9. Okt.", "heute fällig", "überfällig seit …", or when it was done. */
export function DueLabel({ dueOn, doneAt }: { dueOn: string; doneAt?: string | null }) {
  const { m, language } = useI18n();
  if (doneAt) {
    return (
      <span className="muted">
        ✓ {m.assignments.doneOn(formatMoment(doneAt, language))}
      </span>
    );
  }
  const state = dueState(dueOn);
  const day = formatDay(dueOn, language);
  if (state === 'overdue') {
    return <span className="due-overdue">{m.assignments.overdue(day)}</span>;
  }
  return (
    <span className={state === 'today' ? 'due-today' : 'muted'}>
      {state === 'today' ? m.assignments.dueToday : m.assignments.due(day)}
    </span>
  );
}
