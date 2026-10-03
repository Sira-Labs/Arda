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
    iqlabTitle: 'Iqlāb – le nūn devient mīm devant le bāʾ',
    iqlabSteps: [
      'Repère le nūn sākina ou le tanwīn devant ب',
      'Transforme le « n » en « m »',
      'Ferme les lèvres et tiens la ghunna 2 temps',
      'Ouvre les lèvres sur le bāʾ',
    ],
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
    path: {
      title: 'Le parcours',
      text: 'Huit unités, de la lettre à la riwāya. L’unité 2 (nūn sākina et tanwīn) vient en premier, à partir de la fiche de ton cheikh.',
    },
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
