import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { SURAS, isAyaRange, sura } from '@arda/quran';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import type { RemarkId } from '@/i18n/messages';
import { formatDay, localDay } from '@/modules/assignments/format';
import { REMARKS } from '@/modules/recite/remarks';
import type {
  ArdaEntry,
  HalaqaMember,
  StudentArdaSummary,
  Verdict,
} from '@/services/auth';
import { useSession } from '@/state/session';
import { SuraRows } from './SuraRows';

/**
 * The ʿarḍ log on the ḥalaqa page (spec T4, S4.3; ADR-0025): per student, which sūras they
 * recited, how often, when last and with what verdict; each student's entries one by one; and
 * a form for what was recited face to face. Answered recordings enter the log by themselves.
 */
export function ArdaLog({
  halaqaId,
  students,
}: {
  halaqaId: string;
  /** The ḥalaqa's active students. */
  students: HalaqaMember[];
}) {
  const { m } = useI18n();
  const { client } = useSession();
  const [summary, setSummary] = useState<StudentArdaSummary[] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  // Bumped after a change, so an open history reloads.
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    const result = await client.ardaSummary(halaqaId);
    if (result.ok) {
      setSummary(result.value.summary);
      setFailure(null);
    } else {
      setFailure(errorMessage(m, result));
    }
  }, [client, halaqaId, m]);

  useEffect(() => {
    void load();
  }, [load]);

  const changed = () => {
    setVersion((v) => v + 1);
    void load();
  };

  // Students with entries who are no longer active members.
  const active = new Set(students.map((s) => s.userId));
  const former = [
    ...new Map(
      (summary ?? [])
        .filter((s) => !active.has(s.studentId))
        .map((s) => [s.studentId, s] as const)
    ).values(),
  ];

  return (
    <section className="card stack" aria-labelledby="arda-title">
      <h2 className="h-small" id="arda-title">
        {m.arda.title}
      </h2>
      <p className="muted">{m.arda.intro}</p>
      {failure && <p role="alert">{failure}</p>}
      {summary && (
        <ul
          className="stack"
          style={{ margin: 0, padding: 0, listStyle: 'none', gap: 12 }}
        >
          {students.map((student) => (
            <StudentBlock
              key={student.userId}
              studentId={student.userId}
              name={student.name ?? student.email ?? ''}
              rows={summary.filter((s) => s.studentId === student.userId)}
              open={open === student.userId}
              onOpen={setOpen}
              history={
                <History
                  key={version}
                  halaqaId={halaqaId}
                  studentId={student.userId}
                  onRemoved={changed}
                />
              }
            />
          ))}
        </ul>
      )}
      {/* The notebook keeps those who left (owner, 2026-10-10; ADR-0025 update). */}
      {former.length > 0 && (
        <>
          <h3 className="h-small">{m.arda.former}</h3>
          <ul
            className="stack"
            style={{ margin: 0, padding: 0, listStyle: 'none', gap: 12 }}
          >
            {former.map(({ studentId, studentName }) => (
              <StudentBlock
                key={studentId}
                studentId={studentId}
                name={studentName ?? m.struggles.unnamed}
                rows={(summary ?? []).filter((s) => s.studentId === studentId)}
                open={open === studentId}
                onOpen={setOpen}
                history={
                  <History
                    key={version}
                    halaqaId={halaqaId}
                    studentId={studentId}
                    onRemoved={changed}
                  />
                }
              />
            ))}
          </ul>
        </>
      )}
      {students.length > 0 && (
        <EntryForm halaqaId={halaqaId} students={students} onWritten={changed} />
      )}
    </section>
  );
}

/** A student in the log: their sūras, and their entries one by one when opened. */
function StudentBlock({
  studentId,
  name,
  rows,
  open,
  onOpen,
  history,
}: {
  studentId: string;
  name: string;
  rows: StudentArdaSummary[];
  open: boolean;
  onOpen: (update: (current: string | null) => string | null) => void;
  history: ReactNode;
}) {
  const { m } = useI18n();
  return (
    <li className="stack arda-student" style={{ gap: 6 }}>
      <span className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <strong>{name}</strong>
        {rows.length > 0 && (
          <button
            className="btn btn-quiet"
            type="button"
            aria-expanded={open}
            onClick={() =>
              onOpen((current) => (current === studentId ? null : studentId))
            }
          >
            {open ? m.arda.hideHistory : m.arda.history}
          </button>
        )}
      </span>
      {rows.length === 0 ? (
        <span className="muted">{m.arda.none}</span>
      ) : (
        <SuraRows rows={rows} />
      )}
      {open && history}
    </li>
  );
}

