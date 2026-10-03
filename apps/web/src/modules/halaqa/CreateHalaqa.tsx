import { useState, type FormEvent } from 'react';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import { useSession } from '@/state/session';

/** Opening a ḥalaqa: a name, and whether it is one-to-one. */
export function CreateHalaqa({ onCreated }: { onCreated: (id: string) => void }) {
  const { client } = useSession();
  const { m } = useI18n();
  const [name, setName] = useState('');
  const [oneToOne, setOneToOne] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await client.createHalaqa(name.trim(), oneToOne);
    setBusy(false);
    if (result.ok) onCreated(result.value.id);
    else setError(errorMessage(m, result));
  };

  return (
    <form className="card stack" onSubmit={(event) => void submit(event)}>
      <h2 className="h-small">{m.halaqa.create.title}</h2>
      <label className="stack" style={{ gap: 6 }}>
        <span>{m.halaqa.create.name}</span>
        <input
          className="input"
          value={name}
          maxLength={80}
          required
          placeholder={m.halaqa.create.placeholder}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="row" style={{ gap: 8 }}>
        <input
          type="checkbox"
          checked={oneToOne}
          onChange={(event) => setOneToOne(event.target.checked)}
        />
        <span>{m.halaqa.create.oneToOne}</span>
      </label>
      <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>
        {m.halaqa.create.submit}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
