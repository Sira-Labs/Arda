/**
 * Sends the sign-in emails. SMTP in every real environment: the Google Workspace SMTP relay
 * (smtp-relay.gmail.com, like Tabayyun), which accepts the server by its IP address and/or SMTP
 * credentials; outside prod the link may instead be written to the log, so a developer can
 * sign in without a mail account.
 */
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';
import { DEFAULT_LANGUAGE, type Language } from '../i18n/languages.js';

export interface Mailer {
  /**
   * The sign-in mail in the person's language: the link, and the same sign-in as a six-digit
   * code for another browser (a mail app's built-in browser keeps the session to itself).
   */
  sendMagicLink(
    email: string,
    url: string,
    code: string,
    language?: Language
  ): Promise<void>;
}

export interface SmtpSettings {
  host: string;
  port: number;
  /** Optional: the Workspace relay can allow the server by IP address alone. */
  auth: { user: string; password: string } | undefined;
  from: string;
  /** Name the server greets with (EHLO); Google's relay rejects container names. */
  clientName: string | undefined;
}

/** The words of the sign-in mail per language (ADR-0020); the person is addressed informally. */
const MAIL_TEXT: Record<
  Language,
  {
    subject: string;
    greeting: string;
    intro: string;
    button: string;
    code: string;
    codeHint: string;
    validity: string;
    ignore: string;
  }
> = {
  de: {
    subject: 'Dein Anmeldelink für ʿArḍa',
    greeting: 'Assalamu alaikum,',
    intro: 'mit diesem Link meldest du dich bei ʿArḍa an:',
    button: 'Bei ʿArḍa anmelden',
    code: 'Oder gib diesen Code auf der Anmeldeseite ein:',
    codeHint: 'praktisch, wenn deine Mail-App den Link nicht in deinem Browser öffnet',
    validity: 'Link und Code sind 15 Minuten gültig und funktionieren nur einmal.',
    ignore: 'Wenn du dich nicht anmelden wolltest, kannst du diese Mail ignorieren.',
  },
  en: {
    subject: 'Your sign-in link for ʿArḍa',
    greeting: 'Assalamu alaikum,',
    intro: 'use this link to sign in to ʿArḍa:',
    button: 'Sign in to ʿArḍa',
    code: 'Or enter this code on the sign-in page:',
    codeHint: 'handy if your mail app does not open the link in your browser',
    validity: 'The link and the code are valid for 15 minutes and work only once.',
    ignore: 'If you did not want to sign in, you can ignore this email.',
  },
  fr: {
    subject: 'Ton lien de connexion à ʿArḍa',
    greeting: 'Assalamu alaikum,',
    intro: 'avec ce lien, tu te connectes à ʿArḍa :',
    button: 'Se connecter à ʿArḍa',
    code: 'Ou saisis ce code sur la page de connexion :',
    codeHint:
      'pratique si ton application de messagerie n’ouvre pas le lien dans ton navigateur',
    validity:
      'Le lien et le code sont valables 15 minutes et ne fonctionnent qu’une seule fois.',
    ignore: 'Si tu n’as pas demandé à te connecter, ignore simplement cet e-mail.',
  },
  ar: {
    subject: 'رابط الدخول إلى العَرْضة',
    greeting: 'السلام عليكم،',
    intro: 'ادخل إلى العَرْضة عبر هذا الرابط:',
    button: 'الدخول إلى العَرْضة',
    code: 'أو أدخل هذا الرمز في صفحة الدخول:',
    codeHint: 'مفيد إذا كان تطبيق البريد لا يفتح الرابط في متصفحك',
    validity: 'الرابط والرمز صالحان لمدة ١٥ دقيقة ويعملان مرة واحدة فقط.',
    ignore: 'إذا لم تطلب الدخول، يمكنك تجاهل هذه الرسالة.',
  },
};

