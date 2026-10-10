import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sura } from '@arda/quran';
import { useI18n } from '@/i18n/I18nProvider';
import { PageAyat, pagesText } from '@/modules/assignments/AssignmentDetails';
import { useReview } from '@/review/ReviewProvider';
import { NOTE_KINDS, type NoteKind, type StudyNote } from '@/review/store';
import { NoteForm } from './NoteForm';

/** Where a note's place opens in the muṣḥaf: its āyāt, or its first page. */
export function mushafLink(note: Pick<StudyNote, 'range' | 'pages'>): string | null {
  if (note.range) {
    const { sura: n, from, to } = note.range;
    return `/mushaf/${n}?von=${from}&bis=${to}`;
  }
  if (note.pages) {
    const { layout, from, to } = note.pages;
    return `/mushaf/seite/${from}?layout=${layout}&seiten=${from}-${to}`;
  }
  return null;
}

/** "Sūra 2 · Āyāt 1–5 · البقرة", or "Seiten 8–9 (IndoPak) · البقرة 38–57". */
export function NotePlace({ note }: { note: Pick<StudyNote, 'range' | 'pages'> }) {
  const { m } = useI18n();
  if (note.range) {
    const { sura: n, from, to } = note.range;
    return (
      <span className="muted">
        {m.assignments.range(n, from, to)} ·{' '}
        <span lang="ar" dir="rtl">
          {sura(n)?.name}
        </span>
      </span>
    );
  }
  if (note.pages) {
    return (
      <span className="muted">
        {pagesText(m, note.pages)} · <PageAyat run={note.pages} />
      </span>
    );
  }
  return null;
}

/**
 * "Mein Lernplan" at /lernplan (owner, 2026-10-10; ADR-0022 update): the student's own notes on
 * what to learn next, what to revise and what was hard, each with a place in the Qurʾān if they
 * like. Private: kept on the device and synced with the account, never shown to anyone else.
 */
export function StudyPlan() {
  const { m } = useI18n();
  const { notes, saveNote } = useReview();
  return (
    <div className="stack" style={{ gap: 20, maxWidth: 720 }}>
      <header className="stack" style={{ gap: 6 }}>
        <p className="eyebrow">{m.plan.eyebrow}</p>
        <h1>{m.plan.title}</h1>
        <p className="muted">{m.plan.intro}</p>
      </header>
      <section className="card stack" aria-labelledby="plan-new">
        <h2 className="h-small" id="plan-new">
          {m.plan.newNote}
        </h2>
        <NoteForm onSave={saveNote} />
      </section>
      {NOTE_KINDS.map((kind) => (
        <NoteList key={kind} kind={kind} notes={notes.filter((n) => n.kind === kind)} />
      ))}
    </div>
  );
}

/** One kind of note: the open ones first, then those done. */
function NoteList({ kind, notes }: { kind: NoteKind; notes: readonly StudyNote[] }) {
  const { m } = useI18n();
  const ordered = [...notes.filter((n) => !n.done), ...notes.filter((n) => n.done)];
  const id = `plan-${kind}`;
  return (
    <section className="card stack" aria-labelledby={id}>
      <h2 className="h-small" id={id}>
        {m.plan.kinds[kind]}
      </h2>
      {ordered.length === 0 ? (
        <p className="muted">{m.plan.empty[kind]}</p>
      ) : (
        <ul
          className="stack"
          style={{ margin: 0, padding: 0, listStyle: 'none', gap: 12 }}
        >
          {ordered.map((note) => (
            <NoteItem key={note.id} note={note} />
          ))}
        </ul>
      )}
    </section>
  );
}

function NoteItem({ note }: { note: StudyNote }) {
  const { m } = useI18n();
  const { saveNote, removeNote } = useReview();
  const [editing, setEditing] = useState(false);
  const link = mushafLink(note);
  if (editing) {
    return (
      <li className="stack recording-row">
        <NoteForm
          note={note}
          onSave={(changed) => {
            saveNote(changed);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }
  return (
    <li className="stack recording-row" style={{ gap: 6 }}>
      {/* The student's own words, in whatever language and script they wrote them. */}
      <span dir="auto" className={note.done ? 'plan-note plan-done' : 'plan-note'}>
        {note.text}
      </span>
      <NotePlace note={note} />
      <span className="row" style={{ gap: 8 }}>
        <button
          type="button"
          className={note.done ? 'btn btn-teal' : 'btn'}
          aria-pressed={note.done}
          onClick={() => saveNote({ ...note, done: !note.done })}
        >
          {note.done ? '✓ ' : ''}
          {m.plan.done[note.kind]}
        </button>
        {link && (
          <Link className="btn" to={link}>
            {m.mushaf.open}
          </Link>
        )}
        <button className="btn btn-quiet" type="button" onClick={() => setEditing(true)}>
          {m.plan.edit}
        </button>
        <button
          className="btn btn-quiet"
          type="button"
          onClick={() => removeNote(note.id)}
        >
          {m.plan.remove}
        </button>
      </span>
    </li>
  );
}
