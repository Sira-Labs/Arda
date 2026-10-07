import { useState, type FormEvent } from 'react';
import {
  PAGE_LAYOUTS,
  SURAS,
  isAyaRange,
  isPageRun,
  pagesOf,
  sura,
  type PageLayout,
  type PageRun,
} from '@arda/quran';
import { RULE_IDS, type RuleId } from '@arda/tajweed';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import type { AssignmentKind, AssignmentRange, HalaqaMember } from '@/services/auth';
import { useSession } from '@/state/session';
import { ruleName } from '@/tajweed/rules';
import { PageAyat } from './AssignmentDetails';
import { addDays, localDay } from './format';

const KINDS: readonly AssignmentKind[] = ['recite', 'read', 'learn', 'practise'];

/** Reading and reciting point at āyāt; learning and practising at a rule (ADR-0014). */
const needsRange = (kind: AssignmentKind) => kind === 'read' || kind === 'recite';

/**
 * Giving an assignment (spec T2): for one student or all, a range by sūra and āya or pages of
 * the printed muṣḥaf (ADR-0014 update 2026-10-07), a rule to watch, how often to read, a due
 * day and a note.
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
  const [by, setBy] = useState<'ayat' | 'pages'>('ayat');
  // The sheikh's IndoPak copy first (ADR-0017).
  const [layout, setLayout] = useState<PageLayout>('indopak-15');
  const [pageFrom, setPageFrom] = useState(() => pagesOf('indopak-15').first);
  const [pageTo, setPageTo] = useState(() => pagesOf('indopak-15').first);
  const [rule, setRule] = useState<RuleId | ''>('');
  const [repetitions, setRepetitions] = useState(1);
  const [dueOn, setDueOn] = useState(() => addDays(localDay(), 7));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [given, setGiven] = useState(false);

  const ayas = sura(suraNumber)?.ayas ?? 1;
  const range: AssignmentRange = fixedRange ?? { sura: suraNumber, from, to };
  const run: PageRun = { layout, from: pageFrom, to: pageTo };
  const { first, last } = pagesOf(layout);
  const byPages = by === 'pages' && !fixedRange;
  const valid =
    (needsRange(kind) ? (byPages ? isPageRun(run) : isAyaRange(range)) : rule !== '') &&
    /^\d{4}-\d{2}-\d{2}$/.test(dueOn);

  const chooseLayout = (next: PageLayout) => {
    setLayout(next);
    setPageFrom(pagesOf(next).first);
    setPageTo(pagesOf(next).first);
  };

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
      range: (needsRange(kind) && !byPages) || fixedRange ? range : null,
      pages: needsRange(kind) && byPages ? run : null,
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
          <fieldset className="stack field wide choice">
            <legend>{f.by}</legend>
            <span className="row" style={{ gap: 16 }}>
              {(['ayat', 'pages'] as const).map((option) => (
                <label key={option} className="row" style={{ gap: 6 }}>
                  <input
                    type="radio"
                    name="by"
                    checked={by === option}
                    onChange={() => setBy(option)}
                  />
                  {option === 'ayat' ? f.byAyat : f.byPages}
                </label>
              ))}
            </span>
          </fieldset>
        )}
        {needsRange(kind) && byPages && (
          <>
            <label className="stack field wide">
              <span>{f.layout}</span>
              <select
                className="input"
                value={layout}
                onChange={(event) => chooseLayout(event.target.value as PageLayout)}
              >
                {PAGE_LAYOUTS.map((id) => (
                  <option key={id} value={id}>
                    {m.assignments.layouts[id]}
                  </option>
                ))}
              </select>
            </label>
            <label className="stack field">
              <span>{f.pageFrom}</span>
              <input
                className="input"
                type="number"
                min={first}
                max={last}
                value={pageFrom}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setPageFrom(next);
                  // One page unless the teacher says otherwise.
                  if (next > pageTo) setPageTo(next);
                }}
              />
            </label>
            <label className="stack field">
              <span>{f.pageTo}</span>
              <input
                className="input"
                type="number"
                min={pageFrom}
                max={last}
                value={pageTo}
                onChange={(event) => setPageTo(Number(event.target.value))}
              />
            </label>
            {isPageRun(run) && (
              <p className="muted wide" role="status">
                {f.onPages} <PageAyat run={run} />
              </p>
            )}
          </>
        )}
        {needsRange(kind) && !fixedRange && !byPages && (
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
