import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import type { OwnArdaSummary } from '@/services/auth';
import { useSession } from '@/state/session';
import { SuraRows } from './SuraRows';

/**
 * "Dein ʿArḍ" on a student's ḥalaqa page (spec T4, ADR-0025): the sūras they recited to this
 * ḥalaqa's sheikh, how often, when last and how he found them. Nothing before the first entry.
 */
export function MyArda({ halaqaId }: { halaqaId: string }) {
  const { m } = useI18n();
  const { client } = useSession();
  const [rows, setRows] = useState<OwnArdaSummary[]>([]);

  useEffect(() => {
    let current = true;
    void client.myArdaSummary().then((result) => {
      if (current && result.ok) {
        setRows(result.value.summary.filter((row) => row.halaqaId === halaqaId));
      }
    });
    return () => {
      current = false;
    };
  }, [client, halaqaId]);

  if (rows.length === 0) return null;
  return (
    <section className="card stack" aria-labelledby="my-arda">
      <h2 className="h-small" id="my-arda">
        {m.arda.mine}
      </h2>
      <p className="muted">{m.arda.mineIntro}</p>
      <SuraRows rows={rows} />
    </section>
  );
}