/** One student's entries, newest first, each removable. */
function History({
  halaqaId,
  studentId,
  onRemoved,
}: {
  halaqaId: string;
  studentId: string;
  onRemoved: () => void;
}) {
  const { m, language } = useI18n();
  const { client } = useSession();
  const [entries, setEntries] = useState<ArdaEntry[] | null>(null);
  const [more, setMore] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (before?: string) => {
      const result = await client.ardaEntries(halaqaId, studentId, before);
      if (!result.ok) {
        setFailure(errorMessage(m, result));
        return;
      }
      setFailure(null);
      setMore(result.value.more);
      setEntries((current) =>
        before ? [...(current ?? []), ...result.value.entries] : result.value.entries
      );
    },
    [client, halaqaId, studentId, m]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const result = await client.removeArdaEntry(halaqaId, id);
      if (result.ok) onRemoved();
      else setFailure(errorMessage(m, result));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      {failure && <p role="alert">{failure}</p>}
      <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 8 }}>
        {(entries ?? []).map((entry) => {
          const { sura: n, from, to } = entry.range;
          return (
            <li key={entry.id} className="stack recording-row" style={{ gap: 4 }}>
              <span className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                <span>
                  {formatDay(entry.recitedOn, language)} · {m.recite.range(n, from, to)}
                </span>
                <span className="chip" data-verdict={entry.verdict}>
                  {m.recite.verdicts[entry.verdict]}
                </span>
              </span>
              <span className="muted">
                {entry.source === 'recording' ? m.arda.fromRecording : m.arda.inPerson}
                {entry.writtenByName ? ` · ${entry.writtenByName}` : ''}
                {entry.marks.length > 0
                  ? ` · ${m.recite.marksCount(entry.marks.length)}`
                  : ''}
              </span>
              {entry.remark && <span>{m.remarks[entry.remark]}</span>}
              {/* The sheikh's own words, in whatever language he wrote them. */}
              {entry.note && <span dir="auto">{entry.note}</span>}
              <button
                className="btn btn-quiet"
                type="button"
                style={{ alignSelf: 'flex-start' }}
                disabled={busy}
                onClick={() => void remove(entry.id)}
              >
                {m.arda.remove}
              </button>
            </li>
          );
        })}
      </ul>
      {more && entries && (
        <button
          className="btn"
          type="button"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => void load(entries[entries.length - 1]?.id)}
        >
          {m.recite.older}
        </button>
      )}
    </div>
  );
}

/** What was recited face to face: student, sūra and āyāt, day, verdict, remark and note. */
function EntryForm({
  halaqaId,
  students,
  onWritten,
}: {
  halaqaId: string;
  students: HalaqaMember[];
  onWritten: () => void;
}) {
  const { m } = useI18n();
  const { client } = useSession();
  const [studentId, setStudentId] = useState(students[0]?.userId ?? '');
  const [suraNumber, setSuraNumber] = useState(1);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(7);
  const [recitedOn, setRecitedOn] = useState(() => localDay());
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [remark, setRemark] = useState<RemarkId | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [written, setWritten] = useState(false);

  const range = { sura: suraNumber, from, to };
  const today = localDay();
  const student = students.some((s) => s.userId === studentId)
    ? studentId
    : (students[0]?.userId ?? '');
  const valid =
    !!student &&
    !!verdict &&
    isAyaRange(range) &&
    /^\d{4}-\d{2}-\d{2}$/.test(recitedOn) &&
    recitedOn <= today;

  const chooseSura = (n: number) => {
    setSuraNumber(n);
    setFrom(1);
    setTo(sura(n)?.ayas ?? 1);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!verdict) return;
    setBusy(true);
    setFailure(null);
    setWritten(false);
    try {
      const result = await client.writeArdaEntry(halaqaId, {
        studentId: student,
        range,
        recitedOn,
        verdict,
        remark,
        note: note.trim() || null,
      });
      if (!result.ok) {
        setFailure(errorMessage(m, result));
        return;
      }
      setWritten(true);
      setVerdict(null);
      setRemark(null);
      setNote('');
      onWritten();
    } finally {
      setBusy(false);
    }
  };

  const f = m.assignments.form;
  return (
    <form className="stack" onSubmit={(event) => void submit(event)}>
      <h3 className="h-small">{m.arda.formTitle}</h3>
      <div className="assignment-form">
        <label className="stack field">
          <span>{m.arda.student}</span>
          <select
            className="input"
            value={student}
            onChange={(event) => setStudentId(event.target.value)}
          >
            {students.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.name ?? s.email}
              </option>
            ))}
          </select>
        </label>
        <label className="stack field">
          <span>{m.arda.day}</span>
          <input
            className="input"
            type="date"
            required
            max={today}
            value={recitedOn}
            onChange={(event) => setRecitedOn(event.target.value)}
          />
        </label>
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
            max={sura(suraNumber)?.ayas ?? 1}
            value={to}
            onChange={(event) => setTo(Number(event.target.value))}
          />
        </label>
        <label className="stack field wide">
          <span>{m.recite.remark}</span>
          <select
            className="input"
            value={remark ?? ''}
            onChange={(event) =>
              setRemark((event.target.value || null) as RemarkId | null)
            }
          >
            <option value="">{m.recite.noRemark}</option>
            {REMARKS.map((id) => (
              <option key={id} value={id}>
                {m.remarks[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="stack field wide">
          <span>{m.recite.note}</span>
          <textarea
            className="input"
            rows={2}
            maxLength={1000}
            dir="auto"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </div>
      <span className="row" style={{ gap: 8 }} role="group" aria-label={m.arda.verdict}>
        <button
          type="button"
          className={verdict === 'good' ? 'btn btn-teal' : 'btn'}
          aria-pressed={verdict === 'good'}
          onClick={() => setVerdict('good')}
        >
          {m.recite.good}
        </button>
        <button
          type="button"
          className={verdict === 'again' ? 'btn btn-primary' : 'btn'}
          aria-pressed={verdict === 'again'}
          onClick={() => setVerdict('again')}
        >
          {m.recite.againVerdict}
        </button>
      </span>
      <button
        className="btn btn-primary"
        type="submit"
        style={{ alignSelf: 'flex-start' }}
        disabled={busy || !valid}
      >
        {m.arda.submit}
      </button>
      {written && <p role="status">{m.arda.written}</p>}
      {failure && <p role="alert">{failure}</p>}
    </form>
  );
}
