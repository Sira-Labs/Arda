import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignInForm } from '@/modules/account/SignInForm';
import { fakeApi, Providers } from './render';

beforeEach(() => {
  localStorage.setItem('arda.language', 'de');
});

describe('SignInForm', () => {
  it('sends a link that returns into the app in the chosen language, then signs in with the code', async () => {
    const { client, calls } = fakeApi({
      '/api/v1/auth/sign-in/magic-link': Response.json({ status: true }),
      '/api/v1/auth/sign-in/email-otp': Response.json({ ok: true }),
    });
    const signedIn = vi.fn();
    render(
      <Providers client={client}>
        <SignInForm returnTo="//evil.example" onSignedIn={signedIn} />
      </Providers>
    );
    await userEvent.type(screen.getByLabelText('E-Mail-Adresse'), 'amina@example.org');
    await userEvent.click(screen.getByRole('button', { name: 'Link senden' }));
    expect(await screen.findByRole('status')).toHaveTextContent('amina@example.org');
    // A foreign return address is never sent; the mail follows the page's language.
    expect(calls.find((c) => c.path.endsWith('magic-link'))?.body).toEqual({
      email: 'amina@example.org',
      callbackURL: '/',
      errorCallbackURL: '/anmelden?fehler=link',
      metadata: { language: 'de' },
    });

    await userEvent.type(screen.getByLabelText('Anmeldecode'), '123 456');
    await userEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect(calls.find((c) => c.path.endsWith('email-otp'))?.body).toEqual({
      email: 'amina@example.org',
      otp: '123456',
    });
    expect(signedIn).toHaveBeenCalledOnce();
  });

  it('shows the reason in the reader’s language when the code is wrong', async () => {
    localStorage.setItem('arda.language', 'fr');
    const { client } = fakeApi({
      '/api/v1/auth/sign-in/magic-link': Response.json({ status: true }),
      '/api/v1/auth/sign-in/email-otp': Response.json(
        { code: 'INVALID_OTP' },
        { status: 400 }
      ),
    });
    render(
      <Providers client={client}>
        <SignInForm />
      </Providers>
    );
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'a@example.org');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }));
    await userEvent.type(await screen.findByLabelText('Code de connexion'), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByText('Le code n’est pas correct.')).toBeInTheDocument();
  });
});
