import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { Halaqa } from '@/modules/halaqa/Halaqa';
import { Join } from '@/modules/halaqa/Join';
import { Sheikh } from '@/modules/sheikh/Sheikh';
import { Today } from '@/modules/today/Today';
import type { Me } from '@/services/auth';
import { fakeApi, Providers } from './render';

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const HALAQA = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const STUDENT: Me = {
  id: 's',
  email: 'amina@example.org',
  name: 'Amina',
  role: 'student',
  timeZone: null,
  language: 'de',
};
const TEACHER: Me = {
  ...STUDENT,
  id: 't',
  email: 'sheikh@example.org',
  name: 'Sheikh Ahmad',
  role: 'teacher',
};

function Where() {
  const location = useLocation();
  return <span data-testid="where">{location.pathname + location.hash}</span>;
}

function renderAt(path: string, answers: Parameters<typeof fakeApi>[0], me: Me | null) {
  const api = fakeApi(answers, me);
  render(
    <Providers client={api.client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/beitreten" element={<Join />} />
          <Route path="/sheikh" element={<Sheikh />} />
          <Route path="/halaqa/:id" element={<Halaqa />} />
          <Route path="/" element={<Today />} />
          <Route path="*" element={null} />
        </Routes>
        <Where />
        <Link to={`/halaqa/${OTHER}`}>other</Link>
      </MemoryRouter>
    </Providers>
  );
  return api;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('arda.language', 'de');
});

describe('joining by invite link (T1)', () => {
  it('takes the token out of the address bar and keeps it across signing in', async () => {
    renderAt(`/beitreten#${TOKEN}`, {}, null);
    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent(/^\/beitreten$/)
    );
    expect(JSON.parse(localStorage.getItem('arda.invite')!).token).toBe(TOKEN);
    expect(await screen.findByRole('link', { name: 'Anmelden' })).toHaveAttribute(
      'href',
      '/anmelden?zurueck=/beitreten'
    );
  });

  it('shows where the link leads, joins, and waits for the teacher', async () => {
    localStorage.setItem(
      'arda.invite',
      JSON.stringify({ token: TOKEN, savedAt: Date.now() })
    );
    const { calls } = renderAt(
      '/beitreten',
      {
        '/api/v1/halaqat/invites/preview': Response.json({
          halaqa: {
            halaqaId: HALAQA,
            name: 'Juzʾ ʿAmma',
            oneToOne: false,
            teacherName: 'Sheikh Ahmad',
          },
        }),
        '/api/v1/halaqat/join': Response.json({
          halaqa: { id: HALAQA, name: 'Juzʾ ʿAmma' },
          status: 'pending',
        }),
      },
      STUDENT
    );
    expect(
      await screen.findByRole('heading', { name: 'Ḥalaqa „Juzʾ ʿAmma“' })
    ).toBeInTheDocument();
    expect(screen.getByText('bei Sheikh Ahmad')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Beitreten' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Angefragt.');
    // The token went in the body, never in a URL, and is forgotten after use.
    const join = calls.find((c) => c.path === '/api/v1/halaqat/join');
    expect(join).toMatchObject({ method: 'POST', body: { token: TOKEN } });
    expect(calls.every((c) => !c.path.includes(TOKEN))).toBe(true);
    expect(localStorage.getItem('arda.invite')).toBeNull();
  });

  it('says so when the link has expired', async () => {
    renderAt(
      `/beitreten#${TOKEN}`,
      {
        '/api/v1/halaqat/invites/preview': Response.json(
          { error: 'invite_invalid' },
          { status: 404 }
        ),
      },
      STUDENT
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Dieser Link ist abgelaufen oder ungültig.'
    );
    expect(localStorage.getItem('arda.invite')).toBeNull();
  });
});

