/**
 * German: the default and source catalog (ADR-0020). Every other catalog is typed against
 * this one, so a missing message fails the typecheck. Learners are addressed with "du".
 */
import type { PasskeyFailure } from '@/services/passkeys';
import type { RuleFamily } from '@/tajweed/rules';

export type RemarkId =
  'ghunnaShort' | 'ghunnaLong' | 'nunTooClear' | 'qalqalaMissing' | 'maddShort' | 'good';

export const de = {
  nav: {
    brand: 'ʿArḍa',
    label: 'Hauptnavigation',
    today: 'Heute',
    path: 'Pfad',
    mushaf: 'Muṣḥaf',
    lab: 'Labor',
    sheikh: 'Sheikh',
  },
  language: {
    label: 'Sprache',
  },
  today: {
    eyebrow: 'Heute',
    greeting: (name: string | null) =>
      name ? `Assalāmu ʿalaikum, ${name}` : 'Assalāmu ʿalaikum',
    account: 'Konto',
    signIn: 'Anmelden',
    offline: 'Offline – du lernst weiter, dein Sheikh sieht es beim nächsten Verbinden.',
    fromSheikh: 'Von meinem Sheikh',
    noTasks: 'Noch keine Aufgaben',
    noTasksHint:
      'Sobald er dir eine Stelle im Muṣḥaf markiert, steht sie hier ganz oben – mit Termin.',
    connect: 'Verbinde dich mit deinem Sheikh',
    connectHint: 'Melde dich an und tritt seiner Ḥalaqa per Link oder QR-Code bei.',
    nextUnit: 'Weiter auf dem Pfad · Einheit 2',
    iqlabTitle: 'Iqlāb – Nūn wird zu Mīm vor Bāʾ',
    iqlabSteps: [
      'Erkenne Nūn sākina oder Tanwīn vor ب',
      'Wandle das „n“ in ein „m“ um',
      'Lippen schließen, Ghunna 2 Zählzeiten halten',
      'Lippen öffnen und das Bāʾ sprechen',
    ],
    legend: 'Farben im Muṣḥaf',
  },
  rules: {
    ghunna: { name: 'Ghunna', hint: 'Nasenklang, 2 Zählzeiten (Ikhfāʾ, Idghām, Iqlāb)' },
    qalqala: { name: 'Qalqala', hint: 'Rückprall bei ق ط ب ج د mit Sukūn' },
    silent: { name: 'Stumm', hint: 'geschrieben, nicht gesprochen' },
    'madd-2': { name: 'Madd 2', hint: 'natürliche Dehnung, 2 Zählzeiten' },
    'madd-4': { name: 'Madd 4–5', hint: 'verbundene oder getrennte Dehnung' },
    'madd-6': { name: 'Madd 6', hint: 'notwendige Dehnung, 6 Zählzeiten' },
  } as Record<RuleFamily, { name: string; hint: string }>,
  signIn: {
    eyebrow: 'Anmelden',
    title: 'Willkommen bei ʿArḍa',
    intro:
      'Melde dich an, damit dein Sheikh deine Rezitationen hört und dir Aufgaben gibt. Ohne Passwort: wir schicken dir einen Link und einen Code.',
    linkFailed:
      'Der Link ist abgelaufen oder wurde schon benutzt. Fordere einfach einen neuen an.',
    email: 'E-Mail-Adresse',
    emailPlaceholder: 'du@example.com',
    sendLink: 'Link senden',
    sentTo: (email: string) => `✓ Link gesendet an ${email}`,
    sentHint:
      'Öffne die E-Mail auf diesem Gerät und tippe auf „Bei ʿArḍa anmelden“. Link und Code gelten 15 Minuten. Nichts angekommen? Schau auch im Spam-Ordner nach.',
    codeLabel:
      'Öffnet deine Mail-App den Link in ihrem eigenen Browser? Dann gib hier den 6-stelligen Code aus der Mail ein:',
    code: 'Anmeldecode',
    confirm: 'Anmelden',
    resend: 'Nochmal senden',
    otherEmail: 'Andere E-Mail-Adresse',
    sendFailed: 'Der Anmeldelink konnte nicht gesendet werden.',
    signInFailed: 'Die Anmeldung hat nicht geklappt.',
    passkey: 'Mit Passkey anmelden',
  },
  account: {
    eyebrow: 'Konto',
    roles: { student: 'Schüler·in', teacher: 'Sheikh / Lehrer·in', admin: 'Admin' },
    devices: 'Angemeldete Geräte',
    unknownDevice: 'Unbekanntes Gerät',
    thisDevice: 'dieses Gerät',
    endOthers: 'Andere Geräte abmelden',
    endedOthers: (count: number) =>
      count === 1 ? '1 anderes Gerät abgemeldet.' : `${count} andere Geräte abgemeldet.`,
    addPasskey: 'Passkey hinzufügen',
    passkeyAdded: 'Passkey hinzugefügt.',
    signOut: 'Abmelden',
    languageHint:
      'In dieser Sprache siehst du die App, bekommst Mails und liest die Rückmeldungen deines Sheikhs.',
  },
  passkey: {
    'already-added': 'Auf diesem Gerät ist schon ein Passkey für ʿArḍa eingerichtet.',
    'stale-session':
      'Zur Sicherheit: Melde dich kurz neu an (Link oder Code), dann kannst du einen Passkey hinzufügen.',
    'unknown-passkey':
      'Dieser Passkey ist bei ʿArḍa nicht (mehr) hinterlegt. Melde dich mit Link oder Code an.',
    'not-verified':
      'Bitte bestätige mit Gesicht, Fingerabdruck oder der PIN deines Geräts.',
    'rate-limited': 'Zu viele Versuche – bitte in ein paar Minuten noch einmal.',
    offline: 'Keine Verbindung – versuch es gleich noch einmal.',
    failed: 'Das hat nicht geklappt. Versuch es noch einmal oder nimm Link oder Code.',
  } as Record<Exclude<PasskeyFailure, 'cancelled'>, string>,
  errors: {
    offline: 'Keine Verbindung.',
    unauthorized: 'Bitte melde dich an.',
    forbidden: 'Dafür fehlt die Berechtigung.',
    not_found: 'Nicht gefunden.',
    invalid_body: 'Die Eingabe ist ungültig.',
    invalid_redirect: 'Ungültige Rücksprungadresse.',
    cross_origin: 'Diese Anfrage kam von einer anderen Seite.',
    INVALID_OTP: 'Der Code stimmt nicht.',
    OTP_EXPIRED: 'Der Code ist abgelaufen – fordere einen neuen Link an.',
    TOO_MANY_ATTEMPTS: 'Zu viele falsche Versuche – fordere einen neuen Link an.',
    generic: (status: number) => `Serverfehler (${status}).`,
  },
  remarks: {
    ghunnaShort: 'Ghunna zu kurz – halte sie 2 Zählzeiten.',
    ghunnaLong: 'Ghunna zu lang – nur 2 Zählzeiten.',
    nunTooClear: 'Nūn zu klar – hier wird es verborgen (Ikhfāʾ).',
    qalqalaMissing: 'Qalqala fehlt – lass den Laut kurz zurückprallen.',
    maddShort: 'Madd zu kurz – dehne länger.',
    good: 'Gut so, behalte es.',
  } as Record<RemarkId, string>,
  feedback: {
    eyebrow: 'Für den Sheikh',
    title: 'Rückmeldung in der Sprache deiner Schüler',
    intro:
      'Schreib in deiner Sprache. Jede·r Schüler·in liest Schnellbewertungen in der eigenen Sprache; freien Text übersetzt ʿArḍa – Tajwīd-Begriffe und Āyāt bleiben unverändert.',
    quick: 'Schnellbewertungen',
    write: 'Eigene Rückmeldung',
    from: 'Ich schreibe auf',
    to: 'Schüler·in liest auf',
    placeholder: 'z. B. Your ghunna on “min sharri” was too short.',
    preview: 'So liest es dein·e Schüler·in',
    translate: 'Übersetzung ansehen',
    machine: 'maschinell übersetzt',
    original: 'Original',
    sameLanguage: 'Gleiche Sprache – keine Übersetzung nötig.',
    unavailable: {
      not_configured: 'Übersetzung ist auf diesem Server nicht eingerichtet.',
      limit: 'Tageslimit für Übersetzungen erreicht – morgen geht es weiter.',
      refused: 'Übersetzung nicht verfügbar. Dein·e Schüler·in bekommt das Original.',
      failed: 'Übersetzung gerade nicht möglich. Dein·e Schüler·in bekommt das Original.',
    },
  },
  soon: {
    eyebrow: 'In Arbeit',
    notFound: { title: 'Nicht gefunden', text: 'Diese Seite gibt es nicht.' },
    path: {
      title: 'Der Pfad',
      text: 'Acht Einheiten vom Buchstaben bis zur Riwāya. Einheit 2 (Nūn sākina und Tanwīn) entsteht zuerst, aus dem Blatt deines Sheikhs.',
    },
    mushaf: {
      title: 'Der Muṣḥaf',
      text: 'Der IndoPak-Muṣḥaf mit Tajwīd-Farben: tippe auf einen Buchstaben, hör den Rezitator Wort für Wort, langsam und in Schleife.',
    },
    lab: {
      title: 'Das Buchstaben-Labor',
      text: 'Woher der Laut kommt: die Makhārij, gezeichnet und animiert, von deinem Sheikh geprüft.',
    },
    sheikh: {
      title: 'Mein Sheikh',
      text: 'Deine Ḥalaqa, seine Aufgaben auf der Seite, deine Rezitationen in seiner Hörliste und das ʿArḍ-Buch.',
    },
  },
};

export type Messages = typeof de;
