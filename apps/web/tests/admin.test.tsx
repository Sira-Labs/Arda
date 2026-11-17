import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { Account } from '@/modules/account/Account';
import { Admin } from '@/modules/admin/Admin';
import type { AdminUser, AuditEntry, Me } from '@/services/auth';
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

describe('the audit log on the admin page (spec A4)', () => {
  const entry = (id: string, change: Partial<AuditEntry>): AuditEntry => ({
    id,
    actorId: ADMIN.id,
    actorEmail: ADMIN.email,
    subjectEmail: null,
    halaqaName: null,
    action: 'account.2fa_enabled',
    targetType: 'user',
    targetId: ADMIN.id,
    details: {},
    ipAddress: null,
    createdAt: '2026-11-16T09:30:00Z',
    ...change,
  });
  const ROLE_CHANGE = entry('7', {
    action: 'user.role_changed',
    targetId: SHEIKH.id,
    subjectEmail: SHEIKH.email,
    details: { from: 'student', to: 'teacher' },
    ipAddress: '203.0.113.7',
  });
  const log = () => screen.findByRole('region', { name: 'Protokoll' });

  it('says who changed what, on whom, when and from where', async () => {
    renderAt(
      '/verwaltung',
      {
        'GET /api/v1/admin/users': Response.json({ users: [SELF, SHEIKH], next: null }),
        'GET /api/v1/admin/audit': Response.json({
          entries: [
            ROLE_CHANGE,
            entry('6', {
              action: 'halaqa.member_removed',
              actorId: SHEIKH.id,
              actorEmail: SHEIKH.email,
              targetType: 'halaqa',
              targetId: 'h1',
              halaqaName: 'Montagsrunde',
              details: { userId: 'gone' },
            }),
            entry('5', { action: 'account.deleted', actorId: null, actorEmail: null }),
            entry('4', {}),
            entry('3', { action: 'future.action' }),
          ],
          next: null,
        }),
      },
      ADMIN
    );
    const rows = within(await log()).getAllByRole('listitem');
    expect(rows).toHaveLength(5);

    const change = within(rows[0]!);
    expect(change.getByText('Rolle geändert')).toBeInTheDocument();
    expect(change.getByText(/Schüler·in → Sheikh \/ Lehrer·in/)).toBeInTheDocument();
    expect(change.getByText('markus@example.org')).toBeInTheDocument();
    expect(change.getByText('sheikh@example.org')).toBeInTheDocument();
    expect(change.getByText('203.0.113.7')).toBeInTheDocument();
    expect(change.getByText(/2026/).closest('time')).toHaveAttribute(
      'datetime',
      '2026-11-16T09:30:00Z'
    );

    // A member who has since deleted the account, in a ḥalaqa that still exists.
    const removed = within(rows[1]!);
    expect(removed.getByText('Mitglied entfernt')).toBeInTheDocument();
    expect(removed.getByText('Montagsrunde')).toBeInTheDocument();
    expect(removed.getByText('gelöschtes Konto')).toBeInTheDocument();

    // A deleted account deleted itself: said once, not as actor and subject.
    expect(within(rows[2]!).getByText('Konto gelöscht')).toBeInTheDocument();
    expect(within(rows[2]!).getAllByText('gelöschtes Konto')).toHaveLength(1);
    // About oneself: nobody else is named.
    expect(within(rows[3]!).queryByText('Betrifft')).toBeNull();
    // An action newer than this page is shown as written, not hidden.
    expect(within(rows[4]!).getByText('future.action')).toBeInTheDocument();
    expect(within(await log()).queryByRole('button')).toBeNull();
  });

  it('loads older entries, and shows a change made on the page at once', async () => {
    let changed = false;
    const { calls } = renderAt(
      '/verwaltung',
      {
        'GET /api/v1/admin/users': Response.json({ users: [SELF, SHEIKH], next: null }),
        'GET /api/v1/admin/audit': () =>
          Response.json({
            entries: changed ? [ROLE_CHANGE, entry('4', {})] : [entry('4', {})],
            next: '4',
          }),
        'GET /api/v1/admin/audit?before=4': Response.json({
          entries: [entry('2', { action: 'user.disabled', targetId: SHEIKH.id })],
          next: null,
        }),
        [`PATCH /api/v1/admin/users/${SHEIKH.id}`]: () => {
          changed = true;
          return Response.json({ ...SHEIKH, role: 'teacher' });
        },
      },
      ADMIN
    );
    const user = userEvent.setup();
    const region = within(await log());
    expect(await region.findByText('Zweiten Faktor eingerichtet')).toBeInTheDocument();
    expect(region.queryByText('Noch keine Einträge.')).toBeNull();

    await user.click(region.getByRole('button', { name: 'Weitere laden' }));
    expect(await region.findByText('Konto gesperrt')).toBeInTheDocument();
    expect(region.getAllByRole('listitem')).toHaveLength(2);
    expect(region.queryByRole('button', { name: 'Weitere laden' })).toBeNull();

    const row = (await screen.findByText('Sheikh Ahmad')).closest('li')!;
    await user.selectOptions(
      within(row).getByRole('combobox', { name: 'Rolle' }),
      'teacher'
    );
    expect(await region.findByText('Rolle geändert')).toBeInTheDocument();
    expect(calls.filter((c) => c.path.startsWith('/api/v1/admin/audit'))).toHaveLength(3);
  });

  it('says so when it is empty, and offers another try when it cannot be loaded', async () => {
    let fails = true;
    renderAt(
      '/verwaltung',
      {
        'GET /api/v1/admin/users': Response.json({ users: [SELF], next: null }),
        'GET /api/v1/admin/audit': () =>
          fails
            ? Response.json({ error: 'internal' }, { status: 500 })
            : Response.json({ entries: [], next: null }),
      },
      ADMIN
    );
    const user = userEvent.setup();
    const region = within(await log());
    expect(await region.findByRole('alert')).toBeInTheDocument();
    fails = false;
    await user.click(region.getByRole('button', { name: 'Noch einmal versuchen' }));
    expect(await region.findByText('Noch keine Einträge.')).toBeInTheDocument();
    expect(region.queryByRole('alert')).toBeNull();
  });

  it('asks for the code again when the confirmation has lapsed, and is not there before', async () => {
    let confirmed = true;
    renderAt(
      '/verwaltung',
      {
        'GET /api/v1/admin/users': Response.json({ users: [SELF], next: null }),
        'GET /api/v1/admin/audit': () =>
          confirmed
            ? Response.json({ entries: [entry('4', {})], next: null })
            : Response.json({ error: 'second_factor_required' }, { status: 403 }),
        'GET /api/v1/account/2fa': Response.json({ enabled: true, confirmed: false }),
        'POST /api/v1/account/2fa/confirm': () => {
          confirmed = true;
          return new Response(null, { status: 204 });
        },
      },
      ADMIN
    );
    confirmed = false;
    const user = userEvent.setup();
    await user.type(
      await screen.findByRole('textbox', { name: 'Sechsstelliger Code' }),
      '123456'
    );
    expect(screen.queryByRole('region', { name: 'Protokoll' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Bestätigen' }));
    expect(
      await within(await log()).findByText('Zweiten Faktor eingerichtet')
    ).toBeInTheDocument();
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
