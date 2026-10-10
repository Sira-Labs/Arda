/**
 * German: the default and source catalog (ADR-0020). Every other catalog is typed against
 * this one, so a missing message fails the typecheck. Learners are addressed with "du".
 */
import type { PasskeyFailure } from '@/services/passkeys';
import type { CardId, RuleCase } from '@/content/units';
import type { RuleFamily, RuleId } from '@/tajweed/rules';
import type { AssignmentKind } from '@/services/auth';
import type { PageLayout } from '@arda/quran';
import type { Area, Point, Sifa } from '@/modules/lab/letters';
import type { LabLetterId, LabSet, Weight } from '@/modules/lab/types';

/** A letter's texts in the lab (spec F5). */
interface LetterTexts {
  name: string;
  short: string;
  makhraj: string;
  mistakes: string[];
}

export type RemarkId =
  | 'ghunnaShort'
  | 'ghunnaLong'
  | 'nunTooClear'
  | 'qalqalaMissing'
  | 'maddShort'
  | 'sinVoiced'
  | 'zayVoiceless'
  | 'raRolled'
  | 'good';

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
  brand: {
    tagline: 'Rezitieren, gehört werden, korrigiert werden.',
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
    saveProgress: 'Fortschritt sichern',
    saveProgressHint:
      'Du kannst ohne Konto üben. Melde dich an, damit dein Fortschritt gespeichert wird und auf all deinen Geräten gleich ist.',
    saveProgressAction: 'Anmelden und sichern',
  },
  engagement: {
    title: 'Dein Fortschritt',
    level: (level: number) => `Level ${level}`,
    xp: (points: number) => `${points} XP`,
    toNext: (left: number) => `noch ${left} XP bis zum nächsten Level`,
    today: (points: number) => `heute +${points} XP`,
    streak: (days: number) => (days === 1 ? '1 Tag in Folge' : `${days} Tage in Folge`),
    streakStart: 'Übe heute – dann beginnt deine Serie.',
    streakToday: 'Heute schon geübt.',
    streakOpen: 'Übe heute, damit deine Serie weitergeht.',
    shields: (count: number) =>
      count === 1 ? '1 Schutzschild' : `${count} Schutzschilde`,
    shieldHint:
      'Alle 7 Übungstage gibt es ein Schutzschild (höchstens 2). Es deckt einen verpassten Tag.',
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
    units: {
      1: {
        title: 'Einheit 1 · Makhārij und Ṣifāt',
        intro:
          'Wo jeder Buchstabe entsteht: fünf Bereiche, siebzehn Stellen, alle 28 Buchstaben im Labor. Am Ende hörst du zehn Wörter quer durch das Labor.',
      },
      2: {
        title: 'Einheit 2 · Nūn sākina und Tanwīn',
        intro:
          'Der Buchstabe nach Nūn sākina oder Tanwīn entscheidet, wie du es sprichst: 28 Buchstaben, vier Regeln – 6 + 6 + 1 + 15.',
      },
      3: {
        title: 'Einheit 3 · Ghunna und Mīm sākina',
        intro:
          'Die Ghunna dauert immer 2 Zählzeiten. Beim Mīm sākina entscheidet der nächste Buchstabe: Bāʾ, Mīm oder alle anderen.',
      },
      4: {
        title: 'Einheit 4 · Qalqala',
        intro: 'Fünf Buchstaben prallen zurück, wenn sie ruhen: ق ط ب ج د – quṭbu jadd.',
      },
    } as Record<1 | 2 | 3 | 4, { title: string; intro: string }>,
    lab: 'Zum Buchstaben-Labor',
    letters: (count: number) => (count === 1 ? '1 Buchstabe' : `${count} Buchstaben`),
    next: 'Einheit 5 (Madd) bis 7 (Waqf) folgen nach dem Pilot.',
  },
  ruleCard: {
    play: (sura: number, aya: number) => `Anhören: Sūra ${sura}, Āya ${aya}`,
    inQuran: 'Im Qurʾān:',
    eyebrow: (unit: number) => `Einheit ${unit} · Verstehen`,
    close: 'Schließen',
    progress: (index: number, total: number) => `Karte ${index} von ${total}`,
    draft: 'Entwurf',
    draftHint: 'Noch nicht von deinem Sheikh geprüft.',
    letters: 'Wenn einer dieser Buchstaben folgt',
    examples: 'Beispiele',
    lettersShadda: 'Diese Buchstaben mit Shadda',
    lettersSukun: 'Diese Buchstaben mit Sukūn',
    allOtherLetters: 'Alle Buchstaben außer Bāʾ und Mīm',
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
    ghunna: {
      title: 'Nūn und Mīm mit Shadda: immer Ghunna',
      steps: [
        'Erkenne ein Nūn oder Mīm mit Shadda (نّ مّ).',
        'Die Ghunna ist ein Nasenklang aus dem Khayshūm: halte sie 2 Zählzeiten.',
        'Prüfe dich: Hältst du die Nase zu, bricht der Klang ab.',
        'Stärke der Ghunna: Shadda → Ikhfāʾ und Iqlāb → Idghām → einfaches Nūn oder Mīm.',
      ],
      tip: 'Die Ghunna gehört zum Nūn und zum Mīm selbst – auch ohne Regel klingt sie leise mit.',
    },
    'ikhfa-shafawi': {
      title: 'Mīm sākina vor Bāʾ: verborgen, mit Ghunna',
      steps: [
        'Erkenne Mīm sākina (مْ) am Wortende.',
        'Beginnt das nächste Wort mit Bāʾ, ist es Ikhfāʾ shafawī.',
        'Schließe die Lippen leicht, ohne zu pressen, und halte die Ghunna 2 Zählzeiten.',
        'Dann öffne in das Bāʾ.',
      ],
      tip: '„Shafawī“ heißt „mit den Lippen“: Mīm und Bāʾ kommen beide von den Lippen.',
    },
    'idgham-shafawi': {
      title: 'Mīm sākina vor Mīm: verschmelzen, mit Ghunna',
      steps: [
        'Erkenne Mīm sākina vor einem Mīm.',
        'Die beiden Mīm verschmelzen zu einem Mīm mit Shadda.',
        'Halte die Ghunna 2 Zählzeiten.',
      ],
      tip: 'Man nennt es auch Idghām mithlayn ṣaghīr: zwei gleiche Buchstaben, der erste ruhend.',
    },
    'izhar-shafawi': {
      title: 'Mīm sākina vor allen anderen Buchstaben: klar',
      steps: [
        'Erkenne Mīm sākina vor einem Buchstaben außer Bāʾ und Mīm.',
        'Sprich das Mīm klar, ohne Ghunna und ohne zu verschmelzen.',
        'Besonders vor Wāw und Fāʾ: schließe die Lippen nicht zu früh und verberge nichts.',
      ],
      tip: 'Iẓhār shafawī gilt vor 26 Buchstaben – allen außer Bāʾ und Mīm.',
    },
    qalqala: {
      title: 'Der Rückprall bei ق ط ب ج د mit Sukūn',
      steps: [
        'Erkenne einen der fünf Buchstaben ق ط ب ج د (quṭbu jadd) mit Sukūn.',
        'Berühre die Artikulationsstelle und löse sie schnell: ein kurzer Rückprall.',
        'Der Rückprall ist kein Vokal: häng kein „a“, „i“ oder „u“ an.',
        'Beim Anhalten am Wortende (z. B. أَحَدْ) ist der Rückprall am stärksten.',
      ],
      tip: 'Merkwort: quṭbu jadd (قُطْبُ جَدٍّ) – seine Buchstaben sind die fünf.',
    },
  } as Record<CardId, { title: string; steps: string[]; tip: string }>,
  games: {
    eyebrow: (unit: number) => `Einheit ${unit} · Üben`,
    practise: 'Üben',
    progress: (index: number, total: number) => `${index} / ${total}`,
    seconds: (seconds: number) => `${seconds.toLocaleString('de-DE')} s`,
    xp: (points: number) => `+${points} XP`,
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
    /** The unit test (ADR-0024). */
    test: {
      title: 'Einheitentest',
      intro: 'Zehn Fragen aus der Einheit. Ab acht richtigen ist sie bestanden.',
      open: 'Test machen',
      passed: 'Bestanden',
      passedNext: (unit: number) => `Bestanden – weiter mit Einheit ${unit}.`,
      passedLast: 'Bestanden – alle Einheiten des Blatts geschafft.',
      passedOpen: (unit: number) =>
        `Bestanden – offen ist noch der Test von Einheit ${unit}.`,
      notYet: (need: number, total: number) =>
        `Noch nicht bestanden: Es braucht ${need} von ${total}. Wiederhole die Karten und versuch es noch einmal.`,
      recommended: (unit: number) => `Empfohlen nach dem Test von Einheit ${unit}.`,
    },
    back: 'Zur Einheit',
    unit3: {
      title: 'Welche Regel? · Einheit 3',
      intro: 'Mīm sākina oder Shadda: zehn Wörter, vier Regeln.',
      question: 'Welche Regel gilt für das markierte Mīm oder Nūn?',
    },
    qalqala: {
      title: 'Qalqala-Buchstaben',
      intro: 'Gehört der Buchstabe zu quṭbu jadd? Alle 28, einer nach dem anderen.',
      question: 'Prallt dieser Buchstabe mit Sukūn zurück?',
      yes: 'Qalqala',
      no: 'keine Qalqala',
      isOne: 'gehört zu quṭbu jadd',
      isNot: 'gehört nicht zu quṭbu jadd',
    },
    shadda: 'Nūn oder Mīm mit Shadda',
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
  assignments: {
    title: 'Aufgaben',
    kinds: {
      learn: 'Lernen',
      read: 'Lesen',
      recite: 'Nochmal rezitieren',
      practise: 'Üben',
    } as Record<AssignmentKind, string>,
    range: (sura: number, from: number, to: number) =>
      from === to ? `Sūra ${sura}, Āya ${from}` : `Sūra ${sura}, Āyāt ${from}–${to}`,
    times: (count: number) => (count === 1 ? 'einmal' : `${count}-mal`),
    rangeWords: (
      sura: number,
      from: number,
      wordFrom: number,
      to: number,
      wordTo: number
    ) =>
      from !== to
        ? `Sūra ${sura}, Āya ${from} Wort ${wordFrom} bis Āya ${to} Wort ${wordTo}`
        : wordFrom === wordTo
          ? `Sūra ${sura}, Āya ${from}, Wort ${wordFrom}`
          : `Sūra ${sura}, Āya ${from}, Wörter ${wordFrom}–${wordTo}`,
    focus: 'Achte auf',
    /** Tells the two idghām rules apart, whose term is the same; `null` for the others. */
    variant: (rule: RuleId): string | null =>
      rule === 'idgham-ghunna'
        ? 'mit Ghunna'
        : rule === 'idgham-no-ghunna'
          ? 'ohne Ghunna'
          : null,
    due: (date: string) => `bis ${date}`,
    dueToday: 'heute fällig',
    overdue: (date: string) => `überfällig seit ${date}`,
    from: (name: string | null, halaqa: string) =>
      name ? `von ${name} · ${halaqa}` : halaqa,
    markDone: 'Erledigt',
    done: 'Erledigt – dein Sheikh sieht es.',
    doneOn: (date: string) => `erledigt am ${date}`,
    undo: 'Doch nicht erledigt',
    openCard: 'Zur Regelkarte',
    play: 'Zum Spiel',
    more: (count: number) =>
      count === 1 ? '1 weitere Aufgabe' : `${count} weitere Aufgaben`,
    none: 'Noch keine Aufgaben in dieser Ḥalaqa.',
    older: 'Ältere zeigen',
    forAll: 'für alle',
    forStudent: (name: string) => `für ${name}`,
    doneCount: (done: number, of: number) => `${done} von ${of} erledigt`,
    doneBy: 'Erledigt von',
    remove: 'Zurückziehen',
    /** Pages of a printed muṣḥaf (ADR-0014 update 2026-10-07). */
    pages: (from: number, to: number) =>
      from === to ? `Seite ${from}` : `Seiten ${from}–${to}`,
    layouts: {
      'indopak-15': 'IndoPak, 15 Zeilen',
      madina: 'Madīna',
    } as Record<PageLayout, string>,
    form: {
      title: 'Aufgabe geben',
      who: 'Für',
      everyone: 'alle Schüler·innen',
      kind: 'Art',
      sura: 'Sūra',
      from: 'von Āya',
      to: 'bis Āya',
      rule: 'Regel',
      noRule: 'keine',
      repetitions: 'Wie oft',
      due: 'Fällig am',
      note: 'Notiz (optional)',
      submit: 'Aufgabe geben',
      given: 'Aufgabe gegeben.',
      by: 'Was',
      byAyat: 'Sūra und Āyāt',
      byPages: 'Seiten',
      layout: 'Muṣḥaf',
      pageFrom: 'von Seite',
      pageTo: 'bis Seite',
      onPages: 'Auf diesen Seiten:',
    },
  },
  mushaf: {
    eyebrow: 'Muṣḥaf',
    packs: {
      'uthmani-hafs-fatiha-baqara': 'al-Fātiḥa und al-Baqara',
      'uthmani-hafs-juz30': 'Juzʾ ʿAmma',
      'indopak-hafs-fatiha-baqara': 'al-Fātiḥa und al-Baqara',
      'indopak-hafs-juz30': 'Juzʾ ʿAmma',
    } as Record<string, string>,
    title: 'Muṣḥaf',
    scriptLabel: 'Schrift',
    scripts: {
      indopak: {
        name: 'IndoPak',
        note: 'IndoPak-Schrift wie im Muṣḥaf deines Sheikhs (15 Zeilen), riwāyat Ḥafṣ.',
      },
      uthmani: {
        name: 'Madīna',
        note: 'ʿUthmānī-Schrift wie im Madīna-Muṣḥaf, riwāyat Ḥafṣ.',
      },
    },
    sura: (number: number) => `Sūra ${number}`,
    ayat: (count: number) => (count === 1 ? '1 Āya' : `${count} Āyāt`),
    loading: 'Der Muṣḥaf wird geladen …',
    saved: 'Offline gespeichert',
    notSaved: 'Nur mit Verbindung: Dieses Gerät kann ihn nicht speichern.',
    failure: {
      offline: 'Öffne den Muṣḥaf einmal mit Verbindung; danach geht er auch offline.',
      checksum: 'Die Muṣḥaf-Daten sind beschädigt angekommen. Lade die Seite bitte neu.',
      invalid: 'Die Muṣḥaf-Daten sind beschädigt angekommen. Lade die Seite bitte neu.',
      missing: 'Diese Sūra ist noch nicht im Muṣḥaf.',
      missingPage: 'Diese Seite ist noch nicht im Muṣḥaf.',
    },
    tap: 'Tippe auf ein Wort, um seine Regeln zu sehen. Wische zum Umblättern; mit zwei Fingern vergrößerst du.',
    colours: 'Tajwīd-Farben',
    player: {
      label: 'Anhören',
      playPage: 'Seite anhören',
      play: 'Abspielen',
      stop: 'Stopp',
      aya: (sura: number, aya: number) =>
        aya === 0 ? `Sūra ${sura} · Basmala` : `Sūra ${sura} · Āya ${aya}`,
      nowPlaying: 'Es läuft',
      pause: 'Anhalten',
      resume: 'Weiter',
      reciter: 'Rezitator',
      speed: 'Tempo',
      loop: 'Wiederholen',
      reciters: {
        'husary-muallim': 'al-Ḥuṣarī · Lehrvortrag (muʿallim)',
        husary: 'al-Ḥuṣarī · murattal',
        maher: 'Māhir al-Muʿayqilī',
      },
      failed: 'Der Vortrag lädt nicht. Prüfe deine Verbindung.',
      sourceAudio: 'Vortrag: EveryAyah.com',
      sourceTimings: 'Wortzeiten: quran-align (Collin Fair), CC BY 4.0',
      sourceQuranicAudio: 'Vortrag Māhir al-Muʿayqilī: QuranicAudio.com',
      sourceQua: 'Wortzeiten Māhir al-Muʿayqilī: Quranic Universal Audio, CC BY 4.0',
    },
    all: 'Alle Sūren',
    previousPage: 'Vorige Seite',
    nextPage: 'Nächste Seite',
    page: (n: number) => `Seite ${n}`,
    /** The page last read in this script, on Today and in the muṣḥaf list. */
    continue: 'Weiterlesen',
    range: (from: number, to: number) =>
      from === to ? `Deine Aufgabe: Āya ${from}` : `Deine Aufgabe: Āyāt ${from}–${to}`,
    word: (sura: number, aya: number, n: number) => `Sūra ${sura}, Āya ${aya}, Wort ${n}`,
    noRule: 'Hier ist keine Regel markiert: klar lesen.',
    follows: (rule: string) => `entscheidet die Regel davor: ${rule}`,
    close: 'Schließen',
    open: 'Im Muṣḥaf öffnen',
    assign: 'Aufgabe hier geben',
    pick: 'Tippe auf das erste und dann auf das letzte Wort der Aufgabe.',
    cancel: 'Abbrechen',
    halaqa: 'Ḥalaqa',
    sources: 'Quellen',
    text: 'Text: Tanzil Project (CC BY 3.0)',
    textIndopak: 'IndoPak-Text: DigitalKhatt (MIT)',
    rules: 'Tajwīd-Regeln: cpfair/quran-tajweed (CC BY 4.0)',
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
  twoFactor: {
    title: 'Zwei-Faktor-Anmeldung',
    intro:
      'Für die Verwaltung brauchst du zusätzlich einen Code aus einer Authenticator-App (z. B. Google Authenticator, Microsoft Authenticator oder 1Password).',
    setUp: 'Einrichten',
    scan: 'Scanne den QR-Code mit deiner Authenticator-App oder gib den Schlüssel von Hand ein.',
    qr: 'QR-Code für die Authenticator-App',
    secret: 'Schlüssel',
    code: 'Sechsstelliger Code',
    confirm: 'Bestätigen',
    confirmNeeded: 'Bestätige diese Sitzung mit einem Code aus deiner Authenticator-App.',
    confirmed: 'Für diese Sitzung bestätigt.',
  },
  admin: {
    eyebrow: 'Verwaltung',
    title: 'Nutzer·innen und Rollen',
    open: 'Zur Verwaltung',
    intro:
      'Hier machst du einen Sheikh zum Lehrer. Er muss sich vorher einmal angemeldet haben. Jede Änderung wird protokolliert.',
    search: 'Suchen (E-Mail oder Name)',
    searchButton: 'Suchen',
    none: 'Niemand gefunden.',
    role: 'Rolle',
    you: 'du',
    blocked: 'gesperrt',
    block: 'Sperren',
    unblock: 'Entsperren',
    saved: (name: string) => `Gespeichert: ${name}`,
    more: 'Weitere laden',
    unverified: 'E-Mail nicht bestätigt',
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
  recite: {
    marksHint: 'Tippe beim Hören die Wörter an, die noch nicht stimmen.',
    marked: 'markiert',
    marksCount: (count: number) =>
      count === 1 ? '1 Wort markiert' : `${count} Wörter markiert`,
    record: 'Aufnehmen',
    title: (sura: number, from: number, to: number) =>
      from === to
        ? `Sūra ${sura} · Āya ${from} aufnehmen`
        : `Sūra ${sura} · Āyāt ${from}–${to} aufnehmen`,
    recordAssignment: 'Aufgabe aufnehmen',
    recordSection: 'Diesen Abschnitt aufnehmen',
    /** One sūra's part of a page assignment that runs across sūras. */
    recordPart: (name: string, from: number, to: number) =>
      `${name} ${from}–${to} aufnehmen`,
    consentTitle: 'Bevor du aufnimmst',
    consentText:
      'Deine Aufnahme hören nur du und die Lehrer der Ḥalaqa, an die du sie schickst. Sie bleibt privat, bis du sie löschst, und wird für nichts anderes verwendet.',
    consentAgree: 'Einverstanden',
    start: 'Aufnahme starten',
    stop: 'Stopp',
    running: (time: string) => `Aufnahme läuft · ${time}`,
    again: 'Nochmal aufnehmen',
    send: 'An meinen Sheikh senden',
    sendTo: 'Senden an',
    sent: 'Gesendet. Dein Sheikh hört sie sich an.',
    queued: 'Gespeichert. Sie wird gesendet, sobald du wieder online bist.',
    noHalaqa:
      'Tritt zuerst der Ḥalaqa deines Sheikhs bei, dann kannst du ihm Aufnahmen schicken.',
    denied:
      'Das Mikrofon ist nicht erlaubt. Erlaube es in den Einstellungen deines Browsers.',
    unsupported: 'Dieser Browser kann nicht aufnehmen.',
    close: 'Schließen',
    pending: (count: number) =>
      count === 1
        ? '1 Aufnahme wartet auf eine Verbindung.'
        : `${count} Aufnahmen warten auf eine Verbindung.`,
    mine: 'Deine Rezitationen',
    waiting: 'wartet auf deinen Sheikh',
    verdicts: { good: 'gut', again: 'nochmal' },
    from: (name: string | null) => (name ? `${name} schreibt:` : 'Dein Sheikh schreibt:'),
    delete: 'Löschen',
    queue: 'Zum Abhören',
    queueEmpty: 'Gerade wartet keine Aufnahme.',
    answered: 'Beantwortet',
    good: 'Gut',
    againVerdict: 'Nochmal',
    remark: 'Kurze Bemerkung',
    noRemark: '– keine –',
    note: 'Eigene Worte (optional)',
    answer: 'Antwort senden',
    change: 'Ändern',
    older: 'Ältere zeigen',
    seconds: (ms: number) => `${Math.max(1, Math.round(ms / 1000))} s`,
    range: (sura: number, from: number, to: number) =>
      from === to ? `Sūra ${sura} · Āya ${from}` : `Sūra ${sura} · Āyāt ${from}–${to}`,
  },
  errors: {
    second_factor_required: 'Bestätige zuerst die Zwei-Faktor-Anmeldung.',
    cannot_change_self: 'Deine eigene Rolle kannst du hier nicht ändern.',
    invalid_code: 'Der Code stimmt nicht.',
    locked: 'Zu viele falsche Codes. Warte 15 Minuten.',
    already_enabled: 'Die Zwei-Faktor-Anmeldung ist schon eingerichtet.',
    not_set_up: 'Richte die Zwei-Faktor-Anmeldung zuerst ein.',
    invalid_query: 'Die Suche ist ungültig.',
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
    too_many_assignments: 'Diese Ḥalaqa hat die Höchstzahl an Aufgaben erreicht.',
    too_many_recordings: 'Du hast die Höchstzahl an Aufnahmen erreicht. Lösche ältere.',
    too_large: 'Die Aufnahme ist zu lang.',
    unsupported_media_type: 'Dieses Aufnahmeformat wird nicht unterstützt.',
    generic: (status: number) => `Serverfehler (${status}).`,
  },
  remarks: {
    ghunnaShort: 'Ghunna zu kurz – halte sie 2 Zählzeiten.',
    ghunnaLong: 'Ghunna zu lang – nur 2 Zählzeiten.',
    nunTooClear: 'Nūn zu klar – hier wird es verborgen (Ikhfāʾ).',
    qalqalaMissing: 'Qalqala fehlt – lass den Laut kurz zurückprallen.',
    maddShort: 'Madd zu kurz – dehne länger.',
    good: 'Gut so, behalte es.',
    sinVoiced:
      'Sīn summt – sprich es stimmlos und scharf, nicht wie das deutsche s in „Sonne“.',
    zayVoiceless: 'Zāy ist stimmhaft – lass es summen, aber dünn.',
    raRolled: 'Rāʾ mit der Zungenspitze, ein leichter Schlag – nicht rollen.',
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
  lab: {
    eyebrow: 'Labor',
    title: 'Buchstaben-Labor',
    intro:
      'Woher kommt ein Laut? Der Kopf zeigt die fünf Bereiche. Wähl einen Buchstaben: Du siehst seine Stelle, hörst echte Wörter und übst den Unterschied.',
    /** The lab's sets of letters, in the order they are taught. */
    sets: {
      first: {
        title: 'Erste Reihe: Sīn, Zāy, Ṣād und Rāʾ',
        hint: 'Die drei Pfeiflaute und das Rāʾ – für Deutschsprachige oft die schwersten.',
      },
      throat: {
        title: 'Die Kehle: Hamza, Hāʾ, ʿAyn, Ḥāʾ, Ghayn und Khāʾ',
        hint: 'Sechs Laute aus der Kehle, von tief nach oben. Im Deutschen gibt es nur das h und den Knacklaut – die anderen lernst du hier neu.',
      },
      tongueBack: {
        title: 'Hinterzunge und Zungenmitte: Qāf, Kāf, Jīm, Shīn und Yāʾ',
        hint: 'Fünf Laute vom Zungenrücken. Qāf und Kāf liegen dicht beieinander – hier lernst du, sie zu trennen.',
      },
      tongueTip: {
        title: 'Ḍād und die Zungenspitze: Ḍād, Ṭāʾ, Dāl und Tāʾ',
        hint: 'Drei Laute von derselben Stelle – schwer, stimmhaft, gehaucht – und Ḍād, den es nur im Arabischen gibt. Hier hörst du, was sie unterscheidet.',
      },
      teeth: {
        title: 'Zähne, Lām und Nūn: Thāʾ, Dhāl, Ẓāʾ, Lām und Nūn',
        hint: 'Drei Laute mit der Zungenspitze an den oberen Schneidezähnen – im Deutschen werden sie leicht zu s und z –, dazu Lām und Nūn vom Zahndamm.',
      },
      lips: {
        title: 'Die Lippen: Fāʾ, Bāʾ, Mīm und Wāw',
        hint: 'Vier Laute von den Lippen, im Deutschen fast alle vertraut. Hier geht es um die Feinheiten: Qalqala, Ghunna und runde Lippen.',
      },
    } as Record<LabSet, { title: string; hint: string }>,
    more: 'Alle 28 Buchstaben sind da. Zeichnung und Texte prüft dein Sheikh noch.',
    draft: 'Entwurf – der Sheikh prüft noch',
    back: 'Zum Labor',
    /** Unit 1's test, heard across the whole lab (ADR-0024). */
    unitTest:
      'Zehn Wörter quer durch das Labor, nur zum Hören. Bei jedem steht, welche Buchstaben in Frage kommen.',
    diagram: {
      title: 'Der Kopf von der Seite',
      description:
        'Seitenansicht des Kopfes mit fünf Bereichen: Jawf (Mundraum), Ḥalq (Kehle), Lisān (Zunge), Shafatān (Lippen) und Khayshūm (Nasenraum).',
      legend: 'Die fünf Bereiche',
      licence: 'Zeichnung: ʿArḍa, CC BY 4.0 – ein Entwurf, dein Sheikh prüft sie noch.',
    },
    areas: {
      jawf: { name: 'Jawf', gloss: 'Mund- und Rachenraum: die Dehnungslaute' },
      halq: { name: 'Ḥalq', gloss: 'Kehle: sechs Buchstaben' },
      lisan: { name: 'Lisān', gloss: 'Zunge: achtzehn Buchstaben' },
      shafatan: { name: 'Shafatān', gloss: 'Lippen: vier Buchstaben' },
      khayshum: { name: 'Khayshūm', gloss: 'Nasenraum: die Ghunna' },
    } as Record<Area, { name: string; gloss: string }>,
    points: {
      whistle: { line1: 'Zungenspitze', line2: 'Schneidezähne' },
      ra: { line1: 'Zungenspitze', line2: 'Zahndamm' },
      halqDeep: { line1: 'Tiefster Teil', line2: 'der Kehle' },
      halqMid: { line1: 'Mitte', line2: 'der Kehle' },
      halqNear: { line1: 'Oberer Teil', line2: 'der Kehle' },
      tongueFar: { line1: 'Hinterste Zunge', line2: 'weicher Gaumen' },
      tongueBack: { line1: 'Hinterzunge,', line2: 'etwas vor Qāf' },
      tongueMid: { line1: 'Zungenmitte', line2: 'harter Gaumen' },
      tongueSide: { line1: 'Zungenrand', line2: 'an Backenzähnen' },
      tongueTip: { line1: 'Zungenspitze', line2: 'Zahnwurzeln' },
      teeth: { line1: 'Zungenspitze', line2: 'Zahnkanten' },
      lam: { line1: 'Zungenrand vorn', line2: 'Zahndamm' },
      nun: { line1: 'Zungenspitze', line2: 'vor dem Lām' },
      lipTeeth: { line1: 'Unterlippe', line2: 'obere Zähne' },
      lips: { line1: 'Beide', line2: 'Lippen' },
    } as Record<Point, { line1: string; line2: string }>,
    letters: {
      sin: {
        name: 'Sīn',
        short: 'leicht, scharf, stimmlos',
        makhraj:
          'Die Zungenspitze liegt an den unteren Schneidezähnen (manche lehren: an den oberen). Zwischen Zunge und oberen Zähnen bleibt ein enger Spalt – durch ihn pfeift die Luft.',
        mistakes: [
          'Im Deutschen wird s vor einem Vokal weich: „Sonne“ klingt wie [z]. So wird aus Sīn schnell Zāy. Halte das Sīn stimmlos und scharf – kein Summen.',
          'Nicht schwer machen: Sīn ist leicht. Hebst du den Zungenrücken, klingt es wie Ṣād.',
          'Nicht lispeln: Die Zunge bleibt hinter den Zähnen. Schaut sie heraus, wird es ein Thāʾ.',
        ],
      },
      zay: {
        name: 'Zāy',
        short: 'leicht, summend',
        makhraj:
          'Wie Sīn und Ṣād: Die Zungenspitze liegt an den unteren Schneidezähnen (manche lehren: an den oberen), ein enger Spalt bleibt offen, die Luft pfeift hindurch.',
        mistakes: [
          'Zāy ist stimmhaft: Leg die Hand an den Hals – du spürst das Summen.',
          'Es bleibt dünn und leicht: nie schwer wie Ṣād und nie wie das deutsche z (ts).',
          'Vor Sukūn und am Wortende nicht stimmlos werden lassen, wie im Deutschen („Haus“). Sonst wird es ein Sīn.',
        ],
      },
      sad: {
        name: 'Ṣād',
        short: 'schwer, voll',
        makhraj:
          'Dieselbe Stelle wie Sīn: die Zungenspitze an den Schneidezähnen, ein enger Spalt. Dazu hebt sich der Zungenrücken zum Gaumen und legt sich breit an ihn.',
        mistakes: [
          'Ṣād ist schwer: Der Zungenrücken hebt sich zum Gaumen (Iṭbāq). Der Klang wird voll und dunkel.',
          'Sīn ist leicht: Der Zungenrücken bleibt unten. Den Unterschied hörst du auch am Vokal danach.',
          'Schwer heißt nicht stimmhaft: Ṣād bleibt stimmlos wie Sīn, ohne Summen.',
        ],
      },
      ra: {
        name: 'Rāʾ',
        short: 'ein leichter Schlag der Zungenspitze',
        makhraj:
          'Die Zungenspitze, mit etwas von ihrem Rücken, tippt an den Zahndamm hinter den oberen Schneidezähnen – ein wenig weiter hinten als beim Nūn.',
        mistakes: [
          'Mit der Zungenspitze, nicht im Rachen: kein deutsches Rachen-R.',
          'Ein einziger leichter Schlag, nicht gerollt. Takrīr lernst du, um es zu vermeiden.',
          'Am Wortende nicht verschlucken wie im deutschen „Vater“: Das Rāʾ wird gesprochen.',
          'Schwer oder leicht hängt am Vokal: mit Fatḥa oder Ḍamma schwer, mit Kasra leicht.',
        ],
      },
      hamza: {
        name: 'Hamza',
        short: 'ein klarer Einsatz der Stimme',
        makhraj:
          'Der tiefste Teil der Kehle, beim Kehlkopf: Die Stimmritze schließt sich kurz und öffnet sich mit einem Ruck – derselbe Ort wie Hāʾ.',
        mistakes: [
          'Du kennst ihn aus dem Deutschen: der Knacklaut in „be-achten“ oder „Spiegel-ei“. Genau so beginnt Hamza – deutlich, nicht verschluckt.',
          'Nicht pressen: Hamza ist ein kurzer, fester Einsatz (Shidda). Gepresst aus der Mitte der Kehle wird es ʿAyn – aus أَلِيمٌ („schmerzhaft“) wird عَلِيمٌ („wissend“).',
          'Auch mitten im Wort und vor Sukūn hörbar machen, nicht übergehen.',
        ],
      },
      ha: {
        name: 'Hāʾ',
        short: 'ein leiser Hauch',
        makhraj:
          'Der tiefste Teil der Kehle, wie bei Hamza: Die Luft strömt offen hindurch, ohne Reibung.',
        mistakes: [
          'Hāʾ ist das deutsche h – aber immer hörbar: auch vor Sukūn und am Wortende, wo das Deutsche es verschluckt („sehen“).',
          'Nicht kratzen oder pressen: Eine enge Kehle macht aus Hāʾ ein Ḥāʾ – aus أُهِلَّ wird أُحِلَّ, ein anderes Wort.',
          'Leise und flüsternd (Hams): kein Summen.',
        ],
      },
      ayn: {
        name: 'ʿAyn',
        short: 'gepresst, aus der Mitte der Kehle, stimmhaft',
        makhraj:
          'Die Mitte der Kehle: Sie verengt sich, und die Stimme klingt weiter. Ein voller, gepresster Laut – im Deutschen gibt es ihn nicht.',
        mistakes: [
          'Nicht weglassen und nicht durch den Knacklaut ersetzen: Sonst wird عَلِيمٌ („wissend“) zu أَلِيمٌ („schmerzhaft“).',
          'Die Stimme schwingt weiter (Tawassuṭ): kein harter Stopp wie bei Hamza.',
          'Leicht bleiben (Istifāl): Der Vokal nach ʿAyn klingt nicht dunkel.',
        ],
      },
      hha: {
        name: 'Ḥāʾ',
        short: 'ein kräftiger Hauch aus der engen Kehle',
        makhraj:
          'Die Mitte der Kehle, wie bei ʿAyn: Die Kehle wird eng, und die Luft reibt hörbar – ohne Stimme.',
        mistakes: [
          'Nicht wie das deutsche h: Ohne die Enge wird aus أُحِلَّ („erlaubt wurde“) أُهِلَّ („angerufen wurde“).',
          'Nicht wie ch in „Bach“: Dort reibt der Zungenrücken am Gaumen – das ist Khāʾ. Bei Ḥāʾ bleibt der Mund frei, nur die Kehle ist eng.',
          'Stimmlos (Hams): Summt es, wird es ʿAyn.',
        ],
      },
      ghayn: {
        name: 'Ghayn',
        short: 'schwer, stimmhaft, ein weiches Reiben',
        makhraj:
          'Der obere Teil der Kehle, nah am Mund, wie bei Khāʾ: Hinten reibt die Luft, und die Stimme schwingt mit.',
        mistakes: [
          'Nah am deutschen Rachen-r in „rot“, aber es schnarrt nicht: Ghayn reibt weich und gleichmäßig.',
          'Stimmhaft: Summt es nicht, wird es Khāʾ – aus غَيْرَ („außer“) wird خَيْرَ („gut“).',
          'Schwer (Istiʿlāʾ): Der Zungenrücken hebt sich, der Vokal danach klingt voll.',
        ],
      },
      kha: {
        name: 'Khāʾ',
        short: 'schwer, stimmlos, wie ch in „Bach“',
        makhraj:
          'Der obere Teil der Kehle, nah am Mund, wie bei Ghayn: Die Luft reibt hörbar, ohne Stimme.',
        mistakes: [
          'Wie ch in „Bach“, nie wie in „ich“: Das helle ch liegt zu weit vorn.',
          'Schwer (Istiʿlāʾ): Der Vokal danach klingt dunkel und voll – خَلَقَ, nicht hell.',
          'Nicht mit Ḥāʾ verwechseln: Bei Khāʾ reibt es oben, bei Ḥāʾ ist nur die Kehle eng.',
        ],
      },
      qaf: {
        name: 'Qāf',
        short: 'schwer, tief hinten, mit Qalqala',
        makhraj:
          'Der hinterste Teil der Zunge hebt sich an den weichen Gaumen darüber und schließt kurz ab – weiter hinten als Kāf.',
        mistakes: [
          'Nicht wie das deutsche k: Qāf entsteht weiter hinten, am weichen Gaumen – sonst wird aus قَدْحًا („Funken schlagend“) كَدْحًا („Mühe“).',
          'Schwer (Istiʿlāʾ): Der Zungenrücken hebt sich, der Vokal danach klingt voll und dunkel.',
          'Kein Hauch danach: Qāf ist stimmhaft und fest. Mit Sukūn federt es kurz nach (Qalqala) – ٱلْقَدْرِ.',
        ],
      },
      kaf: {
        name: 'Kāf',
        short: 'leicht, mit einem Hauch',
        makhraj:
          'Der hintere Teil der Zunge am Gaumen, ein wenig weiter vorn und tiefer als bei Qāf.',
        mistakes: [
          'Leicht bleiben (Istifāl): Der Vokal danach klingt hell. Ein dunkles Kāf klingt wie Qāf.',
          'Mit einem leisen Hauch (Hams), vor allem mit Sukūn – hörbar, aber nicht übertrieben.',
          'Nicht nach hinten zum Qāf ziehen: Sonst wird aus كَدْحًا („Mühe“) قَدْحًا („Funken schlagend“).',
        ],
      },
      jim: {
        name: 'Jīm',
        short: 'fest, stimmhaft, mit Qalqala',
        makhraj:
          'Die Mitte der Zunge legt sich an den harten Gaumen darüber – dieselbe Stelle wie Shīn und Yāʾ.',
        mistakes: [
          'Fest (Shidda): Die Zunge schließt ganz ab, wie dsch in „Dschungel“ – nicht weich wie das j in „Journal“.',
          'Stimmhaft: Ohne Stimme und ohne den Abschluss wird es Shīn – aus جَآءَ („er kam“) wird شَآءَ („er wollte“).',
          'Mit Sukūn federt Jīm kurz nach (Qalqala), ohne einen Vokal anzuhängen.',
        ],
      },
      shin: {
        name: 'Shīn',
        short: 'stimmlos, die Luft breitet sich aus',
        makhraj:
          'Die Mitte der Zunge zum harten Gaumen, wie bei Jīm und Yāʾ – aber ohne Abschluss: Die Luft strömt hindurch und breitet sich im Mund aus (Tafashshī).',
        mistakes: [
          'Wie sch in „Schule“, aber ohne die Lippen vorzuschieben: Sie bleiben locker.',
          'Nicht wie Sīn: Bei Shīn liegt die Zungenmitte am Gaumen, nicht die Spitze an den Zähnen; es pfeift nicht.',
          'Leicht (Istifāl) und stimmlos (Hams): kein Summen wie das j in „Journal“.',
        ],
      },
      ya: {
        name: 'Yāʾ',
        short: 'weich, stimmhaft, wie j in „ja“',
        makhraj:
          'Die Mitte der Zunge zum harten Gaumen, wie bei Jīm und Shīn – mit Raum dazwischen, der Laut fließt weiter.',
        mistakes: [
          'Wie das deutsche j in „ja“: weich, ohne Reiben und ohne Stoß.',
          'Nicht zu Jīm werden lassen: Die Zunge legt sich nicht fest an den Gaumen – sonst wird aus سُيِّرَتْ („in Bewegung gesetzt“) سُجِّرَتْ („entflammt“).',
          'Ein Yāʾ mit Vokal ist ein Konsonant, kein Dehnungslaut: يَوْمِ beginnt mit j, nicht mit i.',
        ],
      },
      dad: {
        name: 'Ḍād',
        short: 'schwer, stimmhaft, nur im Arabischen',
        makhraj:
          'Ein Rand der Zunge – oder beide – liegt an den oberen Backenzähnen, und die Zunge hebt sich breit zum Gaumen. Der Laut zieht sich über den ganzen Rand (Istiṭāla).',
        mistakes: [
          'Nicht wie das deutsche d: Ḍād ist schwer, die Zunge liegt breit am Gaumen – sonst wird aus بَعْضَ („ein Teil“) بَعْدَ („nach“).',
          'Nicht wie Ẓāʾ: Die Zungenspitze bleibt hinter den Zähnen und schaut nicht heraus.',
          'Mit Sukūn keine Qalqala: Ḍād gehört nicht zu ق ط ب ج د.',
        ],
      },
      tta: {
        name: 'Ṭāʾ',
        short: 'schwer, fest, mit Qalqala',
        makhraj:
          'Die Zungenspitze an den Wurzeln der oberen Schneidezähne, wie bei Dāl und Tāʾ. Dazu legt sich der Zungenrücken breit an den Gaumen.',
        mistakes: [
          'Nicht wie das deutsche t: Ṭāʾ ist schwer (Iṭbāq), der Vokal danach klingt voll und dunkel.',
          'Ohne Hauch (Jahr): Das deutsche t wird angehaucht, Ṭāʾ nicht – der Atem bleibt gehalten.',
          'Mit Sukūn federt Ṭāʾ kurz nach (Qalqala).',
        ],
      },
      dal: {
        name: 'Dāl',
        short: 'leicht, stimmhaft, mit Qalqala',
        makhraj:
          'Die Zungenspitze an den Wurzeln der oberen Schneidezähne, wie bei Ṭāʾ und Tāʾ.',
        mistakes: [
          'Am Wortende und vor Sukūn nicht zu t werden lassen wie im Deutschen („Rad“): Dāl bleibt stimmhaft und federt nach (Qalqala).',
          'Leicht bleiben: Ein schweres Dāl klingt wie Ḍād – aus بَعْدَ („nach“) wird بَعْضَ („ein Teil“).',
          'Nicht mit Tāʾ verwechseln: Ohne Stimme wird aus هَادُوا۟ („die dem Judentum angehören“) هَاتُوا۟ („bringt her!“).',
        ],
      },
      ta: {
        name: 'Tāʾ',
        short: 'leicht, mit einem Hauch',
        makhraj:
          'Die Zungenspitze an den Wurzeln der oberen Schneidezähne, wie bei Ṭāʾ und Dāl.',
        mistakes: [
          'Leicht bleiben (Istifāl): Der Vokal danach klingt hell. Ein dunkles Tāʾ wird zu Ṭāʾ.',
          'Mit einem leisen Hauch (Hams), vor allem mit Sukūn – wie das deutsche t, nur nicht übertrieben.',
          'Nicht stimmhaft werden lassen: Summt es, wird es Dāl – aus هَاتُوا۟ („bringt her!“) wird هَادُوا۟.',
        ],
      },
      tha: {
        name: 'Thāʾ',
        short: 'leicht, stimmlos, wie th in „think“',
        makhraj:
          'Die Zungenspitze berührt die Kanten der oberen Schneidezähne – sie schaut ein wenig heraus.',
        mistakes: [
          'Nicht wie s: Die Zunge muss an die Zähne. Bleibt sie dahinter, wird aus Thāʾ ein Sīn.',
          'Stimmlos (Hams): Summt es, wird es Dhāl.',
          'Leicht bleiben (Istifāl): Hebt sich der Zungenrücken, klingt es schwer wie Ẓāʾ.',
        ],
      },
      dha: {
        name: 'Dhāl',
        short: 'leicht, stimmhaft, wie th in „this“',
        makhraj:
          'Dieselbe Stelle wie Thāʾ: die Zungenspitze an den Kanten der oberen Schneidezähne.',
        mistakes: [
          'Nicht wie z oder das weiche s: Die Zunge muss an die Zähne. Bleibt sie dahinter, wird aus Dhāl ein Zāy.',
          'Stimmhaft (Jahr): Ohne Stimme wird es Thāʾ.',
          'Leicht bleiben (Istifāl): Ein schweres Dhāl wird zu Ẓāʾ.',
        ],
      },
      zza: {
        name: 'Ẓāʾ',
        short: 'schwer, stimmhaft, die Zunge an den Zähnen',
        makhraj:
          'Dieselbe Stelle wie Dhāl: die Zungenspitze an den Kanten der oberen Schneidezähne. Dazu legt sich der Zungenrücken breit an den Gaumen.',
        mistakes: [
          'Nicht wie z: Die Zunge muss an die Zähne, sonst wird es ein schweres Zāy.',
          'Schwer (Iṭbāq): Der Vokal danach klingt voll und dunkel – sonst wird es Dhāl.',
          'Nicht mit Ḍād verwechseln: Bei Ẓāʾ liegt die Zungenspitze an den Zähnen, bei Ḍād der Zungenrand an den Backenzähnen.',
        ],
      },
      lam: {
        name: 'Lām',
        short: 'leicht, wie l in „Licht“',
        makhraj:
          'Die vorderen Ränder der Zunge mit ihrer Spitze am Zahndamm hinter den oberen Vorderzähnen.',
        mistakes: [
          'Hell wie l in „Licht“, nicht dunkel wie im englischen „full“: Lām ist grundsätzlich leicht.',
          'Nur das Lām in ٱللَّه wird schwer, wenn davor Fatḥa oder Ḍamma steht; nach Kasra bleibt es leicht – لِلَّهِ.',
          'Mit Sukūn deutlich halten, nicht verschlucken – لَمْ.',
        ],
      },
      nun: {
        name: 'Nūn',
        short: 'leicht, mit Ghunna',
        makhraj:
          'Die Zungenspitze am Zahndamm, ein wenig vor dem Lām, näher an der Spitze. Ein Teil des Klangs kommt aus dem Nasenraum (Ghunna).',
        mistakes: [
          'Wie das deutsche n – aber mit Shadda deutlich gehalten und genäselt (Ghunna), etwa zwei Schläge lang.',
          'Nūn sākin und Tanwīn folgen eigenen Regeln: deutlich, verborgen oder verschmolzen. Die lernst du auf dem Pfad.',
          'Nicht mit Lām verwechseln: Bei Nūn geht ein Teil der Luft durch die Nase – sonst wird aus إِنَّا („wir“) إِلَّآ („außer“).',
        ],
      },
      fa: {
        name: 'Fāʾ',
        short: 'leicht, stimmlos, wie f',
        makhraj: 'Die Innenseite der Unterlippe an den Kanten der oberen Schneidezähne.',
        mistakes: [
          'Wie das deutsche f – nur nie zu v werden lassen: Fāʾ ist immer stimmlos (Hams).',
          'Nicht mit Thāʾ verwechseln: Bei Fāʾ reibt die Luft an der Lippe, bei Thāʾ an der Zunge zwischen den Zähnen – يُنفِقُ („er spendet“), nicht يُوثِقُ („er fesselt“).',
          'Leicht bleiben (Istifāl): Der Vokal danach klingt hell.',
        ],
      },
      ba: {
        name: 'Bāʾ',
        short: 'stimmhaft, fest, mit Qalqala',
        makhraj: 'Beide Lippen schließen sich fest und öffnen sich mit einem Ruck.',
        mistakes: [
          'Am Wortende und vor Sukūn nicht zu p werden lassen wie im Deutschen („ab“): Bāʾ bleibt stimmhaft und federt nach (Qalqala).',
          'Fest (Shidda): Die Lippen schließen ganz, der Laut bricht ab.',
          'Nicht mit Wāw verwechseln: Bei Bāʾ schließen sich die Lippen – بَلَدًا („ein Land“), nicht وَلَدًا („ein Kind“).',
        ],
      },
      mim: {
        name: 'Mīm',
        short: 'die Lippen geschlossen, mit Ghunna',
        makhraj:
          'Beide Lippen schließen sich, leichter als bei Bāʾ; der Klang geht durch die Nase (Ghunna).',
        mistakes: [
          'Mit Shadda deutlich genäselt halten, etwa zwei Schläge lang – ثُمَّ.',
          'Mīm sākin wird vor Bāʾ verborgen und vor Mīm verschmolzen; vor allen anderen Buchstaben bleibt es deutlich.',
          'Nicht mit Wāw verwechseln: Bei Mīm schließen sich die Lippen ganz – لَمْ („nicht“), nicht لَوْ („wenn“).',
        ],
      },
      waw: {
        name: 'Wāw',
        short: 'weich, stimmhaft, runde Lippen',
        makhraj: 'Beide Lippen runden sich nach vorn, ohne sich zu schließen.',
        mistakes: [
          'Nicht wie das deutsche w: Dort berühren die Zähne die Unterlippe. Bei Wāw runden sich nur die Lippen, wie bei w im englischen „water“.',
          'Nicht zu Bāʾ werden lassen: Die Lippen schließen sich nicht – وَلَدًا („ein Kind“), nicht بَلَدًا („ein Land“).',
          'Ein Wāw mit Vokal ist ein Konsonant, kein Dehnungslaut: وُجُوهٌ beginnt mit w, nicht mit u.',
        ],
      },
    } as Record<LabLetterId, LetterTexts>,
    makhraj: 'Makhraj · wo er entsteht',
    sifat: 'Ṣifāt · seine Eigenschaften',
    sifa: {
      shidda: {
        name: 'Shidda',
        meaning:
          'Fest: Der Laut wird ganz angehalten und bricht ab – er fließt nicht weiter.',
      },
      hams: {
        name: 'Hams',
        meaning: 'Flüstern: Der Atem fließt mit, die Stimme schwingt nicht.',
      },
      jahr: {
        name: 'Jahr',
        meaning: 'Stimmhaft: Der Atem wird gehalten, die Stimme schwingt.',
      },
      rakhawa: {
        name: 'Rakhāwa',
        meaning: 'Weich: Der Laut fließt weiter, er bricht nicht ab.',
      },
      tawassut: {
        name: 'Tawassuṭ (Bayniyya)',
        meaning: 'Dazwischen: Der Laut fließt nur ein wenig, weder fest noch weich.',
      },
      istifal: {
        name: 'Istifāl',
        meaning:
          'Tief: Der Zungenrücken hebt sich nicht zum Gaumen. Solche Buchstaben klingen grundsätzlich leicht; nur Rāʾ (und das Lām in „Allāh“) wird je nach Lage schwer.',
      },
      istila: {
        name: 'Istiʿlāʾ',
        meaning: 'Hoch: Der Zungenrücken hebt sich zum Gaumen, der Laut wird schwer.',
      },
      infitah: {
        name: 'Infitāḥ',
        meaning: 'Offen: Zwischen Zunge und Gaumen bleibt Raum.',
      },
      itbaq: {
        name: 'Iṭbāq',
        meaning: 'Bedeckt: Die Zunge legt sich breit an den Gaumen, der Klang wird voll.',
      },
      ismat: {
        name: 'Iṣmāt',
        meaning:
          'Gehemmt: Der Laut kommt nicht so leicht über die Zunge (Gegenteil von Idhlāq).',
      },
      idhlaq: {
        name: 'Idhlāq',
        meaning: 'Leichtfüßig: Der Laut gleitet leicht von der Zungenspitze.',
      },
      safir: {
        name: 'Ṣafīr',
        meaning: 'Pfeifen: ein feiner Ton, wenn die Luft durch den engen Spalt strömt.',
      },
      inhiraf: {
        name: 'Inḥirāf',
        meaning: 'Abweichen: Der Laut weicht ein wenig von seiner Stelle ab.',
      },
      takrir: {
        name: 'Takrīr',
        meaning:
          'Wiederholen: Die Zunge neigt zum Zittern – du kennst es, um es zu vermeiden.',
      },
      qalqala: {
        name: 'Qalqala',
        meaning:
          'Nachfedern: Mit Sukūn springt der Laut kurz nach, wie ein kleines Echo (ق ط ب ج د).',
      },
      tafashshi: {
        name: 'Tafashshī',
        meaning: 'Ausbreiten: Die Luft verteilt sich im ganzen Mund (nur Shīn).',
      },
      istitala: {
        name: 'Istiṭāla',
        meaning:
          'Verlängern: Der Laut zieht sich über den ganzen Zungenrand, von hinten bis zur Spitze (nur Ḍād).',
      },
      ghunna: {
        name: 'Ghunna',
        meaning: 'Näseln: ein Klang aus dem Nasenraum, der zu Nūn und Mīm gehört.',
      },
    } as Record<Sifa, { name: string; meaning: string }>,
    mistakesTitle: 'Typische Fehler',
    raRules: {
      title: 'Rāʾ: schwer oder leicht',
      heavy: 'Mit Fatḥa oder Ḍamma ist Rāʾ schwer (Tafkhīm): voller, dunkler Klang.',
      light: 'Mit Kasra ist Rāʾ leicht (Tarqīq): flach und hell.',
      pending:
        'Nur die klaren Fälle, als Kurzfassung. Rāʾ mit Sukūn und die übrigen Regeln folgen, wenn dein Sheikh sie geprüft hat.',
    },
    listen: {
      title: 'Hören und nachsprechen',
      intro:
        'al-Ḥuṣarī, Lehrvortrag, Wort für Wort. Tippe auf ein Wort, hör zu und sprich nach – zuerst langsam.',
      play: (sura: number, aya: number, n: number) =>
        `Anhören: Sūra ${sura}, Āya ${aya}, Wort ${n}`,
      where: (sura: number, aya: number) => `${sura}:${aya}`,
      speed: 'Tempo',
      loading: 'Die Wortzeiten werden geladen …',
      failed: 'Der Vortrag lädt nicht. Prüfe deine Verbindung.',
      source:
        'Vortrag: al-Ḥuṣarī (muʿallim), EveryAyah.com · Wortzeiten: quran-align (Collin Fair), CC BY 4.0',
    },
    quiz: {
      whistling: {
        title: 'Welcher Buchstabe?',
        intro: 'Zehn Wörter, nur zum Hören: Hörst du Sīn, Zāy oder Ṣād?',
        question: 'Welchen Buchstaben hörst du?',
      },
      hamzaAyn: {
        title: 'Hamza oder ʿAyn?',
        intro:
          'Zehn Wörter, nur zum Hören: ein klarer Einsatz (Hamza) oder ein gepresster Laut aus der Kehle (ʿAyn)?',
        question: 'Welchen Buchstaben hörst du?',
      },
      hSounds: {
        title: 'Hāʾ, Ḥāʾ oder Khāʾ?',
        intro:
          'Zehn Wörter, nur zum Hören: ein leiser Hauch, ein kräftiger aus der engen Kehle oder ein Reiben wie in „Bach“?',
        question: 'Welchen Buchstaben hörst du?',
      },
      khGh: {
        title: 'Khāʾ oder Ghayn?',
        intro:
          'Zehn Wörter, nur zum Hören: Reibt es ohne Stimme (Khāʾ) oder mit Stimme (Ghayn)?',
        question: 'Welchen Buchstaben hörst du?',
      },
      qafKaf: {
        title: 'Qāf oder Kāf?',
        intro:
          'Zehn Wörter, nur zum Hören: tief und schwer (Qāf) oder weiter vorn und leicht (Kāf)?',
        question: 'Welchen Buchstaben hörst du?',
      },
      middle: {
        title: 'Jīm, Shīn oder Yāʾ?',
        intro:
          'Zehn Wörter, nur zum Hören: fest mit Stimme (Jīm), ein breites Rauschen (Shīn) oder weich wie j in „ja“ (Yāʾ)?',
        question: 'Welchen Buchstaben hörst du?',
      },
      dadDal: {
        title: 'Ḍād oder Dāl?',
        intro:
          'Zehn Wörter, nur zum Hören: schwer und voll (Ḍād) oder leicht wie das deutsche d (Dāl)?',
        question: 'Welchen Buchstaben hörst du?',
      },
      tip: {
        title: 'Ṭāʾ, Dāl oder Tāʾ?',
        intro:
          'Zehn Wörter, nur zum Hören: schwer (Ṭāʾ), stimmhaft (Dāl) oder leicht mit Hauch (Tāʾ)?',
        question: 'Welchen Buchstaben hörst du?',
      },
      teeth: {
        title: 'Thāʾ, Dhāl oder Ẓāʾ?',
        intro:
          'Zehn Wörter, nur zum Hören: ohne Stimme (Thāʾ), mit Stimme (Dhāl) oder schwer mit Stimme (Ẓāʾ)?',
        question: 'Welchen Buchstaben hörst du?',
      },
      lamNun: {
        title: 'Lām oder Nūn?',
        intro:
          'Zehn Wörter, nur zum Hören: Fließt der Laut am Zungenrand (Lām) oder durch die Nase (Nūn)?',
        question: 'Welchen Buchstaben hörst du?',
      },
      faTha: {
        title: 'Fāʾ oder Thāʾ?',
        intro:
          'Zehn Wörter, nur zum Hören: Reibt die Luft an der Lippe (Fāʾ) oder an der Zunge zwischen den Zähnen (Thāʾ)?',
        question: 'Welchen Buchstaben hörst du?',
      },
      lips: {
        title: 'Bāʾ, Mīm oder Wāw?',
        intro:
          'Zehn Wörter, nur zum Hören: geschlossen mit einem Ruck (Bāʾ), geschlossen durch die Nase (Mīm) oder rund und offen (Wāw)?',
        question: 'Welchen Buchstaben hörst du?',
      },
      weight: {
        title: 'Schwer oder leicht?',
        intro: 'Zehn Wörter mit Rāʾ: Klingt es schwer oder leicht?',
        question: 'Wie klingt das Rāʾ?',
      },
      start: 'Quiz starten',
      listen: 'Anhören',
      listenAgain: 'Nochmal hören',
      options: 'Antworten',
      weights: { heavy: 'schwer', light: 'leicht' } as Record<Weight, string>,
      why: {
        hamza: 'Hamza: ein kurzer, fester Einsatz – kein Pressen.',
        ha: 'Hāʾ: ein leiser, offener Hauch.',
        ayn: 'ʿAyn: gepresst aus der Mitte der Kehle, die Stimme klingt.',
        hha: 'Ḥāʾ: ein kräftiger Hauch aus der engen Kehle, ohne Reiben oben.',
        ghayn: 'Ghayn: ein weiches Reiben mit Stimme.',
        kha: 'Khāʾ: ein Reiben ohne Stimme, wie in „Bach“.',
        qaf: 'Qāf: tief hinten und schwer, der Vokal klingt dunkel.',
        kaf: 'Kāf: weiter vorn, leicht, mit leisem Hauch.',
        jim: 'Jīm: fest und stimmhaft, wie dsch.',
        shin: 'Shīn: ein breites Rauschen ohne Stimme.',
        ya: 'Yāʾ: weich, wie j in „ja“.',
        dad: 'Ḍād: schwer, die Zunge liegt breit am Gaumen.',
        tta: 'Ṭāʾ: schwer und fest, ohne Hauch.',
        dal: 'Dāl: leicht und stimmhaft.',
        ta: 'Tāʾ: leicht, mit leisem Hauch.',
        tha: 'Thāʾ: an den Zähnen, ohne Stimme.',
        dha: 'Dhāl: an den Zähnen, mit Stimme, leicht.',
        zza: 'Ẓāʾ: an den Zähnen, mit Stimme, schwer.',
        lam: 'Lām: hell, der Laut fließt am Zungenrand.',
        nun: 'Nūn: ein Teil des Klangs kommt aus der Nase.',
        fa: 'Fāʾ: Die Luft reibt an der Lippe.',
        ba: 'Bāʾ: Die Lippen schließen ganz, mit Stimme.',
        mim: 'Mīm: Die Lippen sind geschlossen, der Klang geht durch die Nase.',
        waw: 'Wāw: runde Lippen, nicht geschlossen.',
        sin: 'Sīn: leicht, scharf und stimmlos.',
        zay: 'Zāy: stimmhaft – es summt –, aber dünn.',
        sad: 'Ṣād: schwer, der Zungenrücken hebt sich.',
        heavy: 'Rāʾ mit Fatḥa oder Ḍamma: schwer.',
        light: 'Rāʾ mit Kasra: leicht.',
      } as Record<Exclude<LabLetterId, 'ra'> | Weight, string>,
      back: 'Zum Buchstaben',
    },
    pairs: {
      title: 'Paare vergleichen',
      intro: 'Hör beide Wörter nacheinander und achte nur auf den einen Laut.',
      playBoth: 'Beide hören',
      exact: 'Nur dieser Laut ist anders.',
      near: 'Ähnlich: Auch ein Vokal oder ein Laut daneben ist anders.',
      rare: 'Ganz gleiche Paare sind in Juzʾ ʿAmma, al-Fātiḥa und al-Baqara selten. Darum sind die meisten hier ähnliche Paare.',
    },
    self: {
      title: 'Selbst üben',
      text: 'Sprich jedes Wort dreimal nach. Dann nimm eine Āya mit diesem Buchstaben auf und schick sie deinem Sheikh – er hört genau auf diesen Laut.',
      pick: 'Āya',
      record: 'Diese Āya aufnehmen',
    },
  },
  soon: {
    eyebrow: 'In Arbeit',
    notFound: { title: 'Nicht gefunden', text: 'Diese Seite gibt es nicht.' },
    mushaf: {
      title: 'Der Muṣḥaf',
      text: 'Der IndoPak-Muṣḥaf mit Tajwīd-Farben: tippe auf einen Buchstaben, hör den Rezitator Wort für Wort, langsam und in Schleife.',
    },
    sheikh: {
      title: 'Mein Sheikh',
      text: 'Deine Ḥalaqa, seine Aufgaben auf der Seite, deine Rezitationen in seiner Hörliste und das ʿArḍ-Buch.',
    },
  },
};

export type Messages = typeof de;
