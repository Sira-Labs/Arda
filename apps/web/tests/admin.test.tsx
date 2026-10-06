import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { Account } from '@/modules/account/Account';
import { Admin } from '@/modules/admin/Admin';
import type { AdminUser, Me } from '@/services/auth';
import { fakeApi, Providers } from './render';

const ADMIN: Me = {
  id: 'a',
  email: 'markus@example.org',
  name: 'Markus',
  role: 'admin',
  timeZone: null,
  language: 'de',
};
const SHEIKH: AdminUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'sheikh@example.org',
  name: 'Sheikh Ahmad',
  role: 'student',
  emailVerified: true,
  disabled: false,
  createdAt: '2026-10-06T10:00:00Z',
};
const SELF: AdminUser = {
  ...SHEIKH,
  id: 'a',
  email: ADMIN.email,
  name: 'Markus',
  role: 'admin',
};

function renderAt(path: string, answers: Parameters<typeof fakeApi>[0], me: Me | null) {
  const api = fakeApi(answers, me);
  render(
    <Providers client={api.client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/verwaltung" element={<Admin />} />
          <Route path="/konto" element={<Account />} />
        </Routes>
      </MemoryRouter>
    </Providers>
  );
  return api;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('arda.language', 'de');
});

describe('the admin area (ADR-0005)', () => {
  it('makes a sheikh a teacher, and never offers to change one’s own role', async () => {
    const { calls } = renderAt(
      '/verwaltung',
      {
        'GET /api/v1/admin/users': Response.json({ users: [SELF, SHEIKH], next: null }),
        [`PATCH /api/v1/admin/users/${SHEIKH.id}`]: () =>
          Response.json({ ...SHEIKH, role: 'teacher' }),
      },
      ADMIN
    );
    const user = userEvent.setup();
    const row = (await screen.findByText('Sheikh Ahmad')).closest('li')!;
    await user.selectOptions(
      within(row).getByRole('combobox', { name: 'Rolle' }),
      'teacher'
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Gespeichert: Sheikh Ahmad'
    );
    expect(within(row).getByRole('combobox', { name: 'Rolle' })).toHaveValue('teacher');
    expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({
      path: `/api/v1/admin/users/${SHEIKH.id}`,
      body: { role: 'teacher' },
    });
    const own = screen.getByText('Markus').closest('li')!;
    expect(within(own).getByRole('combobox', { name: 'Rolle' })).toBeDisabled();
    expect(within(own).queryByRole('button', { name: 'Sperren' })).toBeNull();
  });

  it('searches by address or name', async () => {
    const { calls } = renderAt(
      '/verwaltung',
      {
        'GET /api/v1/admin/users': Response.json({ users: [SELF, SHEIKH], next: null }),
        'GET /api/v1/admin/users?q=sheikh': Response.json({
          users: [SHEIKH],
          next: null,
        }),
      },
      ADMIN
    );
    const user = userEvent.setup();
    await screen.findByText('Sheikh Ahmad');
    await user.type(screen.getByRole('searchbox', { name: /Suchen/ }), 'sheikh');
    await user.click(screen.getByRole('button', { name: 'Suchen' }));
    await waitFor(() => expect(screen.queryByText('Markus')).toBeNull());
    expect(calls.at(-1)?.path).toBe('/api/v1/admin/users?q=sheikh');
  });

  it('asks for the second factor first, then lists the people', async () => {
    let confirmed = false;
    const { calls } = renderAt(
      '/verwaltung',
      {
        'GET /api/v1/admin/users': () =>
          confirmed
            ? Response.json({ users: [SHEIKH], next: null })
            : Response.json({ error: 'second_factor_required' }, { status: 403 }),
        'GET /api/v1/account/2fa': Response.json({ enabled: true, confirmed: false }),
        'POST /api/v1/account/2fa/confirm': () => {
          confirmed = true;
          return new Response(null, { status: 204 });
        },
      },
      ADMIN
    );
    const user = userEvent.setup();
    expect(
      await screen.findByText(/Bestätige diese Sitzung mit einem Code/)
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole('textbox', { name: 'Sechsstelliger Code' }),
      '123 456'
    );
    await user.click(screen.getByRole('button', { name: 'Bestätigen' }));
    expect(await screen.findByText('Sheikh Ahmad')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ code: '123456' });
  });

  it('makes the change it was refused once the second factor is confirmed', async () => {
    let confirmed = false;
    const { calls } = renderAt(
      '/verwaltung',
      {
        'GET /api/v1/admin/users': Response.json({ users: [SHEIKH], next: null }),
        [`PATCH /api/v1/admin/users/${SHEIKH.id}`]: () =>
          confirmed
            ? Response.json({ ...SHEIKH, role: 'teacher' })
            : Response.json({ error: 'second_factor_required' }, { status: 403 }),
        'GET /api/v1/account/2fa': Response.json({ enabled: true, confirmed: false }),
        'POST /api/v1/account/2fa/confirm': () => {
          confirmed = true;
          return new Response(null, { status: 204 });
        },
      },
      ADMIN
    );
    const user = userEvent.setup();
    const row = (await screen.findByText('Sheikh Ahmad')).closest('li')!;
    await user.selectOptions(
      within(row).getByRole('combobox', { name: 'Rolle' }),
      'teacher'
    );
    await user.type(
      await screen.findByRole('textbox', { name: 'Sechsstelliger Code' }),
      '123456'
    );
    await user.click(screen.getByRole('button', { name: 'Bestätigen' }));
    expect(await screen.findByText('Gespeichert: Sheikh Ahmad')).toBeInTheDocument();
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(2);
  });

  it('keeps the latest search when an older answer arrives late, and pages that search', async () => {
    let first: (value: Response) => void = () => {};
    const { calls } = renderAt(
      '/verwaltung',
      {
        'GET /api/v1/admin/users': () =>
          new Promise<Response>((resolve) => {
            first = resolve;
          }),
        'GET /api/v1/admin/users?q=sheikh': Response.json({
          users: [SHEIKH],
          next: 'c2',
        }),
        'GET /api/v1/admin/users?q=sheikh&cursor=c2': Response.json({
          users: [{ ...SHEIKH, id: 'x', name: 'Sheikh Yusuf' }],
          next: null,
        }),
      },
      ADMIN
    );
    const user = userEvent.setup();
    const field = await screen.findByRole('searchbox', { name: /Suchen/ });
    await user.type(field, 'sheikh');
    await user.click(screen.getByRole('button', { name: 'Suchen' }));
    expect(await screen.findByText('Sheikh Ahmad')).toBeInTheDocument();
    // The first, unsearched list answers only now: it must not replace the search.
    first(Response.json({ users: [SELF], next: null }));
    await new Promise((done) => setTimeout(done, 20));
    expect(screen.queryByText('Markus')).toBeNull();
    // Typing without searching again does not change which list the next page belongs to.
    await user.type(field, 'x');
    await user.click(screen.getByRole('button', { name: 'Weitere laden' }));
    expect(await screen.findByText('Sheikh Yusuf')).toBeInTheDocument();
    expect(calls.at(-1)?.path).toBe('/api/v1/admin/users?q=sheikh&cursor=c2');
  });

  it('is not there for anyone but an admin', async () => {
    renderAt('/verwaltung', {}, { ...ADMIN, role: 'teacher' });
    expect(await screen.findByText('Nicht gefunden')).toBeInTheDocument();
  });
});

