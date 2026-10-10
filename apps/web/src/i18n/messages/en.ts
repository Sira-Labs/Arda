/** English (ADR-0020); typed against the German source catalog. */
import type { Messages } from './de';

export const en: Messages = {
  nav: {
    brand: 'ʿArḍa',
    label: 'Main navigation',
    today: 'Today',
    path: 'Path',
    mushaf: 'Muṣḥaf',
    lab: 'Lab',
    sheikh: 'Sheikh',
  },
  brand: {
    tagline: 'Recite, be heard, be corrected.',
  },
  language: { label: 'Language' },
  today: {
    eyebrow: 'Today',
    greeting: (name) => (name ? `Assalāmu ʿalaikum, ${name}` : 'Assalāmu ʿalaikum'),
    account: 'Account',
    signIn: 'Sign in',
    offline: 'Offline – keep learning; your sheikh sees it the next time you connect.',
    fromSheikh: 'From my sheikh',
    noTasks: 'No assignments yet',
    noTasksHint:
      'As soon as he marks a passage in the muṣḥaf for you, it appears here at the top, with a due date.',
    connect: 'Connect with your sheikh',
    connectHint: 'Sign in and join his ḥalaqa by link or QR code.',
    nextUnit: 'Next on the path · Unit 2',
    openCard: 'Open the rule card',
    legend: 'Colours in the muṣḥaf',
    saveProgress: 'Keep your progress',
    saveProgressHint:
      'You can practise without an account. Sign in so your progress is saved and the same on all your devices.',
    saveProgressAction: 'Sign in to keep it',
  },
  engagement: {
    title: 'Your progress',
    level: (level) => `Level ${level}`,
    xp: (points) => `${points} XP`,
    toNext: (left) => `${left} XP to the next level`,
    today: (points) => `+${points} XP today`,
    streak: (days) => (days === 1 ? '1 day in a row' : `${days} days in a row`),
    streakStart: 'Practise today to start a streak.',
    streakToday: 'Practised today.',
    streakOpen: 'Practise today to keep your streak.',
    shields: (count) => (count === 1 ? '1 streak shield' : `${count} streak shields`),
    shieldHint:
      'Every 7 days of practice earn a streak shield (at most 2). It covers a missed day.',
  },
  rules: {
    ghunna: { name: 'Ghunna', hint: 'nasal sound, 2 counts (ikhfāʾ, idghām, iqlāb)' },
    qalqala: { name: 'Qalqala', hint: 'echo of ق ط ب ج د with sukūn' },
    silent: { name: 'Silent', hint: 'written, not pronounced' },
    'madd-2': { name: 'Madd 2', hint: 'natural lengthening, 2 counts' },
    'madd-4': { name: 'Madd 4–5', hint: 'joined or separated lengthening' },
    'madd-6': { name: 'Madd 6', hint: 'necessary lengthening, 6 counts' },
  },
  path: {
    eyebrow: 'Path',
    units: {
      1: {
        title: 'Unit 1 · Makhārij and ṣifāt',
        intro:
          'Where each letter is made: five areas, seventeen points, all 28 letters in the lab. At the end you hear ten words from across the lab.',
      },
      2: {
        title: 'Unit 2 · Nūn sākina and tanwīn',
        intro:
          'The letter after nūn sākina or tanwīn decides how you say it: 28 letters, four rules – 6 + 6 + 1 + 15.',
      },
      3: {
        title: 'Unit 3 · Ghunna and mīm sākina',
        intro:
          'Ghunna always lasts 2 counts. With mīm sākina the next letter decides: bāʾ, mīm or any other.',
      },
      4: {
        title: 'Unit 4 · Qalqala',
        intro: 'Five letters bounce back when they rest: ق ط ب ج د – quṭbu jadd.',
      },
    },
    lab: 'Open the letter lab',
    letters: (count) => (count === 1 ? '1 letter' : `${count} letters`),
    next: 'Units 5 (madd) to 7 (waqf) follow after the pilot.',
  },
  ruleCard: {
    play: (sura, aya) => `Listen: sūra ${sura}, āya ${aya}`,
    inQuran: 'In the Qurʾān:',
    eyebrow: (unit) => `Unit ${unit} · Understand`,
    close: 'Close',
    progress: (index, total) => `Card ${index} of ${total}`,
    draft: 'Draft',
    draftHint: 'Not yet reviewed by your sheikh.',
    letters: 'When one of these letters follows',
    examples: 'Examples',
    lettersShadda: 'These letters with shadda',
    lettersSukun: 'These letters with sukūn',
    allOtherLetters: 'Every letter except bāʾ and mīm',
    decides: 'decides the rule',
    followerKey: 'underlined = the letter that decides',
    clear: 'no colour = said clearly',
    colourKey: (colour, name, hint) => `${colour} = ${name}, ${hint}`,
    colours: {
      ghunna: 'green',
      qalqala: 'blue',
      silent: 'grey',
      'madd-2': 'light red',
      'madd-4': 'red',
      'madd-6': 'dark red',
    },
    cases: {
      inside: 'inside a word',
      across: 'across two words',
      tanwin: 'after tanwīn',
    },
    withGhunna: 'with ghunna',
    withoutGhunna: 'without ghunna',
    exceptions: 'Exception: inside one word it stays clear (Iẓhār)',
    sourcesDiffer: 'Sources differ',
    sources: {
      iqlabGhunna:
        'One source teaches iqlāb without ghunna. We teach it with ghunna, like your sheet.',
    },
    teacherNote: 'Your sheikh’s note: none yet.',
    previous: 'Back',
    next: 'Next',
    done: 'To the unit',
  },
  cards: {
    izhar: {
      title: 'Say it clearly before the six throat letters',
      steps: [
        'Spot nūn sākina or tanwīn.',
        'Is the next letter one of the six throat letters? Then it is iẓhār.',
        'Say the nūn clearly: no ghunna, no merging.',
        'Move straight on to the throat letter, without a pause.',
      ],
      tip: 'It is called iẓhār ḥalqī because all six letters come from the throat (ḥalq).',
    },
    idgham: {
      title: 'Nūn merges into the next word',
      steps: [
        'Spot nūn sākina or tanwīn at the end of a word.',
        'If the next word starts with one of the six letters, the nūn merges into it.',
        'With yanmū a ghunna of 2 counts remains; with lām and rāʾ it falls away.',
        'Only across two words: inside one word it stays clear (see the exception).',
      ],
      tip: 'Memory word: yarmalūn – its letters are the six.',
    },
    iqlab: {
      title: 'Nūn becomes mīm before bāʾ',
      steps: [
        'Spot nūn sākina or tanwīn before bāʾ',
        'Turn the “n” into an “m”',
        'Close the lips and hold the ghunna for 2 counts',
        'Open the lips into the bāʾ',
      ],
      tip: 'The muṣḥaf often writes a small mīm over the nūn or tanwīn.',
    },
    ikhfa: {
      title: 'Nūn is hidden, with ghunna',
      steps: [
        'Spot nūn sākina or tanwīn before one of the 15 letters.',
        'The tongue does not press: the nūn is hidden, not said.',
        'Hold the ghunna for 2 counts, the mouth already set for the next letter.',
        'Then say the letter.',
      ],
      tip: 'Memory aid: the first letters of “ṣif dhā thanā kam jāda shakhṣun qad samā / dum ṭayyiban zid fī tuqan ḍaʿ ẓālimā”.',
    },
    ghunna: {
      title: 'Nūn and mīm with shadda: always ghunna',
      steps: [
        'Spot a nūn or mīm with shadda (نّ مّ).',
        'Ghunna is a nasal sound from the khayshūm: hold it for 2 counts.',
        'Check yourself: if you hold your nose, the sound stops.',
        'Strength of the ghunna: shadda → ikhfāʾ and iqlāb → idghām → plain nūn or mīm.',
      ],
      tip: 'Ghunna belongs to nūn and mīm themselves: even without a rule it sounds softly.',
    },
    'ikhfa-shafawi': {
      title: 'Mīm sākina before bāʾ: hidden, with ghunna',
      steps: [
        'Spot a mīm sākina (مْ) at the end of a word.',
        'If the next word starts with bāʾ, it is ikhfāʾ shafawī.',
        'Close the lips lightly, without pressing, and hold the ghunna for 2 counts.',
        'Then open into the bāʾ.',
      ],
      tip: '“Shafawī” means “of the lips”: mīm and bāʾ both come from the lips.',
    },
    'idgham-shafawi': {
      title: 'Mīm sākina before mīm: merged, with ghunna',
      steps: [
        'Spot a mīm sākina before a mīm.',
        'The two mīms merge into one mīm with shadda.',
        'Hold the ghunna for 2 counts.',
      ],
      tip: 'It is also called idghām mithlayn ṣaghīr: two identical letters, the first resting.',
    },
    'izhar-shafawi': {
      title: 'Mīm sākina before all other letters: clear',
      steps: [
        'Spot a mīm sākina before any letter but bāʾ and mīm.',
        'Say the mīm clearly, without ghunna and without merging.',
        'Especially before wāw and fāʾ: do not close the lips too early and hide nothing.',
      ],
      tip: 'Iẓhār shafawī applies before 26 letters: all but bāʾ and mīm.',
    },
    qalqala: {
      title: 'The bounce of ق ط ب ج د with sukūn',
      steps: [
        'Spot one of the five letters ق ط ب ج د (quṭbu jadd) with sukūn.',
        'Touch the point of articulation and release it quickly: a short bounce.',
        'The bounce is not a vowel: add no “a”, “i” or “u”.',
        'When stopping at the end of a word (e.g. أَحَدْ), the bounce is strongest.',
      ],
      tip: 'Mnemonic: quṭbu jadd (قُطْبُ جَدٍّ) – its letters are the five.',
    },
  },
  games: {
    eyebrow: (unit) => `Unit ${unit} · Practise`,
    practise: 'Practise',
    progress: (index, total) => `${index} / ${total}`,
    seconds: (seconds) => `${seconds.toLocaleString('en')} s`,
    xp: (points) => `+${points} XP`,
    options: 'Rules',
    whichRule: {
      title: 'Which rule?',
      intro:
        'Ten real words from your sheet: look at the letter after nūn sākina or tanwīn.',
      question: 'Which rule applies to the marked nūn or tanwīn?',
    },
    sort: {
      title: 'Sort the 28',
      intro: 'Every letter belongs to exactly one rule. How fast can you sort all 28?',
      question: 'Nūn sākina before this letter – which rule?',
      best: (seconds) => `Best time: ${seconds.toLocaleString('en')} s`,
      newBest: 'New best time!',
    },
    review: {
      title: 'Review',
      intro: 'What you mixed up comes back – until it holds.',
      none: 'Nothing is due right now. Well done!',
      open: (count) => (count === 1 ? 'Review 1 card' : `Review ${count} cards`),
    },
    good: 'good',
    check: 'check',
    rightAnswer: 'Right is',
    follows: 'followed by',
    insideWord: 'inside one word, the exception',
    toReview: 'This goes into your review.',
    next: 'Next',
    finish: 'See results',
    score: (right, total) => `${right} of ${total} right`,
    newCards: (count) =>
      count === 0
        ? 'No new review cards.'
        : count === 1
          ? '1 card goes into your review.'
          : `${count} cards go into your review.`,
    again: 'Again',
    test: {
      title: 'Unit test',
      intro: 'Ten questions from the unit. Eight right answers pass it.',
      open: 'Take the test',
      passed: 'Passed',
      passedNext: (unit) => `Passed – on to unit ${unit}.`,
      passedLast: 'Passed – every unit of the sheet done.',
      passedOpen: (unit) => `Passed – the test of unit ${unit} is still open.`,
      notYet: (need, total) =>
        `Not passed yet: it takes ${need} of ${total}. Review the cards and try again.`,
      recommended: (unit) => `Recommended after the test of unit ${unit}.`,
    },
    back: 'To the unit',
    unit3: {
      title: 'Which rule? · Unit 3',
      intro: 'Mīm sākina or shadda: ten words, four rules.',
      question: 'Which rule applies to the marked mīm or nūn?',
    },
    qalqala: {
      title: 'Qalqala letters',
      intro: 'Is the letter one of quṭbu jadd? All 28, one after another.',
      question: 'With a sukūn, does this letter bounce back?',
      yes: 'Qalqala',
      no: 'no qalqala',
      isOne: 'is one of quṭbu jadd',
      isNot: 'is not one of quṭbu jadd',
    },
    shadda: 'nūn or mīm with shadda',
  },
  halaqa: {
    mine: 'My ḥalaqāt',
    none: 'You are not in a ḥalaqa yet. Ask your sheikh for the invite link, or show him this page.',
    noneTeacher: 'You have not opened a ḥalaqa yet.',
    teacherOf: (name) => (name ? `with ${name}` : 'with your sheikh'),
    waiting: 'waiting for approval',
    oneToOne: 'One-to-one',
    students: (count) => (count === 1 ? '1 student' : `${count} students`),
    pending: (count) => (count === 1 ? '1 waiting' : `${count} waiting`),
    create: {
      title: 'New ḥalaqa',
      name: 'Name',
      placeholder: 'e.g. Juzʾ ʿAmma, Tuesdays',
      oneToOne: 'One-to-one (exactly one student)',
      submit: 'Open ḥalaqa',
    },
    invite: {
      title: 'Invite',
      hint: 'Share the link or show the QR code. Whoever joins waits until you approve.',
      create: 'Create invite link',
      renew: 'Create a new link',
      validUntil: (date) => `Valid until ${date}. A new link replaces this one.`,
      hidden: (date) =>
        `A link is active until ${date}. It is shown only when created; a new link replaces it.`,
      copy: 'Copy link',
      copied: 'Link copied.',
      share: 'Share',
      revoke: 'Withdraw link',
      revoked: 'The link no longer works.',
      qr: 'QR code to join',
    },
    waitingTitle: 'Waiting for approval',
    approve: 'Accept',
    reject: 'Decline',
    membersTitle: 'Students',
    remove: 'Remove',
    noMembers: 'Nobody yet. Share the invite link.',
    leave: 'Leave ḥalaqa',
    retry: 'Try again',
    back: 'To my ḥalaqāt',
    join: {
      eyebrow: 'Invitation',
      title: (name) => `Ḥalaqa “${name}”`,
      signIn: 'Sign in to join. You will come back here afterwards.',
      confirm: 'Join',
      pending:
        'Requested. As soon as your sheikh approves you, you see the ḥalaqa and his assignments.',
      active: 'You are already in this ḥalaqa.',
      missing: 'Open your sheikh’s invite link or scan his QR code.',
    },
  },
  assignments: {
    title: 'Assignments',
    kinds: {
      learn: 'Learn',
      read: 'Read',
      recite: 'Recite again',
      practise: 'Practise',
    },
    range: (sura, from, to) =>
      from === to ? `Sūra ${sura}, āya ${from}` : `Sūra ${sura}, āyāt ${from}–${to}`,
    times: (count) => (count === 1 ? 'once' : count === 2 ? 'twice' : `${count} times`),
    rangeWords: (sura, from, wordFrom, to, wordTo) =>
      from !== to
        ? `Sūra ${sura}, āya ${from} word ${wordFrom} to āya ${to} word ${wordTo}`
        : wordFrom === wordTo
          ? `Sūra ${sura}, āya ${from}, word ${wordFrom}`
          : `Sūra ${sura}, āya ${from}, words ${wordFrom}–${wordTo}`,
    focus: 'Focus on',
    variant: (rule) =>
      rule === 'idgham-ghunna'
        ? 'with ghunna'
        : rule === 'idgham-no-ghunna'
          ? 'without ghunna'
          : null,
    due: (date) => `by ${date}`,
    dueToday: 'due today',
    overdue: (date) => `overdue since ${date}`,
    from: (name, halaqa) => (name ? `from ${name} · ${halaqa}` : halaqa),
    markDone: 'Done',
    done: 'Done – your sheikh sees it.',
    doneOn: (date) => `done on ${date}`,
    undo: 'Not done after all',
    openCard: 'Open the rule card',
    play: 'Play the game',
    more: (count) => (count === 1 ? '1 more assignment' : `${count} more assignments`),
    none: 'No assignments in this ḥalaqa yet.',
    older: 'Show older',
    forAll: 'for everyone',
    forStudent: (name) => `for ${name}`,
    doneCount: (done, of) => `${done} of ${of} done`,
    doneBy: 'Done by',
    remove: 'Withdraw',
    /** Pages of a printed muṣḥaf (ADR-0014 update 2026-10-07). */
    pages: (from: number, to: number) =>
      from === to ? `Page ${from}` : `Pages ${from}–${to}`,
    layouts: {
      'indopak-15': 'IndoPak, 15 lines',
      madina: 'Madīna',
    },
    form: {
      title: 'Give an assignment',
      who: 'For',
      everyone: 'all students',
      kind: 'Kind',
      sura: 'Sūra',
      from: 'from āya',
      to: 'to āya',
      rule: 'Rule',
      noRule: 'none',
      repetitions: 'How often',
      due: 'Due on',
      note: 'Note (optional)',
      submit: 'Give assignment',
      given: 'Assignment given.',
      by: 'What',
      byAyat: 'Sūra and āyāt',
      byPages: 'Pages',
      layout: 'Muṣḥaf',
      pageFrom: 'from page',
      pageTo: 'to page',
      onPages: 'On these pages:',
    },
  },
  mushaf: {
    eyebrow: 'Muṣḥaf',
    packs: {
      'uthmani-hafs-fatiha-baqara': 'al-Fātiḥa and al-Baqara',
      'uthmani-hafs-juz30': 'Juzʾ ʿAmma',
      'indopak-hafs-fatiha-baqara': 'al-Fātiḥa and al-Baqara',
      'indopak-hafs-juz30': 'Juzʾ ʿAmma',
    },
    title: 'Muṣḥaf',
    scriptLabel: 'Script',
    scripts: {
      indopak: {
        name: 'IndoPak',
        note: "IndoPak script as in your sheikh's muṣḥaf (15 lines), riwāyat Ḥafṣ.",
      },
      uthmani: {
        name: 'Madīna',
        note: 'ʿUthmānī script as in the Madīna muṣḥaf, riwāyat Ḥafṣ.',
      },
    },
    sura: (number) => `Sūra ${number}`,
    ayat: (count) => (count === 1 ? '1 āya' : `${count} āyāt`),
    loading: 'Loading the muṣḥaf …',
    saved: 'Saved for offline use',
    notSaved: 'Online only: this device cannot keep it.',
    failure: {
      offline: 'Open the muṣḥaf once with a connection; after that it works offline too.',
      checksum: 'The muṣḥaf data arrived damaged. Please reload the page.',
      invalid: 'The muṣḥaf data arrived damaged. Please reload the page.',
      missing: 'This sūra is not in the muṣḥaf yet.',
      missingPage: 'This page is not in the muṣḥaf yet.',
    },
    tap: 'Tap a word to see its rules. Swipe to turn the page; zoom in with two fingers.',
    colours: 'Tajwīd colours',
    player: {
      label: 'Listen',
      playPage: 'Listen to the page',
      play: 'Play',
      stop: 'Stop',
      aya: (sura: number, aya: number) =>
        aya === 0 ? `Sūra ${sura} · Basmala` : `Sūra ${sura} · Āya ${aya}`,
      nowPlaying: 'Now playing',
      pause: 'Pause',
      resume: 'Go on',
      reciter: 'Reciter',
      speed: 'Speed',
      loop: 'Repeat',
      reciters: {
        'husary-muallim': 'al-Ḥuṣarī · teaching (muʿallim)',
        husary: 'al-Ḥuṣarī · murattal',
        maher: 'Māhir al-Muʿayqilī',
      },
      failed: 'The recitation does not load. Check your connection.',
      sourceAudio: 'Recitation: EveryAyah.com',
      sourceTimings: 'Word timings: quran-align (Collin Fair), CC BY 4.0',
      sourceQuranicAudio: 'Māhir al-Muʿayqilī’s recitation: QuranicAudio.com',
      sourceQua: 'Māhir al-Muʿayqilī’s word timings: Quranic Universal Audio, CC BY 4.0',
    },
    all: 'All sūras',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    page: (n: number) => `Page ${n}`,
    /** The page last read in this script, on Today and in the muṣḥaf list. */
    continue: 'Continue reading',
    range: (from, to) =>
      from === to
        ? `Your assignment: āya ${from}`
        : `Your assignment: āyāt ${from}–${to}`,
    word: (sura, aya, n) => `Sūra ${sura}, āya ${aya}, word ${n}`,
    noRule: 'No rule is marked here: read it clearly.',
    follows: (rule) => `decides the rule before it: ${rule}`,
    close: 'Close',
    open: 'Open in the muṣḥaf',
    assign: 'Give an assignment here',
    pick: 'Tap the first and then the last word of the assignment.',
    cancel: 'Cancel',
    halaqa: 'Ḥalaqa',
    sources: 'Sources',
    text: 'Text: Tanzil Project (CC BY 3.0)',
    textIndopak: 'IndoPak text: DigitalKhatt (MIT)',
    rules: 'Tajwīd rules: cpfair/quran-tajweed (CC BY 4.0)',
  },
  signIn: {
    eyebrow: 'Sign in',
    title: 'Welcome to ʿArḍa',
    intro:
      'Sign in so your sheikh can hear your recitations and give you assignments. No password: we send you a link and a code.',
    linkFailed: 'The link has expired or was already used. Just ask for a new one.',
    email: 'Email address',
    emailPlaceholder: 'you@example.com',
    sendLink: 'Send link',
    sentTo: (email) => `✓ Link sent to ${email}`,
    sentHint:
      'Open the email on this device and tap “Sign in to ʿArḍa”. The link and the code are valid for 15 minutes. Nothing arrived? Check your spam folder too.',
    codeLabel:
      'Does your mail app open the link in its own browser? Then enter the 6-digit code from the email here:',
    code: 'Sign-in code',
    confirm: 'Sign in',
    resend: 'Send again',
    otherEmail: 'Use another email address',
    sendFailed: 'The sign-in link could not be sent.',
    signInFailed: 'Signing in did not work.',
    passkey: 'Sign in with a passkey',
  },
  account: {
    eyebrow: 'Account',
    roles: { student: 'Student', teacher: 'Sheikh / teacher', admin: 'Admin' },
    devices: 'Signed-in devices',
    unknownDevice: 'Unknown device',
    thisDevice: 'this device',
    endOthers: 'Sign out other devices',
    endedOthers: (count) =>
      count === 1 ? '1 other device signed out.' : `${count} other devices signed out.`,
    addPasskey: 'Add a passkey',
    passkeyAdded: 'Passkey added.',
    signOut: 'Sign out',
    languageHint:
      'You see the app, receive emails and read your sheikh’s feedback in this language.',
  },
  twoFactor: {
    title: 'Two-factor sign-in',
    intro:
      'The admin area also needs a code from an authenticator app (for example Google Authenticator, Microsoft Authenticator or 1Password).',
    setUp: 'Set up',
    scan: 'Scan the QR code with your authenticator app, or type in the key.',
    qr: 'QR code for the authenticator app',
    secret: 'Key',
    code: 'Six-digit code',
    confirm: 'Confirm',
    confirmNeeded: 'Confirm this session with a code from your authenticator app.',
    confirmed: 'Confirmed for this session.',
  },
  admin: {
    eyebrow: 'Admin',
    title: 'People and roles',
    open: 'Open the admin area',
    intro:
      'Make a sheikh a teacher here. He has to have signed in once before. Every change is logged.',
    search: 'Search (e-mail or name)',
    searchButton: 'Search',
    none: 'Nobody found.',
    role: 'Role',
    you: 'you',
    blocked: 'blocked',
    block: 'Block',
    unblock: 'Unblock',
    saved: (name) => `Saved: ${name}`,
    more: 'Load more',
    unverified: 'e-mail not confirmed',
  },
  passkey: {
    'already-added': 'This device already has a passkey for ʿArḍa.',
    'stale-session':
      'For your safety: sign in again (link or code), then you can add a passkey.',
    'unknown-passkey':
      'ʿArḍa does not know this passkey (any more). Sign in with a link or code.',
    'not-verified': 'Please confirm with your face, fingerprint or your device PIN.',
    'rate-limited': 'Too many attempts – please try again in a few minutes.',
    offline: 'No connection – try again in a moment.',
    failed: 'That did not work. Try again, or use a link or code.',
  },
  plan: {
    eyebrow: 'Just for you',
    title: 'My study plan',
    intro:
      'Note what you want to learn and revise, and what you found hard. Only you see these notes; with an account you have them on all your devices.',
    newNote: 'New note',
    kind: 'Kind of note',
    kinds: { learn: 'Learn', review: 'Revise', difficulty: 'Difficulties' },
    text: 'Note',
    placeholder: {
      learn: 'e.g. memorise two pages of al-Baqara',
      review: 'e.g. revise Sūra al-Mulk',
      difficulty: 'e.g. my ḍād still sounds like dāl',
    },
    where: 'Where in the Qurʾān (optional)',
    whereNone: 'no place',
    whereAyat: 'Āyāt of a sūra',
    wherePages: 'Pages of the muṣḥaf',
    add: 'Add note',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    remove: 'Delete',
    done: { learn: 'Learnt', review: 'Revised', difficulty: 'Solved' },
    empty: {
      learn: 'Nothing planned yet. What do you want to learn next?',
      review: 'Nothing to revise noted yet.',
      difficulty:
        'No difficulties noted. Write down what you find hard so you remember it.',
    },
    todayEmpty: 'Note what you want to learn and revise, and what you found hard.',
    more: (count) => `and ${count} more`,
    open: 'Open study plan',
  },
  struggles: {
    title: 'Rule by rule',
    intro:
      'Who still struggles with which rule: mistakes in the games that have not stuck yet, and quick remarks and marked words in the answers of the last 90 days.',
    none: 'Nobody is struggling with a rule right now, or nothing has been practised yet.',
    open: (count) =>
      count === 1 ? '1 game mistake open' : `${count} game mistakes open`,
    remarks: (count) => `noted ${count}×`,
    marks: (count) => (count === 1 ? '1 word marked' : `${count} words marked`),
    last: (day) => `last ${day}`,
    topics: { madd: 'Madd (lengthening)', makhraj: 'Pronouncing the letters (makhārij)' },
    card: 'Rule card',
    unnamed: 'no name',
    studentNote:
      'Your sheikh sees which tajwīd rules you still make mistakes on in the games: only how many, not your answers.',
  },
  arda: {
    title: 'ʿArḍ notebook',
    intro:
      'Who recited which sūra when, with your verdict. Answered recordings appear here by themselves; add what was recited in class.',
    none: 'Nothing recorded yet.',
    sura: (n) => `Sūra ${n}`,
    times: (count) => (count === 1 ? 'once' : count === 2 ? 'twice' : `${count} times`),
    last: (day) => `last ${day}`,
    history: 'History',
    hideHistory: 'Close history',
    fromRecording: 'Recording',
    inPerson: 'In class',
    formTitle: 'Add a recitation from class',
    student: 'Student',
    day: 'Day',
    verdict: 'Verdict',
    submit: 'Add',
    written: 'Added.',
    remove: 'Remove',
    mine: 'Your ʿarḍ',
    mineIntro: 'Which sūras you recited to your sheikh and how he found them.',
  },
  recite: {
    voiceNote: 'Voice note (optional, up to 2 minutes)',
    voiceRecord: 'Record a voice note',
    voiceRemove: 'Remove voice note',
    voiceFrom: (name) =>
      name ? `Voice note from ${name}` : 'Voice note from your sheikh',
    markedWords: 'Marked words',
    topicFor: (word) => `Rule for ${word}`,
    noTopic: '– no rule –',
    marksHint: 'While you listen, tap the words that are not right yet.',
    marked: 'marked',
    marksCount: (count) => (count === 1 ? '1 word marked' : `${count} words marked`),
    record: 'Record',
    title: (sura, from, to) =>
      from === to
        ? `Record sūra ${sura} · āya ${from}`
        : `Record sūra ${sura} · āyāt ${from}–${to}`,
    recordAssignment: 'Record the assignment',
    recordSection: 'Record this passage',
    /** One sūra's part of a page assignment that runs across sūras. */
    recordPart: (name: string, from: number, to: number) =>
      `Record ${name} ${from}–${to}`,
    consentTitle: 'Before you record',
    consentText:
      'Only you and the teachers of the ḥalaqa you send it to can hear your recording. It stays private until you delete it and is used for nothing else.',
    consentAgree: 'I agree',
    start: 'Start recording',
    stop: 'Stop',
    running: (time) => `Recording · ${time}`,
    again: 'Record again',
    send: 'Send to my sheikh',
    sendTo: 'Send to',
    sent: 'Sent. Your sheikh will listen to it.',
    queued: 'Saved. It will be sent as soon as you are online again.',
    noHalaqa: "Join your sheikh's ḥalaqa first; then you can send him recordings.",
    denied: 'The microphone is not allowed. Allow it in your browser settings.',
    unsupported: 'This browser cannot record.',
    close: 'Close',
    pending: (count) =>
      count === 1
        ? '1 recording is waiting for a connection.'
        : `${count} recordings are waiting for a connection.`,
    mine: 'Your recitations',
    waiting: 'waiting for your sheikh',
    verdicts: { good: 'good', again: 'again' },
    from: (name) => (name ? `${name} writes:` : 'Your sheikh writes:'),
    delete: 'Delete',
    queue: 'To listen to',
    queueEmpty: 'No recording is waiting right now.',
    answered: 'Answered',
    good: 'Good',
    againVerdict: 'Again',
    remark: 'Quick remark',
    noRemark: '– none –',
    note: 'Your own words (optional)',
    answer: 'Send answer',
    change: 'Change',
    older: 'Show older',
    seconds: (ms) => `${Math.max(1, Math.round(ms / 1000))} s`,
    range: (sura, from, to) =>
      from === to ? `Sūra ${sura} · āya ${from}` : `Sūra ${sura} · āyāt ${from}–${to}`,
  },
  errors: {
    second_factor_required: 'Confirm the two-factor sign-in first.',
    cannot_change_self: 'You cannot change your own role here.',
    invalid_code: 'The code is not right.',
    locked: 'Too many wrong codes. Wait 15 minutes.',
    already_enabled: 'Two-factor sign-in is already set up.',
    not_set_up: 'Set up two-factor sign-in first.',
    invalid_query: 'The search is not valid.',
    offline: 'No connection.',
    unauthorized: 'Please sign in.',
    forbidden: 'You are not allowed to do this.',
    not_found: 'Not found.',
    invalid_body: 'The input is not valid.',
    invalid_redirect: 'Invalid return address.',
    cross_origin: 'This request came from another site.',
    INVALID_OTP: 'The code is not correct.',
    OTP_EXPIRED: 'The code has expired – ask for a new link.',
    TOO_MANY_ATTEMPTS: 'Too many wrong attempts – ask for a new link.',
    invite_invalid:
      'This link has expired or is not valid. Ask your sheikh for a new one.',
    halaqa_full: 'This one-to-one ḥalaqa already has a student.',
    too_many_halaqat: 'You have reached the maximum number of ḥalaqāt.',
    too_many_assignments: 'This ḥalaqa has reached the maximum number of assignments.',
    too_many_recordings:
      'You have reached the maximum number of recordings. Delete older ones.',
    too_many_entries: 'This student already has a great many entries in the notebook.',
    too_large: 'The recording is too long.',
    unsupported_media_type: 'This recording format is not supported.',
    not_reviewed: 'Answer the recording first, then record the voice note.',
    generic: (status) => `Server error (${status}).`,
  },
  remarks: {
    ghunnaShort: 'Ghunna too short – hold it for 2 counts.',
    ghunnaLong: 'Ghunna too long – only 2 counts.',
    nunTooClear: 'Nūn too clear – it is hidden here (ikhfāʾ).',
    qalqalaMissing: 'Qalqala missing – let the sound bounce back briefly.',
    maddShort: 'Madd too short – lengthen it more.',
    good: 'Good, keep it like this.',
    sinVoiced: 'Your sīn buzzes – keep it voiceless and sharp, never like a z.',
    zayVoiceless: 'Zāy is voiced – let it buzz, but keep it thin.',
    raRolled: 'Rāʾ with the tip of the tongue, one light tap – do not roll it.',
  },
  feedback: {
    eyebrow: 'For the sheikh',
    title: 'Feedback in your students’ language',
    intro:
      'Write in your language. Each student reads quick remarks in their own language; ʿArḍa translates free text, and tajwīd terms and āyāt stay unchanged.',
    quick: 'Quick remarks',
    write: 'Your own feedback',
    from: 'I write in',
    to: 'Student reads in',
    placeholder: 'e.g. Your ghunna on “min sharri” was too short.',
    preview: 'What your student reads',
    translate: 'Show translation',
    machine: 'machine-translated',
    original: 'Original',
    sameLanguage: 'Same language – no translation needed.',
    unavailable: {
      not_configured: 'Translation is not set up on this server.',
      limit: 'Daily translation limit reached – it continues tomorrow.',
      refused: 'Translation not available. Your student gets the original.',
      failed: 'Translation not possible right now. Your student gets the original.',
    },
  },
  lab: {
    eyebrow: 'Lab',
    title: 'Letter lab',
    intro:
      'Where does a sound come from? The head shows the five areas. Pick a letter: you see its point, hear real words and practise the difference.',
    sets: {
      first: {
        title: 'First set: Sīn, Zāy, Ṣād and Rāʾ',
        hint: 'The three whistling letters and Rāʾ – often the hardest for German speakers.',
      },
      throat: {
        title: 'The throat: Hamza, Hāʾ, ʿAyn, Ḥāʾ, Ghayn and Khāʾ',
        hint: 'Six sounds from the throat, from the deepest up. German has only the h and the glottal stop – the others are new.',
      },
      tongueBack: {
        title: 'Back and middle of the tongue: Qāf, Kāf, Jīm, Shīn and Yāʾ',
        hint: 'Five sounds from the body of the tongue. Qāf and Kāf sit close together – here you learn to keep them apart.',
      },
      tongueTip: {
        title: 'Ḍād and the tip of the tongue: Ḍād, Ṭāʾ, Dāl and Tāʾ',
        hint: 'Three sounds from the same place – heavy, voiced, breathed – and Ḍād, which only Arabic has. Here you hear what sets them apart.',
      },
      teeth: {
        title: 'The teeth, Lām and Nūn: Thāʾ, Dhāl, Ẓāʾ, Lām and Nūn',
        hint: 'Three sounds with the tip of the tongue at the upper front teeth – German speakers easily turn them into s and z –, and Lām and Nūn from the gum ridge.',
      },
      lips: {
        title: 'The lips: Fāʾ, Bāʾ, Mīm and Wāw',
        hint: 'Four sounds from the lips, almost all familiar. Here it is about the details: qalqala, ghunna and rounded lips.',
      },
    },
    more: 'All 28 letters are here. Your sheikh is still checking the drawing and the texts.',
    draft: 'Draft – the sheikh is still checking',
    back: 'To the lab',
    /** Unit 1's test, heard across the whole lab (ADR-0024). */
    unitTest:
      'Ten words from across the lab, by ear only. Each one says which letters it could be.',
    diagram: {
      title: 'The head from the side',
      description:
        'Side view of the head with five areas: Jawf (mouth space), Ḥalq (throat), Lisān (tongue), Shafatān (lips) and Khayshūm (nasal cavity).',
      legend: 'The five areas',
      licence: 'Drawing: ʿArḍa, CC BY 4.0 – a draft, your sheikh is still checking it.',
    },
    areas: {
      jawf: { name: 'Jawf', gloss: 'mouth and throat space: the long vowels' },
      halq: { name: 'Ḥalq', gloss: 'throat: six letters' },
      lisan: { name: 'Lisān', gloss: 'tongue: eighteen letters' },
      shafatan: { name: 'Shafatān', gloss: 'lips: four letters' },
      khayshum: { name: 'Khayshūm', gloss: 'nasal cavity: the ghunna' },
    },
    points: {
      whistle: { line1: 'Tongue tip', line2: 'front teeth' },
      ra: { line1: 'Tongue tip', line2: 'gum ridge' },
      halqDeep: { line1: 'Deepest part', line2: 'of the throat' },
      halqMid: { line1: 'Middle', line2: 'of the throat' },
      halqNear: { line1: 'Upper part', line2: 'of the throat' },
      tongueFar: { line1: 'Back of tongue', line2: 'soft palate' },
      tongueBack: { line1: 'Back of tongue', line2: 'just before Qāf' },
      tongueMid: { line1: 'Mid-tongue', line2: 'hard palate' },
      tongueSide: { line1: 'Edge of tongue', line2: 'upper molars' },
      tongueTip: { line1: 'Tip of tongue', line2: 'tooth roots' },
      teeth: { line1: 'Tip of tongue', line2: 'incisor edges' },
      lam: { line1: 'Front edges', line2: 'gum ridge' },
      nun: { line1: 'Tip of tongue', line2: 'before Lām' },
      lipTeeth: { line1: 'Lower lip', line2: 'upper teeth' },
      lips: { line1: 'Both', line2: 'lips' },
    },
    letters: {
      sin: {
        name: 'Sīn',
        short: 'light, sharp, voiceless',
        makhraj:
          'The tip of the tongue rests at the lower front teeth (some teach: the upper). A narrow gap stays open between tongue and upper teeth – the air whistles through it.',
        mistakes: [
          'German voices an s before a vowel: “Sonne” sounds like [z]. So Sīn easily becomes Zāy. Keep Sīn voiceless and sharp – no buzz.',
          'Do not make it heavy: Sīn is light. Raise the back of the tongue and it sounds like Ṣād.',
          'Do not lisp: the tongue stays behind the teeth. If it shows, it becomes Thāʾ.',
        ],
      },
      zay: {
        name: 'Zāy',
        short: 'light, buzzing',
        makhraj:
          'Like Sīn and Ṣād: the tip of the tongue rests at the lower front teeth (some teach: the upper), a narrow gap stays open, the air whistles through.',
        mistakes: [
          'Zāy is voiced: put your hand on your throat – you feel the buzz.',
          'It stays thin and light: never heavy like Ṣād, never like the German z (ts).',
          'Do not let it go voiceless before sukūn or at the end of a word, as German does (“Haus”). Otherwise it becomes Sīn.',
        ],
      },
      sad: {
        name: 'Ṣād',
        short: 'heavy, full',
        makhraj:
          'The same point as Sīn: the tip of the tongue at the front teeth, a narrow gap. On top, the back of the tongue rises and lies broadly against the palate.',
        mistakes: [
          'Ṣād is heavy: the back of the tongue rises to the palate (iṭbāq). The sound becomes full and dark.',
          'Sīn is light: the back of the tongue stays low. You also hear the difference in the vowel after it.',
          'Heavy does not mean voiced: Ṣād stays voiceless like Sīn, without a buzz.',
        ],
      },
      ra: {
        name: 'Rāʾ',
        short: 'one light tap of the tongue tip',
        makhraj:
          'The tip of the tongue, with a little of its back, taps the gum ridge behind the upper front teeth – slightly further back than for Nūn.',
        mistakes: [
          'With the tip of the tongue, not in the throat: no German throat r.',
          'One single light tap, not rolled. You learn takrīr in order to avoid it.',
          'Do not swallow it at the end of a word as in German “Vater”: the Rāʾ is pronounced.',
          'Heavy or light depends on the vowel: heavy with fatḥa or ḍamma, light with kasra.',
        ],
      },
      hamza: {
        name: 'Hamza',
        short: 'a clear onset of the voice',
        makhraj:
          'The deepest part of the throat, at the larynx: the glottis closes for a moment and opens with a jolt – the same place as Hāʾ.',
        mistakes: [
          'You know it from German: the glottal stop in “be-achten” or “Spiegel-ei”. That is how Hamza begins – clearly, not swallowed.',
          'Do not press: Hamza is a short, firm onset (Shidda). Pressed from the middle of the throat it becomes ʿAyn – أَلِيمٌ (“painful”) turns into عَلِيمٌ (“knowing”).',
          'Make it heard in the middle of a word and before sukūn too; do not skip it.',
        ],
      },
      ha: {
        name: 'Hāʾ',
        short: 'a soft breath',
        makhraj:
          'The deepest part of the throat, like Hamza: the air flows out freely, without friction.',
        mistakes: [
          'Hāʾ is the German h – but always heard: before sukūn and at the end of a word too, where German swallows it (“sehen”).',
          'Do not scrape or press: a narrow throat turns Hāʾ into Ḥāʾ – أُهِلَّ becomes أُحِلَّ, another word.',
          'Soft and whispered (Hams): no humming.',
        ],
      },
      ayn: {
        name: 'ʿAyn',
        short: 'pressed, from the middle of the throat, voiced',
        makhraj:
          'The middle of the throat: it narrows, and the voice goes on sounding. A full, pressed sound – German has nothing like it.',
        mistakes: [
          'Do not drop it or replace it with the glottal stop: عَلِيمٌ (“knowing”) would become أَلِيمٌ (“painful”).',
          'The voice keeps sounding (Tawassuṭ): no hard stop as with Hamza.',
          'Keep it light (Istifāl): the vowel after ʿAyn is not dark.',
        ],
      },
      hha: {
        name: 'Ḥāʾ',
        short: 'a strong breath from the narrowed throat',
        makhraj:
          'The middle of the throat, like ʿAyn: the throat narrows and the air rubs audibly – without voice.',
        mistakes: [
          'Not like the German h: without the narrowing أُحِلَّ (“was made lawful”) becomes أُهِلَّ (“was invoked”).',
          'Not like the ch in “Bach”: there the back of the tongue rubs the palate – that is Khāʾ. For Ḥāʾ the mouth stays free, only the throat narrows.',
          'Voiceless (Hams): if it hums, it becomes ʿAyn.',
        ],
      },
      ghayn: {
        name: 'Ghayn',
        short: 'heavy, voiced, a soft friction',
        makhraj:
          'The upper part of the throat, near the mouth, like Khāʾ: the air rubs at the back and the voice sounds with it.',
        mistakes: [
          'Close to the German uvular r in “rot”, but it does not rattle: Ghayn rubs softly and evenly.',
          'Voiced: without the hum it becomes Khāʾ – غَيْرَ (“except”) turns into خَيْرَ (“good”).',
          'Heavy (Istiʿlāʾ): the back of the tongue rises, the vowel after it sounds full.',
        ],
      },
      kha: {
        name: 'Khāʾ',
        short: 'heavy, voiceless, like the ch in “Bach”',
        makhraj:
          'The upper part of the throat, near the mouth, like Ghayn: the air rubs audibly, without voice.',
        mistakes: [
          'Like the ch in “Bach”, never like in “ich”: the light ch is too far forward.',
          'Heavy (Istiʿlāʾ): the vowel after it sounds dark and full – خَلَقَ, not light.',
          'Do not confuse it with Ḥāʾ: Khāʾ rubs higher up; for Ḥāʾ only the throat narrows.',
        ],
      },
      qaf: {
        name: 'Qāf',
        short: 'heavy, deep, with qalqala',
        makhraj:
          'The very back of the tongue rises to the soft palate above it and closes briefly – further back than Kāf.',
        mistakes: [
          'Not like the k in German or English: Qāf is made further back, at the soft palate – otherwise قَدْحًا (“striking sparks”) becomes كَدْحًا (“toil”).',
          'Heavy (Istiʿlāʾ): the back of the tongue rises, the vowel after it sounds full and dark.',
          'No breath after it: Qāf is voiced and firm. With sukūn it bounces briefly (qalqala) – ٱلْقَدْرِ.',
        ],
      },
      kaf: {
        name: 'Kāf',
        short: 'light, with a breath',
        makhraj:
          'The back of the tongue against the palate, a little further forward and lower than for Qāf.',
        mistakes: [
          'Stay light (Istifāl): the vowel after it sounds bright. A dark Kāf sounds like Qāf.',
          'With a soft breath (Hams), above all with sukūn – audible, but not overdone.',
          'Do not pull it back to Qāf: otherwise كَدْحًا (“toil”) becomes قَدْحًا (“striking sparks”).',
        ],
      },
      jim: {
        name: 'Jīm',
        short: 'firm, voiced, with qalqala',
        makhraj:
          'The middle of the tongue against the hard palate above it – the same place as Shīn and Yāʾ.',
        mistakes: [
          'Firm (Shidda): the tongue closes completely, like the j in “jungle” – not soft like the s in “measure”.',
          'Voiced: without voice and without the closure it becomes Shīn – جَآءَ (“he came”) becomes شَآءَ (“he willed”).',
          'With sukūn, Jīm bounces briefly (qalqala), without adding a vowel.',
        ],
      },
      shin: {
        name: 'Shīn',
        short: 'voiceless, the air spreads',
        makhraj:
          'The middle of the tongue towards the hard palate, like Jīm and Yāʾ – but not closed: the air flows through and spreads in the mouth (Tafashshī).',
        mistakes: [
          'Like the sh in “ship”, but without pushing the lips forward: they stay relaxed.',
          'Not like Sīn: for Shīn the middle of the tongue meets the palate, not the tip at the teeth; it does not whistle.',
          'Light (Istifāl) and voiceless (Hams): no buzz like the s in “measure”.',
        ],
      },
      ya: {
        name: 'Yāʾ',
        short: 'soft, voiced, like the y in “yes”',
        makhraj:
          'The middle of the tongue towards the hard palate, like Jīm and Shīn – with room between, the sound flows on.',
        mistakes: [
          'Like the y in “yes”: soft, without friction and without a stop.',
          'Do not let it become Jīm: the tongue does not press against the palate – otherwise سُيِّرَتْ (“set in motion”) becomes سُجِّرَتْ (“set ablaze”).',
          'A Yāʾ with a vowel is a consonant, not a long vowel: يَوْمِ begins with y, not with i.',
        ],
      },
      dad: {
        name: 'Ḍād',
        short: 'heavy, voiced, only in Arabic',
        makhraj:
          'One edge of the tongue – or both – rests against the upper molars, and the tongue rises broadly to the palate. The sound runs along the whole edge (Istiṭāla).',
        mistakes: [
          'Not like the d in German or English: Ḍād is heavy, the tongue lies broadly against the palate – otherwise بَعْضَ (“some”) becomes بَعْدَ (“after”).',
          'Not like Ẓāʾ: the tip of the tongue stays behind the teeth and does not show.',
          'No qalqala with sukūn: Ḍād is not one of ق ط ب ج د.',
        ],
      },
      tta: {
        name: 'Ṭāʾ',
        short: 'heavy, firm, with qalqala',
        makhraj:
          'The tip of the tongue at the roots of the upper front teeth, like Dāl and Tāʾ. The back of the tongue also lies broadly against the palate.',
        mistakes: [
          'Not like a plain t: Ṭāʾ is heavy (Iṭbāq), the vowel after it sounds full and dark.',
          'No breath (Jahr): the German or English t is aspirated, Ṭāʾ is not – the breath is held.',
          'With sukūn, Ṭāʾ bounces briefly (qalqala).',
        ],
      },
      dal: {
        name: 'Dāl',
        short: 'light, voiced, with qalqala',
        makhraj:
          'The tip of the tongue at the roots of the upper front teeth, like Ṭāʾ and Tāʾ.',
        mistakes: [
          'Do not let it turn into t at the end of a word or before sukūn, as German does (“Rad”): Dāl stays voiced and bounces (qalqala).',
          'Stay light: a heavy Dāl sounds like Ḍād – بَعْدَ (“after”) becomes بَعْضَ (“some”).',
          'Do not confuse it with Tāʾ: without voice, هَادُوا۟ (“those who are Jewish”) becomes هَاتُوا۟ (“bring!”).',
        ],
      },
      ta: {
        name: 'Tāʾ',
        short: 'light, with a breath',
        makhraj:
          'The tip of the tongue at the roots of the upper front teeth, like Ṭāʾ and Dāl.',
        mistakes: [
          'Stay light (Istifāl): the vowel after it sounds bright. A dark Tāʾ becomes Ṭāʾ.',
          'With a soft breath (Hams), above all with sukūn – like an ordinary t, but not overdone.',
          'Do not voice it: if it buzzes, it becomes Dāl – هَاتُوا۟ (“bring!”) becomes هَادُوا۟.',
        ],
      },
      tha: {
        name: 'Thāʾ',
        short: 'light, voiceless, like th in “think”',
        makhraj:
          'The tip of the tongue touches the edges of the upper front teeth – it shows a little.',
        mistakes: [
          'Not like s: the tongue has to reach the teeth. If it stays behind them, Thāʾ becomes Sīn.',
          'Voiceless (Hams): if it buzzes, it becomes Dhāl.',
          'Stay light (Istifāl): if the back of the tongue rises, it sounds heavy like Ẓāʾ.',
        ],
      },
      dha: {
        name: 'Dhāl',
        short: 'light, voiced, like th in “this”',
        makhraj:
          'The same place as Thāʾ: the tip of the tongue at the edges of the upper front teeth.',
        mistakes: [
          'Not like z: the tongue has to reach the teeth. If it stays behind them, Dhāl becomes Zāy.',
          'Voiced (Jahr): without voice it becomes Thāʾ.',
          'Stay light (Istifāl): a heavy Dhāl becomes Ẓāʾ.',
        ],
      },
      zza: {
        name: 'Ẓāʾ',
        short: 'heavy, voiced, the tongue at the teeth',
        makhraj:
          'The same place as Dhāl: the tip of the tongue at the edges of the upper front teeth. The back of the tongue also lies broadly against the palate.',
        mistakes: [
          'Not like z: the tongue has to reach the teeth, or it becomes a heavy Zāy.',
          'Heavy (Iṭbāq): the vowel after it sounds full and dark – otherwise it becomes Dhāl.',
          'Do not confuse it with Ḍād: for Ẓāʾ the tip of the tongue is at the teeth, for Ḍād the edge of the tongue is at the molars.',
        ],
      },
      lam: {
        name: 'Lām',
        short: 'light, like l in “leaf”',
        makhraj:
          'The front edges of the tongue with its tip at the gum ridge behind the upper front teeth.',
        mistakes: [
          'Bright like the l in “leaf”, not dark like in “full”: Lām is light by nature.',
          'Only the Lām in ٱللَّه becomes heavy after fatḥa or ḍamma; after kasra it stays light – لِلَّهِ.',
          'Keep it clear with sukūn, do not swallow it – لَمْ.',
        ],
      },
      nun: {
        name: 'Nūn',
        short: 'light, with ghunna',
        makhraj:
          'The tip of the tongue at the gum ridge, a little in front of Lām, nearer the tip. Part of the sound comes from the nasal cavity (ghunna).',
        mistakes: [
          'Like an ordinary n – but with shadda held clearly and nasalised (ghunna), about two beats long.',
          'Nūn sākin and tanwīn follow their own rules: clear, hidden or merged. You learn them on the path.',
          'Do not confuse it with Lām: for Nūn part of the air goes through the nose – otherwise إِنَّا (“we”) becomes إِلَّآ (“except”).',
        ],
      },
      fa: {
        name: 'Fāʾ',
        short: 'light, voiceless, like f',
        makhraj:
          'The inside of the lower lip against the edges of the upper front teeth.',
        mistakes: [
          'Like an ordinary f – but never let it become v: Fāʾ is always voiceless (Hams).',
          'Do not confuse it with Thāʾ: for Fāʾ the air rubs at the lip, for Thāʾ at the tongue between the teeth – يُنفِقُ (“he spends”), not يُوثِقُ (“he binds”).',
          'Stay light (Istifāl): the vowel after it sounds bright.',
        ],
      },
      ba: {
        name: 'Bāʾ',
        short: 'voiced, firm, with qalqala',
        makhraj: 'Both lips close firmly and open with a jolt.',
        mistakes: [
          'Do not let it turn into p at the end of a word or before sukūn, as German does (“ab”): Bāʾ stays voiced and bounces (qalqala).',
          'Firm (Shidda): the lips close completely and the sound stops.',
          'Do not confuse it with Wāw: for Bāʾ the lips close – بَلَدًا (“a land”), not وَلَدًا (“a child”).',
        ],
      },
      mim: {
        name: 'Mīm',
        short: 'lips closed, with ghunna',
        makhraj:
          'Both lips close, more lightly than for Bāʾ; the sound goes through the nose (ghunna).',
        mistakes: [
          'With shadda, hold the nasal sound clearly, about two beats – ثُمَّ.',
          'A mīm sākin is hidden before Bāʾ and merged before Mīm; before every other letter it stays clear.',
          'Do not confuse it with Wāw: for Mīm the lips close completely – لَمْ (“not”), not لَوْ (“if”).',
        ],
      },
      waw: {
        name: 'Wāw',
        short: 'soft, voiced, rounded lips',
        makhraj: 'Both lips round forward without closing.',
        mistakes: [
          'Not like the German w, where the teeth touch the lower lip: for Wāw only the lips round, as for the w in “water”.',
          'Do not let it become Bāʾ: the lips do not close – وَلَدًا (“a child”), not بَلَدًا (“a land”).',
          'A Wāw with a vowel is a consonant, not a long vowel: وُجُوهٌ begins with w, not with u.',
        ],
      },
    },
    makhraj: 'Makhraj · where it is made',
    sifat: 'Ṣifāt · its qualities',
    sifa: {
      shidda: {
        name: 'Shidda',
        meaning:
          'Firm: the sound is held back completely and stops – it does not flow on.',
      },
      hams: {
        name: 'Hams',
        meaning: 'Whisper: the breath flows on, the voice does not vibrate.',
      },
      jahr: {
        name: 'Jahr',
        meaning: 'Voiced: the breath is held back, the voice vibrates.',
      },
      rakhawa: {
        name: 'Rakhāwa',
        meaning: 'Soft: the sound flows on, it does not stop short.',
      },
      tawassut: {
        name: 'Tawassuṭ (Bayniyya)',
        meaning: 'In between: the sound flows only a little, neither firm nor soft.',
      },
      istifal: {
        name: 'Istifāl',
        meaning:
          'Low: the back of the tongue does not rise to the palate. Such letters sound light by nature; only rāʾ (and the lām of “Allāh”) can turn heavy, depending on its position.',
      },
      istila: {
        name: 'Istiʿlāʾ',
        meaning:
          'High: the back of the tongue rises to the palate, the sound becomes heavy.',
      },
      infitah: {
        name: 'Infitāḥ',
        meaning: 'Open: space stays between tongue and palate.',
      },
      itbaq: {
        name: 'Iṭbāq',
        meaning:
          'Covered: the tongue lies broadly against the palate, the sound becomes full.',
      },
      ismat: {
        name: 'Iṣmāt',
        meaning:
          'Restrained: the sound does not glide off the tongue easily (the opposite of idhlāq).',
      },
      idhlaq: {
        name: 'Idhlāq',
        meaning: 'Fluent: the sound glides easily off the tongue tip.',
      },
      safir: {
        name: 'Ṣafīr',
        meaning: 'Whistle: a fine tone as the air streams through the narrow gap.',
      },
      inhiraf: {
        name: 'Inḥirāf',
        meaning: 'Inclining: the sound leans a little away from its point.',
      },
      takrir: {
        name: 'Takrīr',
        meaning:
          'Repetition: the tongue tends to trill – you know it in order to avoid it.',
      },
      qalqala: {
        name: 'Qalqala',
        meaning:
          'Bounce: with sukūn the sound bounces briefly, like a small echo (ق ط ب ج د).',
      },
      tafashshi: {
        name: 'Tafashshī',
        meaning: 'Spreading: the air spreads through the whole mouth (Shīn only).',
      },
      istitala: {
        name: 'Istiṭāla',
        meaning:
          'Lengthening: the sound runs along the whole edge of the tongue, from the back to the tip (Ḍād only).',
      },
      ghunna: {
        name: 'Ghunna',
        meaning:
          'Nasal sound: a sound from the nasal cavity that belongs to Nūn and Mīm.',
      },
    },
    mistakesTitle: 'Typical mistakes',
    raRules: {
      title: 'Rāʾ: heavy or light',
      heavy: 'With fatḥa or ḍamma, Rāʾ is heavy (tafkhīm): a full, dark sound.',
      light: 'With kasra, Rāʾ is light (tarqīq): flat and bright.',
      pending:
        'Only the clear cases, as a summary. Rāʾ with sukūn and the other rules follow once your sheikh has checked them.',
    },
    listen: {
      title: 'Listen and repeat',
      intro:
        'al-Ḥuṣarī, teaching recitation, word by word. Tap a word, listen and repeat – slowly at first.',
      play: (sura, aya, n) => `Listen: sūra ${sura}, āya ${aya}, word ${n}`,
      where: (sura, aya) => `${sura}:${aya}`,
      speed: 'Speed',
      loading: 'Loading the word timings …',
      failed: 'The recitation does not load. Check your connection.',
      source:
        'Recitation: al-Ḥuṣarī (muʿallim), EveryAyah.com · Word timings: quran-align (Collin Fair), CC BY 4.0',
    },
    quiz: {
      whistling: {
        title: 'Which letter?',
        intro: 'Ten words, by ear only: do you hear Sīn, Zāy or Ṣād?',
        question: 'Which letter do you hear?',
      },
      hamzaAyn: {
        title: 'Hamza or ʿAyn?',
        intro:
          'Ten words, by ear only: a clear onset (Hamza) or a pressed sound from the throat (ʿAyn)?',
        question: 'Which letter do you hear?',
      },
      hSounds: {
        title: 'Hāʾ, Ḥāʾ or Khāʾ?',
        intro:
          'Ten words, by ear only: a soft breath, a strong one from the narrowed throat, or friction as in “Bach”?',
        question: 'Which letter do you hear?',
      },
      khGh: {
        title: 'Khāʾ or Ghayn?',
        intro:
          'Ten words, by ear only: does it rub without voice (Khāʾ) or with voice (Ghayn)?',
        question: 'Which letter do you hear?',
      },
      qafKaf: {
        title: 'Qāf or Kāf?',
        intro:
          'Ten words, by ear only: deep and heavy (Qāf) or further forward and light (Kāf)?',
        question: 'Which letter do you hear?',
      },
      middle: {
        title: 'Jīm, Shīn or Yāʾ?',
        intro:
          'Ten words, by ear only: firm with voice (Jīm), a wide rush of air (Shīn) or soft like the y in “yes” (Yāʾ)?',
        question: 'Which letter do you hear?',
      },
      dadDal: {
        title: 'Ḍād or Dāl?',
        intro:
          'Ten words, by ear only: heavy and full (Ḍād) or light like an ordinary d (Dāl)?',
        question: 'Which letter do you hear?',
      },
      tip: {
        title: 'Ṭāʾ, Dāl or Tāʾ?',
        intro:
          'Ten words, by ear only: heavy (Ṭāʾ), voiced (Dāl) or light with a breath (Tāʾ)?',
        question: 'Which letter do you hear?',
      },
      teeth: {
        title: 'Thāʾ, Dhāl or Ẓāʾ?',
        intro:
          'Ten words, by ear only: without voice (Thāʾ), with voice (Dhāl) or heavy with voice (Ẓāʾ)?',
        question: 'Which letter do you hear?',
      },
      lamNun: {
        title: 'Lām or Nūn?',
        intro:
          'Ten words, by ear only: does the sound flow along the edge of the tongue (Lām) or through the nose (Nūn)?',
        question: 'Which letter do you hear?',
      },
      faTha: {
        title: 'Fāʾ or Thāʾ?',
        intro:
          'Ten words, by ear only: does the air rub at the lip (Fāʾ) or at the tongue between the teeth (Thāʾ)?',
        question: 'Which letter do you hear?',
      },
      lips: {
        title: 'Bāʾ, Mīm or Wāw?',
        intro:
          'Ten words, by ear only: closed with a jolt (Bāʾ), closed through the nose (Mīm) or round and open (Wāw)?',
        question: 'Which letter do you hear?',
      },
      weight: {
        title: 'Heavy or light?',
        intro: 'Ten words with Rāʾ: does it sound heavy or light?',
        question: 'How does the Rāʾ sound?',
      },
      start: 'Start the quiz',
      listen: 'Listen',
      listenAgain: 'Listen again',
      options: 'Answers',
      weights: { heavy: 'heavy', light: 'light' },
      why: {
        hamza: 'Hamza: a short, firm onset – no pressing.',
        ha: 'Hāʾ: a soft, open breath.',
        ayn: 'ʿAyn: pressed from the middle of the throat, the voice sounds.',
        hha: 'Ḥāʾ: a strong breath from the narrowed throat, no friction above.',
        ghayn: 'Ghayn: a soft friction with voice.',
        kha: 'Khāʾ: friction without voice, as in “Bach”.',
        qaf: 'Qāf: deep and heavy, the vowel sounds dark.',
        kaf: 'Kāf: further forward, light, with a soft breath.',
        jim: 'Jīm: firm and voiced, like the j in “jungle”.',
        shin: 'Shīn: a wide rush of air without voice.',
        ya: 'Yāʾ: soft, like the y in “yes”.',
        dad: 'Ḍād: heavy, the tongue lies broadly against the palate.',
        tta: 'Ṭāʾ: heavy and firm, without a breath.',
        dal: 'Dāl: light and voiced.',
        ta: 'Tāʾ: light, with a soft breath.',
        tha: 'Thāʾ: at the teeth, without voice.',
        dha: 'Dhāl: at the teeth, with voice, light.',
        zza: 'Ẓāʾ: at the teeth, with voice, heavy.',
        lam: 'Lām: bright, the sound flows along the edge of the tongue.',
        nun: 'Nūn: part of the sound comes from the nose.',
        fa: 'Fāʾ: the air rubs at the lip.',
        ba: 'Bāʾ: the lips close completely, with voice.',
        mim: 'Mīm: the lips are closed, the sound goes through the nose.',
        waw: 'Wāw: rounded lips, not closed.',
        sin: 'Sīn: light, sharp and voiceless.',
        zay: 'Zāy: voiced – it buzzes – but thin.',
        sad: 'Ṣād: heavy, the back of the tongue rises.',
        heavy: 'Rāʾ with fatḥa or ḍamma: heavy.',
        light: 'Rāʾ with kasra: light.',
      },
      back: 'To the letter',
    },
    pairs: {
      title: 'Compare pairs',
      intro: 'Hear both words one after the other and listen only for the one sound.',
      playBoth: 'Hear both',
      exact: 'Only this sound differs.',
      near: 'Similar: a vowel or a sound next to it differs too.',
      rare: 'Exact pairs are rare in Juzʾ ʿAmma, al-Fātiḥa and al-Baqara, so most pairs here are near pairs.',
    },
    self: {
      title: 'Practise yourself',
      text: 'Repeat every word three times. Then record an āya with this letter and send it to your sheikh – he listens for exactly this sound.',
      pick: 'Āya',
      record: 'Record this āya',
    },
  },
  soon: {
    eyebrow: 'In progress',
    notFound: { title: 'Not found', text: 'This page does not exist.' },
    mushaf: {
      title: 'The muṣḥaf',
      text: 'The IndoPak muṣḥaf with tajwīd colours: tap a letter, hear the reciter word by word, slowly and on a loop.',
    },
    sheikh: {
      title: 'My sheikh',
      text: 'Your ḥalaqa, his assignments on the page, your recitations in his listening queue and the ʿarḍ log.',
    },
  },
};
