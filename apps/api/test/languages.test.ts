import { describe, expect, it } from 'vitest';
import { fromAcceptLanguage, isLanguage } from '../src/i18n/languages.js';
import { magicLinkMail } from '../src/auth/mailer.js';

describe('languages (ADR-0020)', () => {
  it('knows exactly de, en, fr and ar', () => {
    for (const l of ['de', 'en', 'fr', 'ar']) expect(isLanguage(l)).toBe(true);
    for (const l of ['DE', 'tr', '', null, 3]) expect(isLanguage(l)).toBe(false);
  });

  it('picks the best supported language of an Accept-Language header', () => {
    expect(fromAcceptLanguage('fr-CH,fr;q=0.9,en;q=0.8')).toBe('fr');
    expect(fromAcceptLanguage('tr-TR,tr;q=0.9,ar;q=0.5,en;q=0.7')).toBe('en');
    expect(fromAcceptLanguage('ar-SA')).toBe('ar');
    expect(fromAcceptLanguage('en;q=0, de')).toBe('de');
    expect(fromAcceptLanguage('tr, ja')).toBeNull();
    expect(fromAcceptLanguage(undefined)).toBeNull();
  });
});

describe('sign-in mail per language', () => {
  const url = 'https://arda.example.org/api/v1/auth/magic-link/verify?token=t';

  it('writes every language with the link and the code', () => {
    const subjects = new Set<string>();
    for (const language of ['de', 'en', 'fr', 'ar'] as const) {
      const mail = magicLinkMail(url, '123456', language);
      subjects.add(mail.subject);
      expect(mail.text).toContain(url);
      expect(mail.text).toContain('123456');
      expect(mail.html).toContain(`lang="${language}"`);
    }
    expect(subjects.size).toBe(4);
  });

  it('turns the Arabic mail right to left but keeps the code left to right', () => {
    const mail = magicLinkMail(url, '123456', 'ar');
    expect(mail.subject).toBe('رابط الدخول إلى العَرْضة');
    expect(mail.html).toMatch(/^<div dir="rtl"/);
    expect(mail.html).toContain('<p dir="ltr"');
  });

  it('defaults to German', () => {
    expect(magicLinkMail(url, '1').subject).toBe('Dein Anmeldelink für ʿArḍa');
  });
});
