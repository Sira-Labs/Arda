import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { FeedbackComposer } from '@/modules/sheikh/FeedbackComposer';
import { fakeApi, Providers } from './render';

const TEACHER = {
  id: 't',
  email: 'sheikh@example.org',
  name: null,
  role: 'teacher' as const,
  timeZone: null,
  language: 'en' as const,
};

beforeEach(() => {
  localStorage.setItem('arda.language', 'en');
});

describe('FeedbackComposer (ADR-0020)', () => {
  it('shows a quick remark in the student’s language without asking the server', async () => {
    const { client, calls } = fakeApi({}, TEACHER);
    render(
      <Providers client={client}>
        <FeedbackComposer />
      </Providers>
    );
    await userEvent.selectOptions(screen.getByLabelText('Student reads in'), 'de');
    await userEvent.click(
      screen.getByRole('button', { name: 'Ghunna too short – hold it for 2 counts.' })
    );
    expect(
      screen.getByText('Ghunna zu kurz – halte sie 2 Zählzeiten.')
    ).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Student reads in'), 'ar');
    const arabic = screen.getByText('الغنة قصيرة – أمسكها حركتين.');
    expect(arabic).toHaveAttribute('dir', 'rtl');
    expect(calls.some((c) => c.path === '/api/v1/translations')).toBe(false);
  });

  it('translates written feedback, labels it as machine-translated and keeps the original', async () => {
    const { client, calls } = fakeApi(
      {
        '/api/v1/translations': Response.json({
          status: 'translated',
          text: 'Deine Ghunna auf „min sharri“ war zu kurz.',
          model: 'claude-opus-5-5',
          cached: false,
        }),
      },
      TEACHER
    );
    render(
      <Providers client={client}>
        <FeedbackComposer />
      </Providers>
    );
    await userEvent.selectOptions(screen.getByLabelText('Student reads in'), 'de');
    await userEvent.type(
      screen.getByLabelText('Your own feedback'),
      'Your ghunna on “min sharri” was too short.'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Show translation' }));
    expect(
      await screen.findByText('Deine Ghunna auf „min sharri“ war zu kurz.')
    ).toBeInTheDocument();
    expect(screen.getByText('machine-translated')).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/api/v1/translations')?.body).toEqual({
      text: 'Your ghunna on “min sharri” was too short.',
      from: 'en',
      to: 'de',
    });
  });

  it('says when translation is unavailable and that the student gets the original', async () => {
    const { client } = fakeApi(
      {
        '/api/v1/translations': Response.json({ status: 'unavailable', reason: 'limit' }),
      },
      TEACHER
    );
    render(
      <Providers client={client}>
        <FeedbackComposer />
      </Providers>
    );
    await userEvent.type(screen.getByLabelText('Your own feedback'), 'Hold it longer.');
    await userEvent.click(screen.getByRole('button', { name: 'Show translation' }));
    expect(
      await screen.findByText('Daily translation limit reached – it continues tomorrow.')
    ).toBeInTheDocument();
  });
});
