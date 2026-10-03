import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SignInForm } from '@/modules/account/SignInForm';
import { AuthClient } from '@/services/auth';
import { SessionProvider } from '@/state/session';

function setup(answers: Record<string, Response>) {
  const calls: { path: string; body: unknown }[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    calls.push({ path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return (
      answers[path]?.clone() ?? Response.json({ error: 'unauthorized' }, { status: 401 })
    );
  }) as unknown as typeof fetch;
  const client = new AuthClient(fetchImpl);
  return { client, calls };
}

describe('SignInForm', () => {
  it('sends a link that returns into the app, then signs in with the code', async () => {
    const { client, calls } = setup({
      '/api/v1/auth/sign-in/magic-link': Response.json({ status: true }),
      '/api/v1/auth/sign-in/email-otp': Response.json({ ok: true }),
    });
    const signedIn = vi.fn();
    render(
      <SessionProvider client={client}>
        <SignInForm returnTo="//evil.example" onSignedIn={signedIn} />
      </SessionProvider>
    );
    await userEvent.type(screen.getByLabelText('E-Mail-Adresse'), 'amina@example.org');
    await userEvent.click(screen.getByRole('button', { name: 'Link senden' }));
    expect(await screen.findByRole('status')).toHaveTextContent('amina@example.org');
    // A foreign return address is never sent; the server would refuse it anyway.
    expect(calls.find((c) => c.path.endsWith('magic-link'))?.body).toMatchObject({
      email: 'amina@example.org',
      callbackURL: '/',
    });

    await userEvent.type(screen.getByLabelText('Anmeldecode'), '123 456');
    await userEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect(calls.find((c) => c.path.endsWith('email-otp'))?.body).toEqual({
      email: 'amina@example.org',
      otp: '123456',
    });
    expect(signedIn).toHaveBeenCalledOnce();
  });

  it('shows the reason when the code is wrong', async () => {
    const { client } = setup({
      '/api/v1/auth/sign-in/magic-link': Response.json({ status: true }),
      '/api/v1/auth/sign-in/email-otp': Response.json(
        { code: 'INVALID_OTP' },
        { status: 400 }
      ),
    });
    render(
      <SessionProvider client={client}>
        <SignInForm />
      </SessionProvider>
    );
    await userEvent.type(screen.getByLabelText('E-Mail-Adresse'), 'a@example.org');
    await userEvent.click(screen.getByRole('button', { name: 'Link senden' }));
    await userEvent.type(await screen.findByLabelText('Anmeldecode'), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect(await screen.findByText('Der Code stimmt nicht.')).toBeInTheDocument();
  });
});
