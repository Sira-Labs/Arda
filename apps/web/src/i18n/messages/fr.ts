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
  errors: {
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
    generic: (status) => `Erreur du serveur (${status}).`,
  },
  remarks: {
    ghunnaShort: 'Ghunna trop courte – tiens-la 2 temps.',
    ghunnaLong: 'Ghunna trop longue – seulement 2 temps.',
    nunTooClear: 'Nūn trop clair – ici il est caché (ikhfāʾ).',
    qalqalaMissing: 'Il manque la qalqala – fais rebondir brièvement le son.',
    maddShort: 'Madd trop court – allonge davantage.',
    good: 'C’est bien, garde-le ainsi.',
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
  soon: {
    eyebrow: 'En préparation',
    notFound: { title: 'Introuvable', text: 'Cette page n’existe pas.' },
    mushaf: {
      title: 'Le muṣḥaf',
      text: 'Le muṣḥaf IndoPak avec les couleurs du tajwīd : touche une lettre, écoute le récitateur mot à mot, lentement et en boucle.',
    },
    lab: {
      title: 'Le labo des lettres',
      text: 'D’où vient le son : les makhārij, dessinés et animés, vérifiés par ton cheikh.',
    },
    sheikh: {
      title: 'Mon cheikh',
      text: 'Ta ḥalaqa, ses devoirs sur la page, tes récitations dans sa liste d’écoute et le carnet de l’ʿarḍ.',
    },
  },
};