describe('joining when the network fails', () => {
  it('keeps the link for another try instead of forgetting it', async () => {
    localStorage.setItem(
      'arda.invite',
      JSON.stringify({ token: TOKEN, savedAt: Date.now() })
    );
    renderAt(
      '/beitreten',
      {
        '/api/v1/halaqat/invites/preview': () => Promise.reject(new TypeError('offline')),
      },
      STUDENT
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Keine Verbindung.');
    expect(JSON.parse(localStorage.getItem('arda.invite')!).token).toBe(TOKEN);
  });
});

describe('the sheikh page (T1)', () => {
  it('reports a failed load and loads again on request', async () => {
    let fail = true;
    renderAt(
      '/sheikh',
      {
        'GET /api/v1/halaqat': () =>
          fail
            ? Response.json({ error: 'internal_error' }, { status: 500 })
            : Response.json({ halaqat: [] }),
      },
      STUDENT
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Serverfehler (500).');
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Nochmal versuchen' }));
    expect(await screen.findByText(/Du bist noch in keiner Ḥalaqa/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('lets a teacher open a ḥalaqa and go to it', async () => {
    const { calls } = renderAt(
      '/sheikh',
      {
        'GET /api/v1/halaqat': Response.json({ halaqat: [] }),
        'POST /api/v1/halaqat': Response.json({ id: HALAQA }, { status: 201 }),
      },
      TEACHER
    );
    expect(
      await screen.findByText('Du hast noch keine Ḥalaqa geöffnet.')
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Name'), 'Juzʾ ʿAmma');
    await userEvent.click(
      screen.getByLabelText('Einzelunterricht (genau ein·e Schüler·in)')
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ḥalaqa öffnen' }));
    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent(`/halaqa/${HALAQA}`)
    );
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      name: 'Juzʾ ʿAmma',
      oneToOne: true,
    });
  });

  it('shows a student which ḥalaqa still waits for approval', async () => {
    renderAt(
      '/sheikh',
      {
        'GET /api/v1/halaqat': Response.json({
          halaqat: [
            {
              id: HALAQA,
              name: 'Juzʾ ʿAmma',
              oneToOne: false,
              role: 'student',
              status: 'pending',
              teacherName: 'Sheikh Ahmad',
              students: 3,
              pending: null,
            },
          ],
        }),
      },
      STUDENT
    );
    expect(await screen.findByText('wartet auf Bestätigung')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Juzʾ ʿAmma/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ḥalaqa öffnen' })
    ).not.toBeInTheDocument();
  });
});

describe('Today (T1)', () => {
  it('asks a teacher without ḥalaqāt to open one, and a student to join one', async () => {
    renderAt('/', { 'GET /api/v1/halaqat': Response.json({ halaqat: [] }) }, TEACHER);
    expect(
      await screen.findByText('Du hast noch keine Ḥalaqa geöffnet.')
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Neue Ḥalaqa' })).toBeInTheDocument();
  });
});

describe('a ḥalaqa for its teacher (T1)', () => {
  const view = (status: 'pending' | 'active') =>
    Response.json({
      role: 'teacher',
      halaqa: {
        id: HALAQA,
        name: 'Juzʾ ʿAmma',
        oneToOne: false,
        teacherName: 'Sheikh Ahmad',
        createdAt: '2026-10-03T12:00:00Z',
      },
      members: [
        {
          userId: 't',
          name: 'Sheikh Ahmad',
          email: 'sheikh@example.org',
          role: 'teacher',
          status: 'active',
          joinedAt: '2026-10-03T12:00:00Z',
        },
        {
          userId: 's',
          name: 'Amina',
          email: 'amina@example.org',
          role: 'student',
          status,
          joinedAt: '2026-10-03T12:00:00Z',
        },
      ],
      invite: null,
    });

  it('makes an invite link with the token in the fragment and as a QR code', async () => {
    renderAt(
      `/halaqa/${HALAQA}`,
      {
        [`GET /api/v1/halaqat/${HALAQA}`]: () => view('pending'),
        [`POST /api/v1/halaqat/${HALAQA}/invites`]: Response.json(
          { token: TOKEN, expiresAt: '2026-10-17T12:00:00Z' },
          { status: 201 }
        ),
      },
      TEACHER
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Einladungslink erstellen' })
    );
    const link = await screen.findByDisplayValue(
      `${window.location.origin}/beitreten#${TOKEN}`
    );
    expect(link).toHaveAttribute('readonly');
    expect(
      screen.getByRole('img', { name: 'QR-Code zum Beitreten' })
    ).toBeInTheDocument();
    expect(screen.getByText(/Gilt bis 17. Oktober/)).toBeInTheDocument();
  });

  it('shows the later ḥalaqa even when the earlier one answers last', async () => {
    let answerFirst: ((response: Response) => void) | null = null;
    const detail = (id: string, name: string) =>
      Response.json({
        role: 'student',
        halaqa: {
          id,
          name,
          oneToOne: false,
          teacherName: null,
          createdAt: '2026-10-03T12:00:00Z',
        },
      });
    renderAt(
      `/halaqa/${HALAQA}`,
      {
        [`GET /api/v1/halaqat/${HALAQA}`]: () =>
          new Promise<Response>((resolve) => (answerFirst = resolve)),
        [`GET /api/v1/halaqat/${OTHER}`]: () => detail(OTHER, 'Die zweite'),
      },
      STUDENT
    );
    await waitFor(() => expect(answerFirst).not.toBeNull());
    await userEvent.click(screen.getByRole('link', { name: 'other' }));
    expect(
      await screen.findByRole('heading', { name: 'Die zweite' })
    ).toBeInTheDocument();
    answerFirst!(detail(HALAQA, 'Die erste'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByRole('heading', { name: 'Die zweite' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Die erste' })).not.toBeInTheDocument();
  });

  it('says why an action failed', async () => {
    renderAt(
      `/halaqa/${HALAQA}`,
      {
        [`GET /api/v1/halaqat/${HALAQA}`]: () => view('pending'),
        [`POST /api/v1/halaqat/${HALAQA}/members/s/approve`]: Response.json(
          { error: 'forbidden' },
          { status: 403 }
        ),
      },
      TEACHER
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Annehmen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Dafür fehlt die Berechtigung.'
    );
    expect(screen.getByRole('button', { name: 'Annehmen' })).toBeEnabled();
  });

  it('approves a waiting student', async () => {
    let status: 'pending' | 'active' = 'pending';
    const { calls } = renderAt(
      `/halaqa/${HALAQA}`,
      {
        [`GET /api/v1/halaqat/${HALAQA}`]: () => view(status),
        [`POST /api/v1/halaqat/${HALAQA}/members/s/approve`]: () => {
          status = 'active';
          return new Response(null, { status: 204 });
        },
      },
      TEACHER
    );
    const waiting = await screen.findByRole('region', { name: 'Warten auf Bestätigung' });
    expect(waiting).toHaveTextContent('Amina');
    await userEvent.click(screen.getByRole('button', { name: 'Annehmen' }));
    expect(
      await screen.findByRole('region', { name: 'Schüler·innen' })
    ).toHaveTextContent('Amina');
    expect(
      screen.queryByRole('region', { name: 'Warten auf Bestätigung' })
    ).not.toBeInTheDocument();
    expect(
      calls.some((c) => c.path.endsWith('/members/s/approve') && c.method === 'POST')
    ).toBe(true);
  });
});
