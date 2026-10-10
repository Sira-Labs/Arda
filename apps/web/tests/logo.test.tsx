import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppShell } from '@/components/AppShell';
import { Logo } from '@/components/Logo';
import { SignIn } from '@/modules/account/SignIn';
import { Today } from '@/modules/today/Today';
import { fakeApi, Providers } from './render';

function renderAt(path: string) {
  const api = fakeApi({
    'GET /api/v1/assignments': () => Response.json({ assignments: [] }),
  });
  render(
    <Providers client={api.client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Today />} />
            <Route path="/anmelden" element={<SignIn />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Providers>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('arda.language', 'de');
});

describe('the mark', () => {
  it('is decorative without a label and an image with one', () => {
    const { container } = render(<Logo />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    render(<Logo variant="rings" label="ʿArḍa" />);
    expect(screen.getByRole('img', { name: 'ʿArḍa' })).toBeInTheDocument();
  });
});

describe('the logo in the app', () => {
  it('opens the sign-in page with the brand header: the Arabic name, the name, the tagline', async () => {
    renderAt('/anmelden');
    const arabic = await screen.findByText('العَرْضة');
    expect(arabic).toHaveAttribute('lang', 'ar');
    expect(arabic).toHaveAttribute('dir', 'rtl');
    const header = arabic.closest('.brand-header') as HTMLElement;
    expect(within(header).getByText('ʿArḍa')).toBeInTheDocument();
    expect(
      within(header).getByText('Rezitieren, gehört werden, korrigiert werden.')
    ).toBeInTheDocument();
    // The sign-in form is still there below it.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ʿArḍa');
  });

  it('says the tagline in the reader’s language', async () => {
    localStorage.setItem('arda.language', 'fr');
    renderAt('/anmelden');
    expect(
      await screen.findByText('Réciter, être entendu, être corrigé.')
    ).toBeInTheDocument();
  });

  it('shows the mark on Today, beside the greeting, the language and the account', async () => {
    renderAt('/');
    expect(await screen.findByRole('img', { name: 'ʿArḍa' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Assalāmu ʿalaikum'
    );
    expect(screen.getByRole('combobox', { name: 'Sprache' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Anmelden' })).toHaveAttribute(
      'href',
      '/anmelden'
    );
  });

  it('puts the brand at the top of the navigation, the mark beside the name', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' });
    const brand = nav.querySelector('.app-brand') as HTMLElement;
    expect(brand).toHaveTextContent('ʿArḍa');
    expect(brand.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    // Today, path, muṣḥaf, lab, the student's plan and the sheikh.
    expect(
      within(nav)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href'))
    ).toEqual(['/', '/pfad', '/mushaf', '/labor', '/lernplan', '/sheikh']);
  });
});
