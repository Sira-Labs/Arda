import { useState, type FormEvent } from 'react';
import { SURAS, isAyaRange, sura } from '@arda/quran';
import { RULE_IDS, type RuleId } from '@arda/tajweed';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import type { AssignmentKind, AssignmentRange, HalaqaMember } from '@/services/auth';
import { useSession } from '@/state/session';
import { ruleName } from '@/tajweed/rules';
import { addDays, localDay } from './format';

const KINDS: readonly AssignmentKind[] = ['recite', 'read', 'learn', 'practise'];

/** Reading and reciting point at āyāt; learning and practising at a rule (ADR-0014). */
const needsRange = (kind: AssignmentKind) => kind === 'read' || kind === 'recite';

/**
 * Giving an assignment (spec T2): for one student or all, a range by sūra and āya (word keys
 * follow with the muṣḥaf), a rule to watch, how often to read, a due day and a note.
 */
export function AssignmentForm({
  halaqaId,
  students,
  onGiven,
  fixedRange,
}: {
  halaqaId: string;
  /** The ḥalaqa's active students. */
  students: HalaqaMember[];
  onGiven: () => void;
  /** Āyāt or words chosen on the muṣḥaf page (S3.2): no sūra and āya fields then. */
  fixedRange?: AssignmentRange;
}) {
  const { client } = useSession();
  const { m, language } = useI18n();
  const [studentId, setStudentId] = useState('');
  const [kind, setKind] = useState<AssignmentKind>('recite');
  const [suraNumber, setSuraNumber] = useState(1);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(7);
  const [rule, setRule] = useState<RuleId | ''>('');
  const [repetitions, setRepetitions] = useState(1);
  const [dueOn, setDueOn] = useState(() => addDays(localDay(), 7));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [given, setGiven] = useState(false);

  const ayas = sura(suraNumber)?.ayas ?? 1;
  const range: AssignmentRange = fixedRange ?? { sura: suraNumber, from, to };
  const valid =
    (needsRange(kind) ? isAyaRange(range) : rule !== '') &&
    /^\d{4}-\d{2}-\d{2}$/.test(dueOn);

  const chooseSura = (n: number) => {
    setSuraNumber(n);
    setFrom(1);
    setTo(sura(n)?.ayas ?? 1);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setGiven(false);
    const result = await client.giveAssignment(halaqaId, {
      kind,
      studentId: studentId || null,
      // A range chosen on the page goes with every kind: learning a rule there, too.
      range: needsRange(kind) || fixedRange ? range : null,
      focusRule: rule || null,
      repetitions: kind === 'read' ? repetitions : null,
      note: note.trim() || null,
      dueOn,
    });
    setBusy(false);
    if (result.ok) {
      setGiven(true);
      setNote('');
      onGiven();
    } else {
      setError(errorMessage(m, result));
    }
  };

  const f = m.assignments.form;
  return (
    <form className="stack" onSubmit={(event) => void submit(event)}>
      <h3 className="h-small">{f.title}</h3>
      <div className="assignment-form">
        <label className="stack field">
          <span>{f.who}</span>
          <select
            className="input"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
          >
            <option value="">{f.everyone}</option>
            {students.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.name ?? s.email}
              </option>
            ))}
          </select>
        </label>
        <label className="stack field">
          <span>{f.kind}</span>
          <select
            className="input"
            value={kind}
            onChange={(event) => setKind(event.target.value as AssignmentKind)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {m.assignments.kinds[k]}
              </option>
            ))}
          </select>
        </label>
        {needsRange(kind) && !fixedRange && (
          <>
            <label className="stack field wide">
              <span>{f.sura}</span>
              <select
                className="input"
                value={suraNumber}
                onChange={(event) => chooseSura(Number(event.target.value))}
              >
                {SURAS.map((s) => (
                  <option key={s.number} value={s.number} lang="ar">
                    {s.number} · {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="stack field">
              <span>{f.from}</span>
              <input
                className="input"
                type="number"
                min={1}
                max={to}
                value={from}
                onChange={(event) => setFrom(Number(event.target.value))}
              />
            </label>
            <label className="stack field">
              <span>{f.to}</span>
              <input
                className="input"
                type="number"
                min={from}
                max={ayas}
                value={to}
                onChange={(event) => setTo(Number(event.target.value))}
              />
            </label>
          </>
        )}
        <label className="stack field">
          <span>{f.rule}</span>
          <select
            className="input"
            value={rule}
            required={!needsRange(kind)}
            onChange={(event) => setRule(event.target.value as RuleId | '')}
          >
            <option value="" disabled={!needsRange(kind)}>
              {f.noRule}
            </option>
            {RULE_IDS.map((id) => (
              <option key={id} value={id}>
                {ruleName(id, language)}
                {m.assignments.variant(id) ? ` ${m.assignments.variant(id)}` : ''}
              </option>
            ))}
          </select>
        </label>
        {kind === 'read' && (
          <label className="stack field">
            <span>{f.repetitions}</span>
            <input
              className="input"
              type="number"
              min={1}
              max={20}
              value={repetitions}
              onChange={(event) => setRepetitions(Number(event.target.value))}
            />
          </label>
        )}
        <label className="stack field">
          <span>{f.due}</span>
          <input
            className="input"
            type="date"
            required
            min={localDay()}
            value={dueOn}
            onChange={(event) => setDueOn(event.target.value)}
          />
        </label>
        <label className="stack field wide">
          <span>{f.note}</span>
          <textarea
            className="input"
            rows={2}
            maxLength={500}
            dir="auto"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </div>
      <button
        className="btn btn-primary"
        type="submit"
        style={{ alignSelf: 'flex-start' }}
        disabled={busy || !valid}
      >
        {f.submit}
      </button>
      {given && <p role="status">{f.given}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
