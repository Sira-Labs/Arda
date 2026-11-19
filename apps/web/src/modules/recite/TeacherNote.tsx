import { useEffect, useRef, useState } from 'react';
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
 * @param reviewedAt the moment of the answer this page shows
 * @param onStale the api translated a later answer than the one shown: the list is out of date
 */
export function TeacherNote({
  recordingId,
  note,
  noteLanguage,
  reviewedAt,
  onStale,
}: {
  recordingId: string;
  note: string;
  noteLanguage: Language | null;
  reviewedAt: string;
  onStale: () => void;
}) {
  const { m, language } = useI18n();
  const { client } = useSession();
  const foreign = noteLanguage !== null && noteLanguage !== language;
  const [shown, setShown] = useState<Shown>({ kind: 'original' });
  const [open, setOpen] = useState(false);
  // The later answers already reported, so one of them asks for the list only once.
  const reported = useRef(new Set<string>());

  useEffect(() => {
    setShown({ kind: 'original' });
    setOpen(false);
    if (!foreign) return;
    let current = true;
    void client.translateNote(recordingId, language).then((result) => {
      if (!current) return;
      if (!result.ok) return setShown({ kind: 'unavailable' });
      const outcome = result.value;
      // He has answered again since this page loaded: a translation of his new words must
      // not stand over his old ones. His words as shown stay until the list is fresh.
      if (outcome.reviewedAt && outcome.reviewedAt !== reviewedAt) {
        if (!reported.current.has(outcome.reviewedAt)) {
          reported.current.add(outcome.reviewedAt);
          onStale();
        }
        return;
      }
      if (outcome.status === 'translated') {
        setShown({ kind: 'translated', text: outcome.text, language: outcome.language });
      } else if (outcome.status === 'unavailable') {
        setShown({ kind: 'unavailable' });
      }
    });
    return () => {
      current = false;
    };
    // The answer itself is part of the key: a new one is translated anew.
  }, [client, recordingId, note, reviewedAt, language, foreign, onStale]);

  const original = (
    <span dir="auto" lang={noteLanguage ?? undefined}>
      {note}
    </span>
  );
  if (!foreign) return original;
  const translated = shown.kind === 'translated' ? shown : null;
  const originalId = `note-original-${recordingId}`;
  return (
    <>
      {translated ? (
        <span dir="auto" lang={translated.language}>
          {translated.text}
        </span>
      ) : (
        original
      )}
      <span className="row muted note-translation-label" style={{ gap: 8 }}>
        {/* There from the start, so the outcome is announced when it arrives. */}
        <span role="status">
          {translated
            ? m.feedback.machine
            : shown.kind === 'unavailable'
              ? m.recite.noTranslation
              : ''}
        </span>
        {translated && (
          <button
            className="btn-inline"
            type="button"
            aria-expanded={open}
            aria-controls={originalId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? m.recite.hideOriginal : m.recite.showOriginal}
          </button>
        )}
      </span>
      {translated && open && (
        <span id={originalId} className="stack note-original" style={{ gap: 2 }}>
          <span className="muted note-translation-label">{m.feedback.original}</span>
          {original}
        </span>
      )}
    </>
  );
}
