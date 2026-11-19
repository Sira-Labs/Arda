import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import type { Language } from '@/i18n/languages';
import { useSession } from '@/state/session';

type Shown =
  | { kind: 'original' }
  | { kind: 'translated'; text: string; language: Language }
  | { kind: 'unavailable' };

/**
 * The sheikh's written remark under a recitation (spec T6, ADR-0020). Written in another
 * language than the app is shown in, it is read in a machine translation, labelled as one,
 * with his own words one tap away. His words are shown until the translation is there and
 * whenever none can be had: a translation never stands in the way of what he wrote.
 *
 * @param noteLanguage the language he wrote in; `null` when unknown, then shown as written
 */
export function TeacherNote({
  recordingId,
  note,
  noteLanguage,
}: {
  recordingId: string;
  note: string;
  noteLanguage: Language | null;
}) {
  const { m, language } = useI18n();
  const { client } = useSession();
  const foreign = noteLanguage !== null && noteLanguage !== language;
  const [shown, setShown] = useState<Shown>({ kind: 'original' });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setShown({ kind: 'original' });
    setOpen(false);
    if (!foreign) return;
    let current = true;
    void client.translateNote(recordingId, language).then((result) => {
      if (!current) return;
      if (result.ok && result.value.status === 'translated') {
        setShown({
          kind: 'translated',
          text: result.value.text,
          language: result.value.language,
        });
      } else if (!result.ok || result.value.status === 'unavailable') {
        setShown({ kind: 'unavailable' });
      }
    });
    return () => {
      current = false;
    };
    // The remark itself is part of the key: a new answer is translated anew.
  }, [client, recordingId, note, language, foreign]);

  const original = (
    <span dir="auto" lang={noteLanguage ?? undefined}>
      {note}
    </span>
  );
  if (shown.kind === 'original') return original;
  if (shown.kind === 'unavailable') {
    return (
      <>
        {original}
        <span className="muted note-translation-label">{m.recite.noTranslation}</span>
      </>
    );
  }
  const originalId = `note-original-${recordingId}`;
  return (
    <>
      <span dir="auto" lang={shown.language}>
        {shown.text}
      </span>
      <span className="row muted note-translation-label" style={{ gap: 8 }}>
        <span>{m.feedback.machine}</span>
        <button
          className="btn-inline"
          type="button"
          aria-expanded={open}
          aria-controls={originalId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? m.recite.hideOriginal : m.recite.showOriginal}
        </button>
      </span>
      {open && (
        <span id={originalId} className="stack note-original" style={{ gap: 2 }}>
          <span className="muted note-translation-label">{m.feedback.original}</span>
          {original}
        </span>
      )}
    </>
  );
}
