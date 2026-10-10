import { useState, type FormEvent } from 'react';
import {
  PAGE_LAYOUTS,
  SURAS,
  isAyaRange,
  isPageRun,
  pagesOf,
  sura,
  type PageLayout,
} from '@arda/quran';
import { useI18n } from '@/i18n/I18nProvider';
import type { NoteInput } from '@/review/ReviewProvider';
import {
  NOTE_KINDS,
  NOTE_MAX_LENGTH,
  type NoteKind,
  type StudyNote,
} from '@/review/store';

type Where = 'none' | 'ayat' | 'pages';

/**
 * Writing a note of "Mein Lernplan", or changing one: what kind, what it says, and where in
 * the Qurʾān if anywhere (āyāt of a sūra, or pages of the printed muṣḥaf).
 */
export function NoteForm({
  note,
  kind: initialKind = 'learn',
  onSave,
  onCancel,
}: {
  /** The note being changed; a new one without. */
  note?: StudyNote;
  kind?: NoteKind;
  onSave: (note: NoteInput) => void;
  onCancel?: () => void;
}) {
  const { m } = useI18n();
  const p = m.plan;
  const f = m.assignments.form;
  const [kind, setKind] = useState<NoteKind>(note?.kind ?? initialKind);
  const [text, setText] = useState(note?.text ?? '');
  const [where, setWhere] = useState<Where>(
    note?.range ? 'ayat' : note?.pages ? 'pages' : 'none'
  );
  const [suraNumber, setSuraNumber] = useState(note?.range?.sura ?? 2);
  const [from, setFrom] = useState(note?.range?.from ?? 1);
  const [to, setTo] = useState(note?.range?.to ?? 5);
  // The sheikh's IndoPak copy first (ADR-0017).
  const [layout, setLayout] = useState<PageLayout>(note?.pages?.layout ?? 'indopak-15');
  const [pageFrom, setPageFrom] = useState(
    note?.pages?.from ?? pagesOf('indopak-15').first
  );
  const [pageTo, setPageTo] = useState(note?.pages?.to ?? pagesOf('indopak-15').first);

  const range = { sura: suraNumber, from, to };
  const run = { layout, from: pageFrom, to: pageTo };
  const { first, last } = pagesOf(layout);
  const valid =
    text.trim().length > 0 &&
    (where !== 'ayat' || isAyaRange(range)) &&
    (where !== 'pages' || isPageRun(run));

  const chooseSura = (n: number) => {
    setSuraNumber(n);
    setFrom(1);
    setTo(Math.min(sura(n)?.ayas ?? 1, 5));
  };
  const chooseLayout = (next: PageLayout) => {
    setLayout(next);
    setPageFrom(pagesOf(next).first);
    setPageTo(pagesOf(next).first);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onSave({
      ...(note ? { id: note.id } : {}),
      kind,
      text: text.trim(),
      range: where === 'ayat' ? range : null,
      pages: where === 'pages' ? run : null,
      done: note?.done ?? false,
    });
    if (!note) {
      setText('');
      setWhere('none');
    }
  };

  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={submit}>
      <span className="row" style={{ gap: 8 }} role="group" aria-label={p.kind}>
        {NOTE_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className={kind === k ? 'btn btn-primary' : 'btn'}
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
          >
            {p.kinds[k]}
          </button>
        ))}
      </span>
      <label className="stack" style={{ gap: 4 }}>
        <span>{p.text}</span>
        <textarea
          className="input"
          rows={2}
          required
          maxLength={NOTE_MAX_LENGTH}
          dir="auto"
          placeholder={p.placeholder[kind]}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <div className="assignment-form">
        <label className="stack field">
          <span>{p.where}</span>
          <select
            className="input"
            value={where}
            onChange={(event) => setWhere(event.target.value as Where)}
          >
            <option value="none">{p.whereNone}</option>
            <option value="ayat">{p.whereAyat}</option>
            <option value="pages">{p.wherePages}</option>
          </select>
        </label>
        {where === 'ayat' && (
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
                max={sura(suraNumber)?.ayas ?? 1}
                value={to}
                onChange={(event) => setTo(Number(event.target.value))}
              />
            </label>
          </>
        )}
        {where === 'pages' && (
          <>
            <label className="stack field wide">
              <span>{f.layout}</span>
              <select
                className="input"
                value={layout}
                onChange={(event) => chooseLayout(event.target.value as PageLayout)}
              >
                {PAGE_LAYOUTS.map((l) => (
                  <option key={l} value={l}>
                    {m.assignments.layouts[l]}
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
                max={pageTo}
                value={pageFrom}
                onChange={(event) => setPageFrom(Number(event.target.value))}
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
          </>
        )}
      </div>
      <span className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={!valid}>
          {note ? p.save : p.add}
        </button>
        {onCancel && (
          <button className="btn" type="button" onClick={onCancel}>
            {p.cancel}
          </button>
        )}
      </span>
    </form>
  );
}