/** Subject and bodies of the sign-in mail in the person's language (German by default). */
export function magicLinkMail(
  url: string,
  code: string,
  language: Language = DEFAULT_LANGUAGE
): {
  subject: string;
  text: string;
  html: string;
} {
  const t = MAIL_TEXT[language];
  const text = [
    t.greeting,
    '',
    t.intro,
    url,
    '',
    `${t.code} ${code}`,
    `(${t.codeHint})`,
    '',
    t.validity,
    t.ignore,
  ].join('\n');
  const safe = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const html = `<div dir="${dir}" lang="${language}">
<p>${t.greeting}</p>
<p>${t.intro}</p>
<p><a href="${safe}" style="display:inline-block;padding:12px 20px;background:#1f7a6d;color:#fff;border-radius:8px;text-decoration:none">${t.button}</a></p>
<p>${t.code} (${t.codeHint})</p>
<p dir="ltr" style="font-size:28px;font-weight:700;letter-spacing:6px;font-family:monospace">${code.replace(/\D/g, '')}</p>
<p style="color:#555">${t.validity} ${t.ignore}</p>
</div>`;
  return { subject: t.subject, text, html };
}

/**
 * Seconds to wait for the SMTP server. The sign-in request waits for the mail, and the proxy in
 * front gives up after 60 s; a blocked port must fail fast and visibly, not as a gateway timeout.
 */
export const SMTP_TIMEOUT_MS = { connection: 10_000, greeting: 10_000, socket: 20_000 };

export interface MailLog {
  error(obj: object, msg: string): void;
}

export class SmtpMailer implements Mailer {
  private readonly transport: Transporter;

  constructor(
    private readonly settings: SmtpSettings,
    private readonly log?: MailLog
  ) {
    const implicitTls = settings.port === 465;
    this.transport = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      // 465 is implicit TLS; other ports must upgrade with STARTTLS, never send in clear.
      secure: implicitTls,
      requireTLS: !implicitTls,
      name: settings.clientName,
      connectionTimeout: SMTP_TIMEOUT_MS.connection,
      greetingTimeout: SMTP_TIMEOUT_MS.greeting,
      socketTimeout: SMTP_TIMEOUT_MS.socket,
      auth: settings.auth
        ? { user: settings.auth.user, pass: settings.auth.password }
        : undefined,
    });
  }

  async sendMagicLink(
    email: string,
    url: string,
    code: string,
    language?: Language
  ): Promise<void> {
    try {
      await this.transport.sendMail({
        from: this.settings.from,
        to: email,
        ...magicLinkMail(url, code, language),
      });
    } catch (error) {
      // Never log the link or the address: host, port and the SMTP answer are enough to act on.
      const { code, responseCode, message } = error as {
        code?: string;
        responseCode?: number;
        message?: string;
      };
      this.log?.error(
        {
          host: this.settings.host,
          port: this.settings.port,
          code,
          responseCode,
          message,
        },
        'mail.send_failed'
      );
      throw error;
    }
  }
}

/** Development only: the link goes to the log instead of a mailbox. */
export class LogMailer implements Mailer {
  constructor(private readonly log: { warn(obj: object, msg: string): void }) {}

  async sendMagicLink(
    email: string,
    url: string,
    code: string,
    language?: Language
  ): Promise<void> {
    this.log.warn({ email, url, code, language }, 'auth.magic_link_logged');
  }
}

/**
 * Browser tests only (never in prod, enforced by the config): the latest link per address is
 * written to `<dir>/<email>.txt` (link, code and mail language on lines 1–3), where the
 * end-to-end tests pick it up.
 */
export class FileMailer implements Mailer {
  constructor(private readonly dir: string) {}

  async sendMagicLink(
    email: string,
    url: string,
    code: string,
    language?: Language
  ): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const name = email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
    // Written aside and renamed, so a reader never sees a half-written (or empty) file.
    const target = join(this.dir, `${name}.txt`);
    const temp = `${target}.${process.pid}.tmp`;
    await writeFile(temp, `${url}\n${code}\n${language ?? ''}\n`, 'utf8');
    await rename(temp, target);
  }
}
