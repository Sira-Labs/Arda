/** French (ADR-0020); typed against the German source catalog. Learners are addressed with "tu". */
import type { Messages } from './de';

export const fr: Messages = {
  nav: {
    brand: 'ʿArḍa',
    label: 'Navigation principale',
    today: 'Aujourd’hui',
    path: 'Parcours',
    mushaf: 'Muṣḥaf',
    lab: 'Labo',
    sheikh: 'Cheikh',
  },
  brand: {
    tagline: 'Réciter, être entendu, être corrigé.',
  },
  language: { label: 'Langue' },
  today: {
    eyebrow: 'Aujourd’hui',
    greeting: (name) => (name ? `Assalāmu ʿalaikum, ${name}` : 'Assalāmu ʿalaikum'),
    account: 'Compte',
    signIn: 'Se connecter',
    offline:
      'Hors ligne – continue d’apprendre, ton cheikh le verra à la prochaine connexion.',
    fromSheikh: 'De mon cheikh',
    noTasks: 'Pas encore de devoirs',
    noTasksHint:
      'Dès qu’il te marque un passage dans le muṣḥaf, il apparaît ici tout en haut, avec une échéance.',
    connect: 'Rejoins ton cheikh',
    connectHint: 'Connecte-toi et rejoins sa ḥalaqa par lien ou par code QR.',
    nextUnit: 'Suite du parcours · Unité 2',
    openCard: 'Ouvrir la fiche',
    legend: 'Couleurs du muṣḥaf',
    saveProgress: 'Garder ta progression',
    saveProgressHint:
      'Tu peux t’entraîner sans compte. Connecte-toi pour que ta progression soit enregistrée et la même sur tous tes appareils.',
    saveProgressAction: 'Se connecter et garder',
  },
  rules: {
    ghunna: { name: 'Ghunna', hint: 'son nasal, 2 temps (ikhfāʾ, idghām, iqlāb)' },
    qalqala: { name: 'Qalqala', hint: 'rebond de ق ط ب ج د avec sukūn' },
    silent: { name: 'Muet', hint: 'écrit, non prononcé' },
    'madd-2': { name: 'Madd 2', hint: 'allongement naturel, 2 temps' },
    'madd-4': { name: 'Madd 4–5', hint: 'allongement joint ou séparé' },
    'madd-6': { name: 'Madd 6', hint: 'allongement obligatoire, 6 temps' },
  },
  path: {
    eyebrow: 'Parcours',
    unitTitle: 'Unité 2 · Nūn sākina et tanwīn',
    intro:
      'La lettre qui suit le nūn sākina ou le tanwīn décide de la prononciation : 28 lettres, quatre règles – 6 + 6 + 1 + 15.',
    letters: (count) => (count === 1 ? '1 lettre' : `${count} lettres`),
    next: 'Les unités 3 (ghunna et mīm sākina) et 4 (qalqala) suivent, elles aussi tirées de la feuille de ton cheikh.',
  },
  ruleCard: {
    eyebrow: 'Unité 2 · Comprendre',
    close: 'Fermer',
    progress: (index, total) => `Carte ${index} sur ${total}`,
    draft: 'Brouillon',
    draftHint: 'Pas encore relu par ton cheikh.',
    letters: 'Si l’une de ces lettres suit',
    examples: 'Exemples de ta feuille',
    decides: 'décide de la règle',
    followerKey: 'souligné = la lettre qui décide',
    clear: 'sans couleur = prononcé clairement',
    colourKey: (colour, name, hint) => `${colour} = ${name}, ${hint}`,
    colours: {
      ghunna: 'vert',
      qalqala: 'bleu',
      silent: 'gris',
      'madd-2': 'rouge clair',
      'madd-4': 'rouge',
      'madd-6': 'rouge foncé',
    },
    cases: {
      inside: 'dans un mot',
      across: 'entre deux mots',
      tanwin: 'après un tanwīn',
    },
    withGhunna: 'avec ghunna',
    withoutGhunna: 'sans ghunna',
    exceptions: 'Exception : dans un seul mot, il reste clair (iẓhār)',
    sourcesDiffer: 'Les sources divergent',
    sources: {
      iqlabGhunna:
        'Une source enseigne l’iqlāb sans ghunna. Nous l’enseignons avec ghunna, comme ta feuille.',
    },
    teacherNote: 'Note de ton cheikh : aucune pour l’instant.',
    previous: 'Retour',
    next: 'Suite',
    done: 'Vers l’unité',
  },
  cards: {
    izhar: {
      title: 'Prononcer clairement devant les six lettres de la gorge',
      steps: [
        'Repère le nūn sākina ou le tanwīn.',
        'La lettre suivante est-elle l’une des six lettres de la gorge ? Alors c’est l’iẓhār.',
        'Prononce le nūn clairement : sans ghunna, sans fusion.',
        'Passe directement à la lettre de la gorge, sans pause.',
      ],
      tip: 'On l’appelle iẓhār ḥalqī parce que les six lettres viennent de la gorge (ḥalq).',
    },
    idgham: {
      title: 'Le nūn fusionne avec le mot suivant',
      steps: [
        'Repère le nūn sākina ou le tanwīn à la fin d’un mot.',
        'Si le mot suivant commence par l’une des six lettres, le nūn fusionne avec elle.',
        'Avec yanmū, une ghunna de 2 temps reste ; avec lām et rāʾ, elle disparaît.',
        'Seulement entre deux mots : dans un seul mot, il reste clair (voir l’exception).',
      ],
      tip: 'Ses lettres forment le mot yarmalūn.',
    },
    iqlab: {
      title: 'Le nūn devient mīm devant le bāʾ',
      steps: [
        'Repère le nūn sākina ou le tanwīn devant le bāʾ',
        'Transforme le « n » en « m »',
        'Ferme les lèvres et tiens la ghunna 2 temps',
        'Ouvre les lèvres sur le bāʾ',
      ],
      tip: 'Le muṣḥaf écrit souvent un petit mīm sur le nūn ou le tanwīn.',
    },
    ikhfa: {
      title: 'Le nūn est caché, avec ghunna',
      steps: [
        'Repère le nūn sākina ou le tanwīn devant l’une des 15 lettres.',
        'La langue ne se pose pas : le nūn est caché, pas prononcé.',
        'Tiens la ghunna 2 temps, la bouche déjà prête pour la lettre suivante.',
        'Puis prononce la lettre.',
      ],
      tip: 'Moyen mnémotechnique : les initiales de « ṣif dhā thanā kam jāda shakhṣun qad samā / dum ṭayyiban zid fī tuqan ḍaʿ ẓālimā ».',
    },
  },
  games: {
    eyebrow: 'Unité 2 · S’entraîner',
    practise: 'S’entraîner',
    progress: (index, total) => `${index} / ${total}`,
    seconds: (seconds) => `${seconds.toLocaleString('fr-FR')}\u202fs`,
    options: 'Règles',
    whichRule: {
      title: 'Quelle règle ?',
      intro:
        'Dix vrais mots de ta feuille : regarde la lettre après le nūn sākina ou le tanwīn.',
      question: 'Quelle règle pour le nūn ou le tanwīn marqué ?',
    },
    sort: {
      title: 'Trie les 28',
      intro:
        'Chaque lettre appartient à une seule règle. En combien de temps tries-tu les 28 ?',
      question: 'Nūn sākina devant cette lettre – quelle règle ?',
      best: (seconds) =>
        `Meilleur temps\u202f: ${seconds.toLocaleString('fr-FR')}\u202fs`,
      newBest: 'Nouveau record !',
    },
    review: {
      title: 'Révision',
      intro: 'Ce que tu as confondu revient – jusqu’à ce que ce soit acquis.',
      none: 'Rien à réviser pour l’instant. Bravo !',
      open: (count) => (count === 1 ? 'Réviser 1 carte' : `Réviser ${count} cartes`),
    },
    good: 'bien',
    check: 'à revoir',
    rightAnswer: 'La bonne réponse',
    follows: 'suivi de',
    insideWord: 'dans un seul mot, l’exception',
    toReview: 'Cela va dans ta révision.',
    next: 'Suite',
    finish: 'Voir le résultat',
    score: (right, total) => `${right} sur ${total} justes`,
    newCards: (count) =>
      count === 0
        ? 'Aucune nouvelle carte de révision.'
        : count === 1
          ? '1 carte va dans ta révision.'
          : `${count} cartes vont dans ta révision.`,
    again: 'Encore',
    back: 'Vers l’unité',
  },
  halaqa: {
    mine: 'Mes ḥalaqāt',
    none: 'Tu n’es encore dans aucune ḥalaqa. Demande le lien d’invitation à ton cheikh, ou montre-lui cette page.',
    noneTeacher: 'Tu n’as pas encore ouvert de ḥalaqa.',
    teacherOf: (name) => (name ? `avec ${name}` : 'avec ton cheikh'),
    waiting: 'en attente de validation',
    oneToOne: 'Cours individuel',
    students: (count) => (count === 1 ? '1 élève' : `${count} élèves`),
    pending: (count) => (count === 1 ? '1 en attente' : `${count} en attente`),
    create: {
      title: 'Nouvelle ḥalaqa',
      name: 'Nom',
      placeholder: 'p. ex. Juzʾ ʿAmma, le mardi',
      oneToOne: 'Cours individuel (un seul élève)',
      submit: 'Ouvrir la ḥalaqa',
    },
    invite: {
      title: 'Inviter',
      hint: 'Partage le lien ou montre le code QR. Qui rejoint attend que tu valides.',
      create: 'Créer un lien d’invitation',
      renew: 'Créer un nouveau lien',
      validUntil: (date) =>
        `Valable jusqu’au ${date}. Un nouveau lien remplace celui-ci.`,
      hidden: (date) =>
        `Un lien est actif jusqu’au ${date}. Il n’est affiché qu’à sa création\u202f; un nouveau lien le remplace.`,
      copy: 'Copier le lien',
      copied: 'Lien copié.',
      share: 'Partager',
      revoke: 'Retirer le lien',
      revoked: 'Le lien ne fonctionne plus.',
      qr: 'Code QR pour rejoindre',
    },
    waitingTitle: 'En attente de validation',
    approve: 'Accepter',
    reject: 'Refuser',
    membersTitle: 'Élèves',
    remove: 'Retirer',
    noMembers: 'Personne pour l’instant. Partage le lien d’invitation.',
    leave: 'Quitter la ḥalaqa',
    retry: 'Réessayer',
    back: 'Vers mes ḥalaqāt',
    join: {
      eyebrow: 'Invitation',
      title: (name) => `Ḥalaqa «\u202f${name}\u202f»`,
      signIn: 'Connecte-toi pour rejoindre. Tu reviendras ici ensuite.',
      confirm: 'Rejoindre',
      pending:
        'Demande envoyée. Dès que ton cheikh te valide, tu vois la ḥalaqa et ses devoirs.',
      active: 'Tu es déjà dans cette ḥalaqa.',
      missing: 'Ouvre le lien d’invitation de ton cheikh ou scanne son code QR.',
    },
  },
  assignments: {
    title: 'Devoirs',
    kinds: {
      learn: 'Apprendre',
      read: 'Lire',
      recite: 'Réciter à nouveau',
      practise: 'S’entraîner',
    },
    range: (sura, from, to) =>
      from === to
        ? `Sourate ${sura}, āya ${from}`
        : `Sourate ${sura}, āyāt ${from}–${to}`,
    times: (count) => `${count} fois`,
    rangeWords: (sura, from, wordFrom, to, wordTo) =>
      from !== to
        ? `Sourate ${sura}, āya ${from} mot ${wordFrom} à āya ${to} mot ${wordTo}`
        : wordFrom === wordTo
          ? `Sourate ${sura}, āya ${from}, mot ${wordFrom}`
          : `Sourate ${sura}, āya ${from}, mots ${wordFrom}–${wordTo}`,
    focus: 'Attention à',
    variant: (rule) =>
      rule === 'idgham-ghunna'
        ? 'avec ghunna'
        : rule === 'idgham-no-ghunna'
          ? 'sans ghunna'
          : null,
    due: (date) => `pour le ${date}`,
    dueToday: 'pour aujourd’hui',
    overdue: (date) => `en retard depuis le ${date}`,
    from: (name, halaqa) => (name ? `de ${name} · ${halaqa}` : halaqa),
    markDone: 'Fait',
    done: 'Fait – ton cheikh le voit.',
    doneOn: (date) => `fait le ${date}`,
    undo: 'Pas encore fait',
    openCard: 'Vers la carte',
    play: 'Vers le jeu',
    more: (count) => (count === 1 ? '1 autre devoir' : `${count} autres devoirs`),
    none: 'Pas encore de devoirs dans cette ḥalaqa.',
    older: 'Voir les plus anciens',
    forAll: 'pour tous',
    forStudent: (name) => `pour ${name}`,
    doneCount: (done, of) => `${done} sur ${of} faits`,
    doneBy: 'Fait par',
    remove: 'Retirer',
    form: {
      title: 'Donner un devoir',
      who: 'Pour',
      everyone: 'tous les élèves',
      kind: 'Type',
      sura: 'Sourate',
      from: 'de l’āya',
      to: 'à l’āya',
      rule: 'Règle',
      noRule: 'aucune',
      repetitions: 'Combien de fois',
      due: 'Pour le',
      note: 'Note (facultatif)',
      submit: 'Donner le devoir',
      given: 'Devoir donné.',
    },
  },
  mushaf: {
    eyebrow: 'Muṣḥaf',
    packs: {
      'uthmani-hafs-fatiha-baqara': 'al-Fātiḥa et al-Baqara',
      'uthmani-hafs-juz30': 'Juzʾ ʿAmma',
      'indopak-hafs-fatiha-baqara': 'al-Fātiḥa et al-Baqara',
      'indopak-hafs-juz30': 'Juzʾ ʿAmma',
    },
    title: 'Muṣḥaf',
    scriptLabel: 'Écriture',
    scripts: {
      indopak: {
        name: 'IndoPak',
        note: 'Écriture IndoPak comme dans le muṣḥaf de ton sheikh (15 lignes), riwāyat Ḥafṣ.',
      },
      uthmani: {
        name: 'Médine',
        note: 'Écriture ʿuthmānī comme dans le muṣḥaf de Médine, riwāyat Ḥafṣ.',
      },
    },
    sura: (number) => `Sourate ${number}`,
    ayat: (count) => (count === 1 ? '1 āya' : `${count} āyāt`),
    loading: 'Chargement du muṣḥaf …',
    saved: 'Enregistré hors ligne',
    notSaved: 'En ligne seulement : cet appareil ne peut pas le garder.',
    failure: {
      offline:
        'Ouvre le muṣḥaf une fois avec une connexion\u202f; ensuite il marche aussi hors ligne.',
      checksum:
        'Les données du muṣḥaf sont arrivées abîmées. Recharge la page, s’il te plaît.',
      invalid:
        'Les données du muṣḥaf sont arrivées abîmées. Recharge la page, s’il te plaît.',
      missing: 'Cette sourate n’est pas encore dans le muṣḥaf.',
      missingPage: 'Cette page n’est pas encore dans le muṣḥaf.',
    },
    tap: 'Touche un mot pour voir ses règles. Glisse pour tourner la page ; agrandis avec deux doigts.',
    colours: 'Couleurs du tajwīd',
    player: {
      label: 'Écouter',
      playPage: 'Écouter la page',
      play: 'Lire',
      stop: 'Arrêter',
      aya: (sura: number, aya: number) =>
        aya === 0 ? `Sourate ${sura} · Basmala` : `Sourate ${sura} · Āya ${aya}`,
      nowPlaying: 'En cours',
      pause: 'Pause',
      resume: 'Reprendre',
      reciter: 'Récitateur',
      speed: 'Vitesse',
      loop: 'Répéter',
      reciters: {
        'husary-muallim': 'al-Ḥuṣarī · récitation d’enseignement (muʿallim)',
        husary: 'al-Ḥuṣarī · murattal',
        maher: 'Māhir al-Muʿayqilī',
      },
      failed: 'La récitation ne se charge pas. Vérifie ta connexion.',
      sourceAudio: 'Récitation : EveryAyah.com',
      sourceTimings: 'Temps des mots : quran-align (Collin Fair), CC BY 4.0',
      sourceQuranicAudio: 'Récitation de Māhir al-Muʿayqilī : QuranicAudio.com',
      sourceQua:
        'Temps des mots de Māhir al-Muʿayqilī : Quranic Universal Audio, CC BY 4.0',
    },
    all: 'Toutes les sourates',
    previousPage: 'Page précédente',
    nextPage: 'Page suivante',
    page: (n: number) => `Page ${n}`,
    range: (from, to) =>
      from === to
        ? `Ton devoir\u202f: āya ${from}`
        : `Ton devoir\u202f: āyāt ${from}–${to}`,
    word: (sura, aya, n) => `Sourate ${sura}, āya ${aya}, mot ${n}`,
    noRule: 'Aucune règle n’est marquée ici\u202f: lis clairement.',
    follows: (rule) => `décide la règle d’avant\u202f: ${rule}`,
    close: 'Fermer',
    open: 'Ouvrir dans le muṣḥaf',
    assign: 'Donner un devoir ici',
    pick: 'Touche le premier puis le dernier mot du devoir.',
    cancel: 'Annuler',
    halaqa: 'Ḥalaqa',
    sources: 'Sources',
    text: 'Texte\u202f: Tanzil Project (CC BY 3.0)',
    textIndopak: 'Texte IndoPak\u202f: DigitalKhatt (MIT)',
    rules: 'Règles de tajwīd\u202f: cpfair/quran-tajweed (CC BY 4.0)',
  },
  signIn: {
    eyebrow: 'Connexion',
    title: 'Bienvenue sur ʿArḍa',
    intro:
      'Connecte-toi pour que ton cheikh écoute tes récitations et te donne des devoirs. Sans mot de passe : nous t’envoyons un lien et un code.',
    linkFailed:
      'Le lien a expiré ou a déjà été utilisé. Demande simplement un nouveau lien.',
    email: 'Adresse e-mail',
    emailPlaceholder: 'toi@example.com',
    sendLink: 'Envoyer le lien',
    sentTo: (email) => `✓ Lien envoyé à ${email}`,
    sentHint:
      'Ouvre l’e-mail sur cet appareil et touche « Se connecter à ʿArḍa ». Le lien et le code sont valables 15 minutes. Rien reçu ? Regarde aussi dans les spams.',
    codeLabel:
      'Ton application de messagerie ouvre le lien dans son propre navigateur ? Saisis alors ici le code à 6 chiffres de l’e-mail :',
    code: 'Code de connexion',
    confirm: 'Se connecter',
    resend: 'Renvoyer',
    otherEmail: 'Autre adresse e-mail',
    sendFailed: 'Le lien de connexion n’a pas pu être envoyé.',
    signInFailed: 'La connexion n’a pas fonctionné.',
    passkey: 'Se connecter avec une clé d’accès',
  },
  account: {
    eyebrow: 'Compte',
    roles: { student: 'Élève', teacher: 'Cheikh / enseignant·e', admin: 'Admin' },
    devices: 'Appareils connectés',
    unknownDevice: 'Appareil inconnu',
    thisDevice: 'cet appareil',
    endOthers: 'Déconnecter les autres appareils',
    endedOthers: (count) =>
      count === 1
        ? '1 autre appareil déconnecté.'
        : `${count} autres appareils déconnectés.`,
    addPasskey: 'Ajouter une clé d’accès',
    passkeyAdded: 'Clé d’accès ajoutée.',
    signOut: 'Se déconnecter',
    languageHint:
      'Dans cette langue, tu vois l’application, reçois les e-mails et lis les retours de ton cheikh.',
  },
  twoFactor: {
    title: 'Connexion à deux facteurs',
    intro:
      'L’administration demande en plus un code d’une application d’authentification (par exemple Google Authenticator, Microsoft Authenticator ou 1Password).',
    setUp: 'Configurer',
    scan: 'Scanne le code QR avec ton application d’authentification, ou saisis la clé.',
    qr: 'Code QR pour l’application d’authentification',
    secret: 'Clé',
    code: 'Code à six chiffres',
    confirm: 'Confirmer',
    confirmNeeded:
      'Confirme cette session avec un code de ton application d’authentification.',
    confirmed: 'Confirmé pour cette session.',
  },
  admin: {
    eyebrow: 'Administration',
    title: 'Personnes et rôles',
    open: 'Ouvrir l’administration',
    intro:
      'Ici, tu fais d’un cheikh un enseignant. Il doit s’être connecté une fois auparavant. Chaque changement est journalisé.',
    search: 'Rechercher (e-mail ou nom)',
    searchButton: 'Rechercher',
    none: 'Personne trouvée.',
    role: 'Rôle',
    you: 'toi',
    blocked: 'bloqué',
    block: 'Bloquer',
    unblock: 'Débloquer',
    saved: (name) => `Enregistré\u202f: ${name}`,
    more: 'Charger plus',
    unverified: 'e-mail non confirmé',
  },
  passkey: {
    'already-added': 'Cet appareil a déjà une clé d’accès pour ʿArḍa.',
    'stale-session':
      'Par sécurité : reconnecte-toi (lien ou code), puis tu pourras ajouter une clé d’accès.',
    'unknown-passkey':
      'ʿArḍa ne connaît pas (plus) cette clé d’accès. Connecte-toi avec un lien ou un code.',
    'not-verified':
      'Confirme avec ton visage, ton empreinte ou le code PIN de ton appareil.',
    'rate-limited': 'Trop d’essais – réessaie dans quelques minutes.',
    offline: 'Pas de connexion – réessaie dans un instant.',
    failed: 'Cela n’a pas marché. Réessaie, ou utilise un lien ou un code.',
  },
  recite: {
    record: 'Enregistrer',
    title: (sura, from, to) =>
      from === to
        ? `Enregistrer sourate ${sura} · āya ${from}`
        : `Enregistrer sourate ${sura} · āyāt ${from}–${to}`,
    recordAssignment: 'Enregistrer le devoir',
    recordSection: 'Enregistrer ce passage',
    consentTitle: 'Avant d’enregistrer',
    consentText:
      'Seuls toi et les enseignants de la ḥalaqa à qui tu l’envoies peuvent écouter ton enregistrement. Il reste privé jusqu’à ce que tu le supprimes et ne sert à rien d’autre.',
    consentAgree: 'J’accepte',
    start: 'Commencer l’enregistrement',
    stop: 'Arrêter',
    running: (time) => `Enregistrement · ${time}`,
    again: 'Enregistrer à nouveau',
    send: 'Envoyer à mon cheikh',
    sendTo: 'Envoyer à',
    sent: 'Envoyé. Ton cheikh va l’écouter.',
    queued: 'Enregistré. Il sera envoyé dès que tu seras de nouveau en ligne.',
    noHalaqa:
      'Rejoins d’abord la ḥalaqa de ton cheikh, ensuite tu pourras lui envoyer des enregistrements.',
    denied:
      'Le microphone n’est pas autorisé. Autorise-le dans les réglages de ton navigateur.',
    unsupported: 'Ce navigateur ne peut pas enregistrer.',
    close: 'Fermer',
    pending: (count) =>
      count === 1
        ? '1 enregistrement attend une connexion.'
        : `${count} enregistrements attendent une connexion.`,
    mine: 'Tes récitations',
    waiting: 'attend ton cheikh',
    verdicts: { good: 'bien', again: 'à refaire' },
    from: (name) => (name ? `${name} écrit\u202f:` : 'Ton cheikh écrit\u202f:'),
    delete: 'Supprimer',
    queue: 'À écouter',
    queueEmpty: 'Aucun enregistrement n’attend pour le moment.',
    answered: 'Répondu',
    good: 'Bien',
    againVerdict: 'À refaire',
    remark: 'Remarque rapide',
    noRemark: '– aucune –',
    note: 'Tes propres mots (facultatif)',
    answer: 'Envoyer la réponse',
    change: 'Modifier',
    older: 'Afficher les plus anciens',
    seconds: (ms) => `${Math.max(1, Math.round(ms / 1000))}\u202fs`,
    range: (sura, from, to) =>
      from === to
        ? `Sourate ${sura} · āya ${from}`
        : `Sourate ${sura} · āyāt ${from}–${to}`,
  },
  errors: {
    second_factor_required: 'Confirme d’abord la connexion à deux facteurs.',
    cannot_change_self: 'Tu ne peux pas changer ton propre rôle ici.',
    invalid_code: 'Le code n’est pas correct.',
    locked: 'Trop de codes erronés. Attends 15 minutes.',
    already_enabled: 'La connexion à deux facteurs est déjà configurée.',
    not_set_up: 'Configure d’abord la connexion à deux facteurs.',
    invalid_query: 'La recherche n’est pas valide.',
    offline: 'Pas de connexion.',
    unauthorized: 'Connecte-toi, s’il te plaît.',
    forbidden: 'Tu n’as pas l’autorisation pour cela.',
    not_found: 'Introuvable.',
    invalid_body: 'La saisie n’est pas valide.',
    invalid_redirect: 'Adresse de retour invalide.',
    cross_origin: 'Cette requête vient d’un autre site.',
    INVALID_OTP: 'Le code n’est pas correct.',
    OTP_EXPIRED: 'Le code a expiré – demande un nouveau lien.',
    TOO_MANY_ATTEMPTS: 'Trop d’essais erronés – demande un nouveau lien.',
    invite_invalid:
      'Ce lien a expiré ou n’est pas valable. Demande-en un nouveau à ton cheikh.',
    halaqa_full: 'Ce cours individuel a déjà un élève.',
    too_many_halaqat: 'Tu as atteint le nombre maximal de ḥalaqāt.',
    too_many_assignments: 'Cette ḥalaqa a atteint le nombre maximal de devoirs.',
    too_many_recordings:
      'Tu as atteint le nombre maximal d’enregistrements. Supprime les plus anciens.',
    too_large: 'L’enregistrement est trop long.',
    unsupported_media_type: 'Ce format d’enregistrement n’est pas pris en charge.',
    generic: (status) => `Erreur du serveur (${status}).`,
  },
  remarks: {
    ghunnaShort: 'Ghunna trop courte – tiens-la 2 temps.',
    ghunnaLong: 'Ghunna trop longue – seulement 2 temps.',
    nunTooClear: 'Nūn trop clair – ici il est caché (ikhfāʾ).',
    qalqalaMissing: 'Il manque la qalqala – fais rebondir brièvement le son.',
    maddShort: 'Madd trop court – allonge davantage.',
    good: 'C’est bien, garde-le ainsi.',
    sinVoiced: 'Ton sīn vibre – garde-le sourd et net, jamais comme un z.',
    zayVoiceless: 'Le zāy est sonore – laisse-le vibrer, mais fin.',
    raRolled:
      'Le rāʾ avec la pointe de la langue, une seule frappe légère – ne le roule pas.',
  },
  feedback: {
    eyebrow: 'Pour le cheikh',
    title: 'Des retours dans la langue de tes élèves',
    intro:
      'Écris dans ta langue. Chaque élève lit les remarques rapides dans sa propre langue ; ʿArḍa traduit le texte libre, et les termes de tajwīd et les āyāt restent inchangés.',
    quick: 'Remarques rapides',
    write: 'Ton propre retour',
    from: 'J’écris en',
    to: 'L’élève lit en',
    placeholder: 'p. ex. Your ghunna on “min sharri” was too short.',
    preview: 'Ce que lit ton élève',
    translate: 'Voir la traduction',
    machine: 'traduction automatique',
    original: 'Original',
    sameLanguage: 'Même langue – pas besoin de traduction.',
    unavailable: {
      not_configured: 'La traduction n’est pas configurée sur ce serveur.',
      limit: 'Limite quotidienne de traductions atteinte – reprise demain.',
      refused: 'Traduction indisponible. Ton élève reçoit l’original.',
      failed: 'Traduction impossible pour le moment. Ton élève reçoit l’original.',
    },
  },
  lab: {
    eyebrow: 'Labo',
    title: 'Labo des lettres',
    intro:
      'D’où vient un son\u202f? La tête montre les cinq zones. Choisis une lettre\u202f: tu vois son point, tu entends de vrais mots et tu t’exerces à la différence.',
    firstSet: 'Première série\u202f: Sīn, Zāy, Ṣād et Rāʾ',
    firstSetHint:
      'Les trois lettres sifflantes et le Rāʾ – souvent les plus difficiles pour les germanophones.',
    more: 'Les autres lettres suivront dès que ton cheikh aura vérifié le dessin.',
    draft: 'Brouillon – le cheikh vérifie encore',
    back: 'Au labo',
    diagram: {
      title: 'La tête de profil',
      description:
        'Vue de profil de la tête avec cinq zones\u202f: Jawf (cavité buccale), Ḥalq (gorge), Lisān (langue), Shafatān (lèvres) et Khayshūm (cavité nasale).',
      legend: 'Les cinq zones',
      licence:
        'Dessin\u202f: ʿArḍa, CC BY 4.0 – un brouillon, ton cheikh le vérifie encore.',
    },
    areas: {
      jawf: {
        name: 'Jawf',
        gloss: 'cavité de la bouche et de la gorge\u202f: les voyelles longues',
      },
      halq: { name: 'Ḥalq', gloss: 'gorge\u202f: six lettres' },
      lisan: { name: 'Lisān', gloss: 'langue\u202f: dix-huit lettres' },
      shafatan: { name: 'Shafatān', gloss: 'lèvres\u202f: quatre lettres' },
      khayshum: { name: 'Khayshūm', gloss: 'cavité nasale\u202f: la ghunna' },
    },
    points: {
      whistle: { line1: 'Pointe de la langue', line2: 'incisives' },
      ra: { line1: 'Pointe de la langue', line2: 'gencives' },
    },
    letters: {
      sin: {
        name: 'Sīn',
        short: 'léger, net, sourd',
        makhraj:
          'La pointe de la langue se place contre les incisives inférieures (certains enseignent\u202f: supérieures). Un passage étroit reste ouvert entre la langue et les dents du haut – l’air y siffle.',
        mistakes: [
          'En allemand, le s devant une voyelle devient sonore\u202f: «\u202fSonne\u202f» se dit [z]. Le Sīn devient alors vite un Zāy. Garde le Sīn sourd et net – sans bourdonnement.',
          'Ne l’alourdis pas\u202f: le Sīn est léger. Si tu lèves l’arrière de la langue, on entend un Ṣād.',
          'Ne zézaie pas\u202f: la langue reste derrière les dents. Si elle sort, on entend un Thāʾ.',
        ],
      },
      zay: {
        name: 'Zāy',
        short: 'léger, bourdonnant',
        makhraj:
          'Comme Sīn et Ṣād\u202f: la pointe de la langue contre les incisives inférieures (certains enseignent\u202f: supérieures), un passage étroit reste ouvert, l’air y siffle.',
        mistakes: [
          'Le Zāy est sonore\u202f: pose la main sur ta gorge – tu sens la vibration.',
          'Il reste fin et léger\u202f: jamais lourd comme le Ṣād, jamais comme le z allemand (ts).',
          'Ne le rends pas sourd devant un sukūn ou en fin de mot, comme en allemand («\u202fHaus\u202f»). Sinon il devient un Sīn.',
        ],
      },
      sad: {
        name: 'Ṣād',
        short: 'lourd, plein',
        makhraj:
          'Le même point que le Sīn\u202f: la pointe de la langue aux incisives, un passage étroit. En plus, l’arrière de la langue se lève et s’appuie largement contre le palais.',
        mistakes: [
          'Le Ṣād est lourd\u202f: l’arrière de la langue monte vers le palais (iṭbāq). Le son devient plein et sombre.',
          'Le Sīn est léger\u202f: l’arrière de la langue reste bas. La différence s’entend aussi dans la voyelle qui suit.',
          'Lourd ne veut pas dire sonore\u202f: le Ṣād reste sourd comme le Sīn, sans vibration.',
        ],
      },
      ra: {
        name: 'Rāʾ',
        short: 'un seul battement léger de la pointe',
        makhraj:
          'La pointe de la langue, avec un peu de son dos, frappe les gencives derrière les incisives supérieures – un peu plus en arrière que pour le Nūn.',
        mistakes: [
          'Avec la pointe de la langue, pas dans la gorge\u202f: pas de r guttural.',
          'Un seul battement léger, pas roulé. Tu apprends le takrīr pour l’éviter.',
          'Ne l’avale pas en fin de mot comme dans l’allemand «\u202fVater\u202f»\u202f: le Rāʾ se prononce.',
          'Lourd ou léger dépend de la voyelle\u202f: lourd avec fatḥa ou ḍamma, léger avec kasra.',
        ],
      },
    },
    makhraj: 'Makhraj · où il naît',
    sifat: 'Ṣifāt · ses qualités',
    sifa: {
      hams: {
        name: 'Hams',
        meaning: 'Chuchotement\u202f: le souffle passe, la voix ne vibre pas.',
      },
      jahr: {
        name: 'Jahr',
        meaning: 'Sonore\u202f: le souffle est retenu, la voix vibre.',
      },
      rakhawa: {
        name: 'Rakhāwa',
        meaning: 'Doux\u202f: le son continue, il ne s’arrête pas net.',
      },
      tawassut: {
        name: 'Tawassuṭ (Bayniyya)',
        meaning: 'Entre les deux\u202f: le son ne coule qu’un peu, ni ferme ni doux.',
      },
      istifal: {
        name: 'Istifāl',
        meaning:
          'Bas\u202f: l’arrière de la langue ne monte pas vers le palais. Ces lettres sont légères par nature\u202f; seuls le rāʾ (et le lām de «\u202fAllāh\u202f») peuvent devenir lourds selon leur position.',
      },
      istila: {
        name: 'Istiʿlāʾ',
        meaning:
          'Haut\u202f: l’arrière de la langue monte vers le palais, le son devient lourd.',
      },
      infitah: {
        name: 'Infitāḥ',
        meaning: 'Ouvert\u202f: il reste de l’espace entre la langue et le palais.',
      },
      itbaq: {
        name: 'Iṭbāq',
        meaning:
          'Couvert\u202f: la langue s’appuie largement contre le palais, le son devient plein.',
      },
      ismat: {
        name: 'Iṣmāt',
        meaning:
          'Retenu\u202f: le son ne glisse pas facilement de la langue (le contraire de l’idhlāq).',
      },
      idhlaq: {
        name: 'Idhlāq',
        meaning: 'Fluide\u202f: le son glisse facilement de la pointe de la langue.',
      },
      safir: {
        name: 'Ṣafīr',
        meaning: 'Sifflement\u202f: un son fin quand l’air passe par le passage étroit.',
      },
      inhiraf: {
        name: 'Inḥirāf',
        meaning: 'Déviation\u202f: le son s’écarte un peu de son point.',
      },
      takrir: {
        name: 'Takrīr',
        meaning:
          'Répétition\u202f: la langue a tendance à vibrer – tu le connais pour l’éviter.',
      },
    },
    mistakesTitle: 'Erreurs fréquentes',
    raRules: {
      title: 'Rāʾ\u202f: lourd ou léger',
      heavy:
        'Avec fatḥa ou ḍamma, le Rāʾ est lourd (tafkhīm)\u202f: un son plein et sombre.',
      light: 'Avec kasra, le Rāʾ est léger (tarqīq)\u202f: plat et clair.',
      pending:
        'Seulement les cas clairs, en résumé. Le Rāʾ avec sukūn et les autres règles suivront quand ton cheikh les aura vérifiés.',
    },
    listen: {
      title: 'Écouter et répéter',
      intro:
        'al-Ḥuṣarī, récitation d’enseignement, mot par mot. Touche un mot, écoute et répète – lentement d’abord.',
      play: (sura, aya, n) => `Écouter\u202f: sourate ${sura}, āya ${aya}, mot ${n}`,
      where: (sura, aya) => `${sura}:${aya}`,
      speed: 'Vitesse',
      loading: 'Chargement des temps des mots…',
      failed: 'La récitation ne se charge pas. Vérifie ta connexion.',
      source:
        'Récitation\u202f: al-Ḥuṣarī (muʿallim), EveryAyah.com · Temps des mots\u202f: quran-align (Collin Fair), CC BY 4.0',
    },
    quiz: {
      whistling: {
        title: 'Quelle lettre\u202f?',
        intro: 'Dix mots, seulement à l’oreille\u202f: entends-tu Sīn, Zāy ou Ṣād\u202f?',
        question: 'Quelle lettre entends-tu\u202f?',
      },
      weight: {
        title: 'Lourd ou léger\u202f?',
        intro: 'Dix mots avec Rāʾ\u202f: sonne-t-il lourd ou léger\u202f?',
        question: 'Comment sonne le Rāʾ\u202f?',
      },
      start: 'Commencer le quiz',
      listen: 'Écouter',
      listenAgain: 'Réécouter',
      options: 'Réponses',
      weights: { heavy: 'lourd', light: 'léger' },
      why: {
        sin: 'Sīn\u202f: léger, net et sourd.',
        zay: 'Zāy\u202f: sonore – il vibre –, mais fin.',
        sad: 'Ṣād\u202f: lourd, l’arrière de la langue se lève.',
        heavy: 'Rāʾ avec fatḥa ou ḍamma\u202f: lourd.',
        light: 'Rāʾ avec kasra\u202f: léger.',
      },
      back: 'À la lettre',
    },
    pairs: {
      title: 'Comparer des paires',
      intro: 'Écoute les deux mots l’un après l’autre et ne fais attention qu’à ce son.',
      playBoth: 'Écouter les deux',
      exact: 'Seul ce son change.',
      near: 'Proche\u202f: une voyelle ou un son voisin change aussi.',
      rare: 'Les paires exactes sont rares dans Juzʾ ʿAmma, al-Fātiḥa et al-Baqara\u202f; la plupart des paires ici sont donc proches.',
    },
    self: {
      title: 'T’exercer seul',
      text: 'Répète chaque mot trois fois. Puis enregistre une āya avec cette lettre et envoie-la à ton cheikh\u202f: il écoute précisément ce son.',
      pick: 'Āya',
      record: 'Enregistrer cette āya',
    },
  },
  soon: {
    eyebrow: 'En préparation',
    notFound: { title: 'Introuvable', text: 'Cette page n’existe pas.' },
    mushaf: {
      title: 'Le muṣḥaf',
      text: 'Le muṣḥaf IndoPak avec les couleurs du tajwīd : touche une lettre, écoute le récitateur mot à mot, lentement et en boucle.',
    },
    sheikh: {
      title: 'Mon cheikh',
      text: 'Ta ḥalaqa, ses devoirs sur la page, tes récitations dans sa liste d’écoute et le carnet de l’ʿarḍ.',
    },
  },
};