describe('the second factor on the account page', () => {
  it('sets it up with a QR code and the key, then confirms', async () => {
    const { calls } = renderAt(
      '/konto',
      {
        '/api/v1/account/sessions': Response.json({ sessions: [] }),
        'GET /api/v1/account/2fa': Response.json({ enabled: false, confirmed: false }),
        'POST /api/v1/account/2fa/setup': Response.json({
          uri: 'otpauth://totp/arda:markus@example.org?secret=ABCDEF',
          secret: 'ABCDEF',
        }),
        'POST /api/v1/account/2fa/confirm': () =>
          Response.json({ error: 'invalid_code' }, { status: 400 }),
      },
      ADMIN
    );
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Einrichten' }));
    expect(
      screen.getByRole('img', { name: 'QR-Code für die Authenticator-App' })
    ).toBeVisible();
    expect(screen.getByText('ABCDEF')).toBeInTheDocument();
    await user.type(
      screen.getByRole('textbox', { name: 'Sechsstelliger Code' }),
      '000000'
    );
    await user.click(screen.getByRole('button', { name: 'Bestätigen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Der Code stimmt nicht.');
    // A new code clears the refusal of the last one.
    await user.type(screen.getByRole('textbox', { name: 'Sechsstelliger Code' }), '1');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('link', { name: 'Zur Verwaltung' })).toHaveAttribute(
      'href',
      '/verwaltung'
    );
    expect(calls.some((c) => c.path === '/api/v1/account/2fa/setup')).toBe(true);
  });

  it('is not shown to a student', async () => {
    renderAt(
      '/konto',
      { '/api/v1/account/sessions': Response.json({ sessions: [] }) },
      { ...ADMIN, role: 'student' }
    );
    expect(await screen.findByRole('heading', { name: 'Markus' })).toBeInTheDocument();
    expect(screen.queryByText('Zwei-Faktor-Anmeldung')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Zur Verwaltung' })).toBeNull();
  });
});
