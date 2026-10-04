import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { AssignmentForm } from '@/modules/assignments/AssignmentForm';
import { rangeText } from '@/modules/assignments/AssignmentDetails';
import { useHalaqat } from '@/modules/halaqa/useHalaqat';
import type { AssignmentRange, HalaqaMember } from '@/services/auth';
import { useSession } from '@/state/session';

/** The ḥalaqāt the signed-in person teaches (active), for giving work on the page. */
export function useTeaching() {
  const { halaqat } = useHalaqat();
  return (halaqat ?? []).filter((h) => h.role === 'teacher' && h.status === 'active');
}

/**
 * Giving the words chosen on the page as an assignment (S3.2, ADR-0014): which ḥalaqa, then
 * the usual form with the range fixed.
 */
export function PageAssign({
  range,
  onGiven,
  onCancel,
}: {
  range: AssignmentRange;
  onGiven: () => void;
  onCancel: () => void;
}) {
  const { client } = useSession();
  const { m } = useI18n();
  const teaching = useTeaching();
  const [chosen, setChosen] = useState('');
  const [students, setStudents] = useState<HalaqaMember[]>([]);
  const halaqaId = chosen || teaching[0]?.id || '';

  useEffect(() => {
    if (!halaqaId) return;
    let current = true;
    void client.halaqa(halaqaId).then((result) => {
      if (!current) return;
      setStudents(
        result.ok && result.value.role === 'teacher'
          ? result.value.members.filter(
              (x) => x.role === 'student' && x.status === 'active'
            )
          : []
      );
    });
    return () => {
      current = false;
    };
  }, [client, halaqaId]);

  return (
    <div
      className="word-sheet card stack"
      role="dialog"
      aria-labelledby="page-assign-title"
    >
      <p className="eyebrow" id="page-assign-title">
        {m.mushaf.assign}
      </p>
      <p>
        <b>{rangeText(m, range)}</b>
      </p>
      {teaching.length > 1 && (
        <label className="stack" style={{ gap: 6 }}>
          <span>{m.mushaf.halaqa}</span>
          <select
            className="input"
            value={halaqaId}
            onChange={(event) => setChosen(event.target.value)}
          >
            {teaching.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {halaqaId && (
        <AssignmentForm
          key={halaqaId}
          halaqaId={halaqaId}
          students={students}
          fixedRange={range}
          onGiven={onGiven}
        />
      )}
      <button
        className="btn"
        type="button"
        style={{ alignSelf: 'flex-start' }}
        onClick={onCancel}
      >
        {m.mushaf.cancel}
      </button>
    </div>
  );
}
