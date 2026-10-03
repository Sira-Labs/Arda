/**
 * German: the default and source catalog (ADR-0020). Every other catalog is typed against
 * this one, so a missing message fails the typecheck. Learners are addressed with "du".
 */
import type { PasskeyFailure } from '@/services/passkeys';
import type { RuleCase, Unit2Card } from '@/content/unit2';
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
    openCard: 'Zur Regelkarte',
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
  path: {
    eyebrow: 'Pfad',
    unitTitle: 'Einheit 2 · Nūn sākina und Tanwīn',
    intro:
      'Der Buchstabe nach Nūn sākina oder Tanwīn entscheidet, wie du es sprichst: 28 Buchstaben, vier Regeln – 6 + 6 + 1 + 15.',
    letters: (count: number) => (count === 1 ? '1 Buchstabe' : `${count} Buchstaben`),
    next: 'Einheit 3 (Ghunna und Mīm sākina) und Einheit 4 (Qalqala) folgen, ebenfalls aus dem Blatt deines Sheikhs.',
  },
  ruleCard: {
    eyebrow: 'Einheit 2 · Verstehen',
    close: 'Schließen',
    progress: (index: number, total: number) => `Karte ${index} von ${total}`,
    draft: 'Entwurf',
    draftHint: 'Noch nicht von deinem Sheikh geprüft.',
    letters: 'Wenn einer dieser Buchstaben folgt',
    examples: 'Beispiele aus deinem Blatt',
    decides: 'entscheidet die Regel',
    followerKey: 'unterstrichen = der Buchstabe, der entscheidet',
    clear: 'ohne Farbe = klar gesprochen',
    colourKey: (colour: string, name: string, hint: string) =>
      `${colour} = ${name}, ${hint}`,
    colours: {
      ghunna: 'grün',
      qalqala: 'blau',
      silent: 'grau',
      'madd-2': 'hellrot',
      'madd-4': 'rot',
      'madd-6': 'dunkelrot',
    } as Record<RuleFamily, string>,
    cases: {
      inside: 'in einem Wort',
      across: 'über zwei Wörter',
      tanwin: 'nach Tanwīn',
    } as Record<RuleCase, string>,
    withGhunna: 'mit Ghunna',
    withoutGhunna: 'ohne Ghunna',
    exceptions: 'Ausnahme: in einem Wort bleibt es klar (Iẓhār)',
    sourcesDiffer: 'Quellen unterscheiden sich',
    sources: {
      iqlabGhunna:
        'Eine Quelle lehrt Iqlāb ohne Ghunna. Wir lehren es mit Ghunna, wie dein Blatt.',
    },
    teacherNote: 'Notiz deines Sheikhs: noch keine.',
    previous: 'Zurück',
    next: 'Weiter',
    done: 'Zur Einheit',
  },
  cards: {
    izhar: {
      title: 'Klar sprechen vor den sechs Kehlbuchstaben',
      steps: [
        'Erkenne Nūn sākina oder Tanwīn.',
        'Folgt einer der sechs Kehlbuchstaben? Dann ist es Iẓhār.',
        'Sprich das Nūn klar: ohne Ghunna, ohne Verschmelzen.',
        'Geh ohne Pause zum Kehlbuchstaben über.',
      ],
      tip: 'Iẓhār ḥalqī heißt es, weil alle sechs Buchstaben aus der Kehle (ḥalq) kommen.',
    },
    idgham: {
      title: 'Nūn verschmilzt mit dem nächsten Wort',
      steps: [
        'Erkenne Nūn sākina oder Tanwīn am Ende eines Wortes.',
        'Beginnt das nächste Wort mit einem der sechs Buchstaben, verschmilzt das Nūn mit ihm.',
        'Bei Yanmū bleibt eine Ghunna von 2 Zählzeiten, bei Lām und Rāʾ fällt sie weg.',
        'Nur über zwei Wörter: in einem Wort bleibt es klar (siehe Ausnahme).',
      ],
      tip: 'Merkwort: yarmalūn – seine Buchstaben sind die sechs.',
    },
    iqlab: {
      title: 'Nūn wird zu Mīm vor Bāʾ',
      steps: [
        'Erkenne Nūn sākina oder Tanwīn vor Bāʾ',
        'Wandle das „n“ in ein „m“ um',
        'Lippen schließen, Ghunna 2 Zählzeiten halten',
        'Lippen öffnen und das Bāʾ sprechen',
      ],
      tip: 'Im Muṣḥaf steht oft ein kleines Mīm über dem Nūn oder Tanwīn.',
    },
    ikhfa: {
      title: 'Nūn wird verborgen, mit Ghunna',
      steps: [
        'Erkenne Nūn sākina oder Tanwīn vor einem der 15 Buchstaben.',
        'Die Zunge stößt nicht an: das Nūn wird verborgen, nicht gesprochen.',
        'Halte die Ghunna 2 Zählzeiten, den Mund schon bereit für den nächsten Buchstaben.',
        'Dann sprich den Buchstaben.',
      ],
      tip: 'Merkhilfe: die Anfangsbuchstaben von „ṣif dhā thanā kam jāda shakhṣun qad samā / dum ṭayyiban zid fī tuqan ḍaʿ ẓālimā“.',
    },
  } as Record<Unit2Card, { title: string; steps: string[]; tip: string }>,
  games: {
    eyebrow: 'Einheit 2 · Üben',
    practise: 'Üben',
    progress: (index: number, total: number) => `${index} / ${total}`,
    seconds: (seconds: number) => `${seconds.toLocaleString('de-DE')} s`,
    options: 'Regeln',
    whichRule: {
      title: 'Welche Regel?',
      intro:
        'Zehn echte Wörter aus deinem Blatt: Schau auf den Buchstaben nach Nūn sākina oder Tanwīn.',
      question: 'Welche Regel gilt für das markierte Nūn oder Tanwīn?',
    },
    sort: {
      title: 'Sortiere die 28',
      intro:
        'Jeder Buchstabe gehört zu genau einer Regel. Wie schnell schaffst du alle 28?',
      question: 'Nūn sākina vor diesem Buchstaben – welche Regel?',
      best: (seconds: number) => `Bestzeit: ${seconds.toLocaleString('de-DE')} s`,
      newBest: 'Neue Bestzeit!',
    },
    review: {
      title: 'Wiederholen',
      intro: 'Was du verwechselt hast, kommt wieder – bis es sitzt.',
      none: 'Gerade ist nichts fällig. Gut so!',
      open: (count: number) =>
        count === 1 ? '1 Karte wiederholen' : `${count} Karten wiederholen`,
    },
    good: 'gut',
    check: 'prüfen',
    rightAnswer: 'Richtig ist',
    follows: 'es folgt',
    insideWord: 'in einem Wort, die Ausnahme',
    toReview: 'Kommt in deine Wiederholung.',
    next: 'Weiter',
    finish: 'Auswerten',
    score: (right: number, total: number) => `${right} von ${total} richtig`,
    newCards: (count: number) =>
      count === 0
        ? 'Keine neuen Karten zum Wiederholen.'
        : count === 1
          ? '1 Karte kommt in deine Wiederholung.'
          : `${count} Karten kommen in deine Wiederholung.`,
    again: 'Nochmal',
    back: 'Zur Einheit',
  },
  halaqa: {
    mine: 'Meine Ḥalaqāt',
    none: 'Du bist noch in keiner Ḥalaqa. Bitte deinen Sheikh um den Einladungslink oder zeig ihm diese Seite.',
    noneTeacher: 'Du hast noch keine Ḥalaqa geöffnet.',
    teacherOf: (name: string | null) => (name ? `bei ${name}` : 'bei deinem Sheikh'),
    waiting: 'wartet auf Bestätigung',
    oneToOne: 'Einzelunterricht',
    students: (count: number) =>
      count === 1 ? '1 Schüler·in' : `${count} Schüler·innen`,
    pending: (count: number) => (count === 1 ? '1 wartet' : `${count} warten`),
    create: {
      title: 'Neue Ḥalaqa',
      name: 'Name',
      placeholder: 'z. B. Juzʾ ʿAmma, dienstags',
      oneToOne: 'Einzelunterricht (genau ein·e Schüler·in)',
      submit: 'Ḥalaqa öffnen',
    },
    invite: {
      title: 'Einladen',
      hint: 'Teile den Link oder zeig den QR-Code. Wer beitritt, wartet, bis du bestätigst.',
      create: 'Einladungslink erstellen',
      renew: 'Neuen Link erstellen',
      validUntil: (date: string) => `Gilt bis ${date}. Ein neuer Link ersetzt diesen.`,
      hidden: (date: string) =>
        `Ein Link ist aktiv bis ${date}. Er wird nur beim Erstellen gezeigt; ein neuer Link ersetzt ihn.`,
      copy: 'Link kopieren',
      copied: 'Link kopiert.',
      share: 'Teilen',
      revoke: 'Link zurückziehen',
      revoked: 'Der Link funktioniert nicht mehr.',
      qr: 'QR-Code zum Beitreten',
    },
    waitingTitle: 'Warten auf Bestätigung',
    approve: 'Annehmen',
    reject: 'Ablehnen',
    membersTitle: 'Schüler·innen',
    remove: 'Entfernen',
    noMembers: 'Noch niemand dabei. Teile den Einladungslink.',
    leave: 'Ḥalaqa verlassen',
    retry: 'Nochmal versuchen',
    back: 'Zu meinen Ḥalaqāt',
    join: {
      eyebrow: 'Einladung',
      title: (name: string) => `Ḥalaqa „${name}“`,
      signIn: 'Melde dich an, um beizutreten. Danach geht es hier weiter.',
      confirm: 'Beitreten',
      pending:
        'Angefragt. Sobald dein Sheikh dich bestätigt, siehst du die Ḥalaqa und seine Aufgaben.',
      active: 'Du bist schon in dieser Ḥalaqa.',
      missing: 'Öffne den Einladungslink deines Sheikhs oder scanne seinen QR-Code.',
    },
  },
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
    invite_invalid:
      'Dieser Link ist abgelaufen oder ungültig. Bitte deinen Sheikh um einen neuen.',
    halaqa_full: 'Diese Einzel-Ḥalaqa hat schon eine·n Schüler·in.',
    too_many_halaqat: 'Du hast die Höchstzahl an Ḥalaqāt erreicht.',
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
