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
  engagement: {
    title: 'Ta progression',
    level: (level) => `Niveau ${level}`,
    xp: (points) => `${points}\u202fXP`,
    toNext: (left) => `encore ${left}\u202fXP jusqu’au niveau suivant`,
    today: (points) => `aujourd’hui +${points}\u202fXP`,
    streak: (days) => (days === 1 ? '1 jour d’affilée' : `${days} jours d’affilée`),
    streakStart: 'Entraîne-toi aujourd’hui pour commencer une série.',
    streakToday: 'Déjà entraîné aujourd’hui.',
    streakOpen: 'Entraîne-toi aujourd’hui pour garder ta série.',
    shields: (count) => (count === 1 ? '1 bouclier' : `${count} boucliers`),
    shieldHint:
      'Tous les 7 jours d’entraînement, tu gagnes un bouclier (2 au plus). Il couvre un jour manqué.',
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
    units: {
      1: {
        title: 'Unité 1 · Makhārij et ṣifāt',
        intro:
          'D’où vient chaque lettre : cinq zones, dix-sept points, les 28 lettres au labo. À la fin, tu entends dix mots de tout le labo.',
      },
      2: {
        title: 'Unité 2 · Nūn sākina et tanwīn',
        intro:
          'La lettre qui suit le nūn sākina ou le tanwīn décide de la prononciation : 28 lettres, quatre règles – 6 + 6 + 1 + 15.',
      },
      3: {
        title: 'Unité 3 · Ghunna et mīm sākina',
        intro:
          'La ghunna dure toujours 2 temps. Pour le mīm sākina, la lettre suivante décide : bāʾ, mīm ou toutes les autres.',
      },
      4: {
        title: 'Unité 4 · Qalqala',
        intro:
          'Cinq lettres rebondissent quand elles portent un sukūn : ق ط ب ج د – quṭbu jadd.',
      },
    },
    lab: 'Ouvrir le labo des lettres',
    letters: (count) => (count === 1 ? '1 lettre' : `${count} lettres`),
    next: 'Les unités 5 (madd) à 7 (waqf) suivent après le pilote.',
  },
  ruleCard: {
    play: (sura, aya) => `Écouter\u202f: sourate ${sura}, āya ${aya}`,
    inQuran: 'Dans le Coran\u202f:',
    eyebrow: (unit) => `Unité ${unit} · Comprendre`,
    close: 'Fermer',
    progress: (index, total) => `Carte ${index} sur ${total}`,
    draft: 'Brouillon',
    draftHint: 'Pas encore relu par ton cheikh.',
    letters: 'Si l’une de ces lettres suit',
    examples: 'Exemples',
    lettersShadda: 'Ces lettres avec shadda',
    lettersSukun: 'Ces lettres avec sukūn',
    allOtherLetters: 'Toutes les lettres sauf bāʾ et mīm',
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
    ghunna: {
      title: 'Nūn et mīm avec shadda : toujours la ghunna',
      steps: [
        'Repère un nūn ou un mīm avec shadda (نّ مّ).',
        'La ghunna est un son nasal qui vient du khayshūm : tiens-la 2 temps.',
        'Vérifie : si tu te bouches le nez, le son s’arrête.',
        'Force de la ghunna : shadda → ikhfāʾ et iqlāb → idghām → nūn ou mīm simple.',
      ],
      tip: 'La ghunna appartient au nūn et au mīm eux-mêmes : même sans règle, elle résonne doucement.',
    },
    'ikhfa-shafawi': {
      title: 'Mīm sākina devant bāʾ : caché, avec ghunna',
      steps: [
        'Repère un mīm sākina (مْ) en fin de mot.',
        'Si le mot suivant commence par bāʾ, c’est l’ikhfāʾ shafawī.',
        'Ferme légèrement les lèvres, sans presser, et tiens la ghunna 2 temps.',
        'Puis ouvre sur le bāʾ.',
      ],
      tip: '« Shafawī » veut dire « des lèvres » : le mīm et le bāʾ viennent tous deux des lèvres.',
    },
    'idgham-shafawi': {
      title: 'Mīm sākina devant mīm : fusion, avec ghunna',
      steps: [
        'Repère un mīm sākina devant un mīm.',
        'Les deux mīm fusionnent en un mīm avec shadda.',
        'Tiens la ghunna 2 temps.',
      ],
      tip: 'On l’appelle aussi idghām mithlayn ṣaghīr : deux lettres identiques, la première au repos.',
    },
    'izhar-shafawi': {
      title: 'Mīm sākina devant toutes les autres lettres : clair',
      steps: [
        'Repère un mīm sākina devant une lettre autre que bāʾ et mīm.',
        'Prononce le mīm clairement, sans ghunna et sans fusion.',
        'Surtout devant wāw et fāʾ : ne ferme pas les lèvres trop tôt et ne cache rien.',
      ],
      tip: 'L’iẓhār shafawī vaut devant 26 lettres : toutes sauf bāʾ et mīm.',
    },
    qalqala: {
      title: 'Le rebond de ق ط ب ج د avec sukūn',
      steps: [
        'Repère l’une des cinq lettres ق ط ب ج د (quṭbu jadd) avec sukūn.',
        'Touche le point d’articulation et relâche-le vite : un bref rebond.',
        'Le rebond n’est pas une voyelle : n’ajoute ni « a », ni « i », ni « u ».',
        'En s’arrêtant en fin de mot (par ex. أَحَدْ), le rebond est le plus fort.',
      ],
      tip: 'Mot-repère : quṭbu jadd (قُطْبُ جَدٍّ) – ses lettres sont les cinq.',
    },
  },
  games: {
    eyebrow: (unit) => `Unité ${unit} · S’entraîner`,
    practise: 'S’entraîner',
    progress: (index, total) => `${index} / ${total}`,
    seconds: (seconds) => `${seconds.toLocaleString('fr-FR')}\u202fs`,
    xp: (points) => `+${points}\u202fXP`,
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
    test: {
      title: "Test de l'unité",
      intro: "Dix questions sur l'unité. Huit bonnes réponses suffisent pour la réussir.",
      open: 'Passer le test',
      passed: 'Réussi',
      passedNext: (unit) => `Réussi – passe à l'unité ${unit}.`,
      passedLast: 'Réussi – toutes les unités de la fiche sont faites.',
      passedOpen: (unit) => `Réussi – le test de l'unité ${unit} reste à faire.`,
      notYet: (need, total) =>
        `Pas encore réussi : il faut ${need} sur ${total}. Révise les cartes et réessaie.`,
      recommended: (unit) => `Conseillé après le test de l'unité ${unit}.`,
    },
    back: 'Vers l’unité',
    unit3: {
      title: 'Quelle règle ? · Unité 3',
      intro: 'Mīm sākina ou shadda : dix mots, quatre règles.',
      question: 'Quelle règle pour le mīm ou le nūn marqué ?',
    },
    qalqala: {
      title: 'Les lettres de la qalqala',
      intro: 'La lettre fait-elle partie de quṭbu jadd ? Les 28, l’une après l’autre.',
      question: 'Avec un sukūn, cette lettre rebondit-elle ?',
      yes: 'Qalqala',
      no: 'pas de qalqala',
      isOne: 'fait partie de quṭbu jadd',
      isNot: 'ne fait pas partie de quṭbu jadd',
    },
    shadda: 'nūn ou mīm avec shadda',
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
    /** Pages of a printed muṣḥaf (ADR-0014 update 2026-10-07). */
    pages: (from: number, to: number) =>
      from === to ? `Page ${from}` : `Pages ${from}–${to}`,
    layouts: {
      'indopak-15': 'IndoPak, 15 lignes',
      madina: 'Médine',
    },
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
      by: 'Quoi',
      byAyat: 'Sourate et versets',
      byPages: 'Pages',
      layout: 'Muṣḥaf',
      pageFrom: 'de la page',
      pageTo: 'à la page',
      onPages: 'Sur ces pages :',
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
    /** The page last read in this script, on Today and in the muṣḥaf list. */
    continue: 'Reprendre la lecture',
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
  arda: {
    title: 'Cahier du ʿarḍ',
    intro:
      'Qui a récité quelle sourate, quand, et ton avis. Les enregistrements auxquels tu as répondu y figurent d’eux-mêmes ; ajoute ici ce qui a été récité en cours.',
    none: 'Rien d’inscrit pour l’instant.',
    sura: (n) => `Sourate ${n}`,
    times: (count) => (count === 1 ? 'une fois' : `${count} fois`),
    last: (day) => `dernière fois\u202f: ${day}`,
    history: 'Historique',
    hideHistory: 'Fermer l’historique',
    fromRecording: 'Enregistrement',
    inPerson: 'En cours',
    formTitle: 'Inscrire une récitation faite en cours',
    student: 'Élève',
    day: 'Jour',
    verdict: 'Avis',
    submit: 'Inscrire',
    written: 'Inscrit.',
    remove: 'Supprimer',
    mine: 'Ton ʿarḍ',
    mineIntro: 'Les sourates que tu as récitées à ton cheikh et ce qu’il en a pensé.',
  },
  recite: {
    voiceNote: 'Note vocale (facultative, 2 minutes maximum)',
    voiceRecord: 'Enregistrer une note vocale',
    voiceRemove: 'Supprimer la note vocale',
    voiceFrom: (name) => (name ? `Note vocale de ${name}` : 'Note vocale de ton cheikh'),
    marksHint: 'Pendant l’écoute, touche les mots qui ne sont pas encore justes.',
    marked: 'marqué',
    marksCount: (count) => (count === 1 ? '1 mot marqué' : `${count} mots marqués`),
    record: 'Enregistrer',
    title: (sura, from, to) =>
      from === to
        ? `Enregistrer sourate ${sura} · āya ${from}`
        : `Enregistrer sourate ${sura} · āyāt ${from}–${to}`,
    recordAssignment: 'Enregistrer le devoir',
    recordSection: 'Enregistrer ce passage',
    /** One sūra's part of a page assignment that runs across sūras. */
    recordPart: (name: string, from: number, to: number) =>
      `Enregistrer ${name} ${from}–${to}`,
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
    too_many_entries:
      'Cet élève a déjà un très grand nombre d’inscriptions dans le cahier.',
    too_large: 'L’enregistrement est trop long.',
    unsupported_media_type: 'Ce format d’enregistrement n’est pas pris en charge.',
    not_reviewed: 'Réponds d’abord à l’enregistrement, puis enregistre la note vocale.',
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
    sets: {
      first: {
        title: 'Première série\u202f: Sīn, Zāy, Ṣād et Rāʾ',
        hint: 'Les trois lettres sifflantes et le Rāʾ – souvent les plus difficiles pour les germanophones.',
      },
      throat: {
        title: 'La gorge\u202f: Hamza, Hāʾ, ʿAyn, Ḥāʾ, Ghayn et Khāʾ',
        hint: 'Six sons de la gorge, du plus profond vers le haut. L’allemand n’a que le h et le coup de glotte – les autres sont nouveaux.',
      },
      tongueBack: {
        title: 'Arrière et milieu de la langue\u202f: Qāf, Kāf, Jīm, Shīn et Yāʾ',
        hint: 'Cinq sons du dos de la langue. Le Qāf et le Kāf sont tout proches – ici tu apprends à les distinguer.',
      },
      tongueTip: {
        title: 'Le Ḍād et la pointe de la langue\u202f: Ḍād, Ṭāʾ, Dāl et Tāʾ',
        hint: 'Trois sons du même point – emphatique, sonore, soufflé – et le Ḍād, propre à l’arabe. Ici tu entends ce qui les distingue.',
      },
      teeth: {
        title: 'Les dents, le Lām et le Nūn\u202f: Thāʾ, Dhāl, Ẓāʾ, Lām et Nūn',
        hint: 'Trois sons avec la pointe de la langue aux incisives supérieures – en allemand ils deviennent vite s et z –, et le Lām et le Nūn des gencives.',
      },
      lips: {
        title: 'Les lèvres\u202f: Fāʾ, Bāʾ, Mīm et Wāw',
        hint: 'Quatre sons des lèvres, presque tous familiers. Ici, il s’agit des détails\u202f: qalqala, ghunna et lèvres arrondies.',
      },
    },
    more: 'Les 28 lettres sont là. Ton cheikh vérifie encore le dessin et les textes.',
    draft: 'Brouillon – le cheikh vérifie encore',
    back: 'Au labo',
    /** Unit 1's test, heard across the whole lab (ADR-0024). */
    unitTest:
      'Dix mots de tout le labo, à l’oreille seulement. Pour chacun, tu vois quelles lettres sont possibles.',
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
      halqDeep: { line1: 'Fond', line2: 'de la gorge' },
      halqMid: { line1: 'Milieu', line2: 'de la gorge' },
      halqNear: { line1: 'Haut', line2: 'de la gorge' },
      tongueFar: { line1: 'Fond de langue', line2: 'voile du palais' },
      tongueBack: { line1: 'Fond de langue', line2: 'devant le Qāf' },
      tongueMid: { line1: 'Milieu', line2: 'de la langue' },
      tongueSide: { line1: 'Bord de langue', line2: 'molaires' },
      tongueTip: { line1: 'Pointe, racine', line2: 'des incisives' },
      teeth: { line1: 'Pointe, bord', line2: 'des incisives' },
      lam: { line1: 'Bords avant', line2: 'gencives' },
      nun: { line1: 'Pointe', line2: 'devant le Lām' },
      lipTeeth: { line1: 'Lèvre du bas', line2: 'dents du haut' },
      lips: { line1: 'Les deux', line2: 'lèvres' },
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
      hamza: {
        name: 'Hamza',
        short: 'une attaque nette de la voix',
        makhraj:
          'Le fond de la gorge, au larynx\u202f: la glotte se ferme un instant et s’ouvre d’un coup – le même endroit que Hāʾ.',
        mistakes: [
          'Tu le connais en allemand\u202f: le coup de glotte de «\u202fbe-achten\u202f» ou «\u202fSpiegel-ei\u202f». C’est ainsi que commence le Hamza – net, pas avalé.',
          'Ne pas presser\u202f: le Hamza est une attaque courte et ferme (Shidda). Pressé depuis le milieu de la gorge, il devient ʿAyn – أَلِيمٌ («\u202fdouloureux\u202f») devient عَلِيمٌ («\u202fqui sait\u202f»).',
          'Le faire entendre aussi au milieu du mot et devant un sukūn, sans le sauter.',
        ],
      },
      ha: {
        name: 'Hāʾ',
        short: 'un souffle léger',
        makhraj:
          'Le fond de la gorge, comme le Hamza\u202f: l’air passe librement, sans frottement.',
        mistakes: [
          'Le Hāʾ est le h allemand – mais toujours audible\u202f: devant un sukūn et en fin de mot aussi, là où l’allemand l’avale («\u202fsehen\u202f»).',
          'Ne pas racler ni presser\u202f: une gorge serrée fait du Hāʾ un Ḥāʾ – أُهِلَّ devient أُحِلَّ, un autre mot.',
          'Doux et chuchoté (Hams)\u202f: pas de bourdonnement.',
        ],
      },
      ayn: {
        name: 'ʿAyn',
        short: 'pressé, du milieu de la gorge, sonore',
        makhraj:
          'Le milieu de la gorge\u202f: elle se resserre et la voix continue de sonner. Un son plein et pressé – l’allemand n’a rien de tel.',
        mistakes: [
          'Ne pas l’omettre ni le remplacer par le coup de glotte\u202f: عَلِيمٌ («\u202fqui sait\u202f») deviendrait أَلِيمٌ («\u202fdouloureux\u202f»).',
          'La voix continue (Tawassuṭ)\u202f: pas d’arrêt net comme pour le Hamza.',
          'Rester léger (Istifāl)\u202f: la voyelle après le ʿAyn n’est pas sombre.',
        ],
      },
      hha: {
        name: 'Ḥāʾ',
        short: 'un souffle fort de la gorge resserrée',
        makhraj:
          'Le milieu de la gorge, comme le ʿAyn\u202f: la gorge se resserre et l’air frotte de façon audible – sans voix.',
        mistakes: [
          'Pas comme le h allemand\u202f: sans le resserrement, أُحِلَّ («\u202fa été permis\u202f») devient أُهِلَّ («\u202fa été invoqué\u202f»).',
          'Pas comme le ch de «\u202fBach\u202f»\u202f: là, le dos de la langue frotte le palais – c’est le Khāʾ. Pour le Ḥāʾ, la bouche reste libre, seule la gorge se resserre.',
          'Sourd (Hams)\u202f: s’il bourdonne, il devient ʿAyn.',
        ],
      },
      ghayn: {
        name: 'Ghayn',
        short: 'emphatique, sonore, un frottement doux',
        makhraj:
          'Le haut de la gorge, près de la bouche, comme le Khāʾ\u202f: l’air frotte au fond et la voix sonne avec.',
        mistakes: [
          'Proche du r uvulaire de «\u202frot\u202f», mais sans rouler\u202f: le Ghayn frotte doucement et régulièrement.',
          'Sonore\u202f: sans bourdonnement il devient Khāʾ – غَيْرَ («\u202fsauf\u202f») devient خَيْرَ («\u202fbien\u202f»).',
          'Emphatique (Istiʿlāʾ)\u202f: le dos de la langue s’élève, la voyelle suivante sonne pleine.',
        ],
      },
      kha: {
        name: 'Khāʾ',
        short: 'emphatique, sourd, comme le ch de «\u202fBach\u202f»',
        makhraj:
          'Le haut de la gorge, près de la bouche, comme le Ghayn\u202f: l’air frotte de façon audible, sans voix.',
        mistakes: [
          'Comme le ch de «\u202fBach\u202f», jamais comme dans «\u202fich\u202f»\u202f: le ch clair est trop en avant.',
          'Emphatique (Istiʿlāʾ)\u202f: la voyelle suivante sonne sombre et pleine – خَلَقَ, pas clair.',
          'Ne pas le confondre avec le Ḥāʾ\u202f: le Khāʾ frotte plus haut\u202f; pour le Ḥāʾ, seule la gorge se resserre.',
        ],
      },
      qaf: {
        name: 'Qāf',
        short: 'emphatique, profond, avec qalqala',
        makhraj:
          'L’arrière extrême de la langue se lève contre le voile du palais au-dessus et le ferme brièvement – plus en arrière que le Kāf.',
        mistakes: [
          'Pas comme le k allemand\u202f: le Qāf naît plus en arrière, au voile du palais – sinon قَدْحًا («\u202fen faisant jaillir des étincelles\u202f») devient كَدْحًا («\u202fpeine\u202f»).',
          'Emphatique (Istiʿlāʾ)\u202f: l’arrière de la langue se lève, la voyelle suivante sonne pleine et sombre.',
          'Pas de souffle après\u202f: le Qāf est sonore et ferme. Avec sukūn, il rebondit brièvement (qalqala) – ٱلْقَدْرِ.',
        ],
      },
      kaf: {
        name: 'Kāf',
        short: 'léger, avec un souffle',
        makhraj:
          'L’arrière de la langue contre le palais, un peu plus en avant et plus bas que pour le Qāf.',
        mistakes: [
          'Rester léger (Istifāl)\u202f: la voyelle suivante sonne claire. Un Kāf sombre ressemble au Qāf.',
          'Avec un léger souffle (Hams), surtout avec sukūn – audible, mais sans exagérer.',
          'Ne pas le reculer vers le Qāf\u202f: sinon كَدْحًا («\u202fpeine\u202f») devient قَدْحًا («\u202fen faisant jaillir des étincelles\u202f»).',
        ],
      },
      jim: {
        name: 'Jīm',
        short: 'ferme, sonore, avec qalqala',
        makhraj:
          'Le milieu de la langue contre le palais dur au-dessus – au même endroit que le Shīn et le Yāʾ.',
        mistakes: [
          'Ferme (Shidda)\u202f: la langue ferme complètement, comme dj dans «\u202fdjinn\u202f» – pas doux comme le j de «\u202fjour\u202f».',
          'Sonore\u202f: sans voix et sans fermeture, il devient Shīn – جَآءَ («\u202fil est venu\u202f») devient شَآءَ («\u202fil a voulu\u202f»).',
          'Avec sukūn, le Jīm rebondit brièvement (qalqala), sans ajouter de voyelle.',
        ],
      },
      shin: {
        name: 'Shīn',
        short: 'sourd, l’air se répand',
        makhraj:
          'Le milieu de la langue vers le palais dur, comme le Jīm et le Yāʾ – mais sans fermer\u202f: l’air passe et se répand dans la bouche (Tafashshī).',
        mistakes: [
          'Comme le ch de «\u202fchat\u202f», mais sans avancer les lèvres\u202f: elles restent détendues.',
          'Pas comme le Sīn\u202f: pour le Shīn, c’est le milieu de la langue contre le palais, pas la pointe contre les dents\u202f; il ne siffle pas.',
          'Léger (Istifāl) et sourd (Hams)\u202f: pas de vibration comme le j de «\u202fjour\u202f».',
        ],
      },
      ya: {
        name: 'Yāʾ',
        short: 'doux, sonore, comme le y de «\u202fyeux\u202f»',
        makhraj:
          'Le milieu de la langue vers le palais dur, comme le Jīm et le Shīn – avec un espace, le son continue.',
        mistakes: [
          'Comme le y de «\u202fyeux\u202f»\u202f: doux, sans frottement ni coup.',
          'Ne pas en faire un Jīm\u202f: la langue ne se colle pas au palais – sinon سُيِّرَتْ («\u202fmises en marche\u202f») devient سُجِّرَتْ («\u202fembrasées\u202f»).',
          'Un Yāʾ avec voyelle est une consonne, pas une voyelle longue\u202f: يَوْمِ commence par y, pas par i.',
        ],
      },
      dad: {
        name: 'Ḍād',
        short: 'emphatique, sonore, propre à l’arabe',
        makhraj:
          'Un bord de la langue – ou les deux – contre les molaires du haut, et la langue se lève largement vers le palais. Le son court le long de tout le bord (Istiṭāla).',
        mistakes: [
          'Pas comme le d allemand\u202f: le Ḍād est emphatique, la langue s’appuie largement au palais – sinon بَعْضَ («\u202fune partie\u202f») devient بَعْدَ («\u202faprès\u202f»).',
          'Pas comme le Ẓāʾ\u202f: la pointe de la langue reste derrière les dents et ne sort pas.',
          'Pas de qalqala avec sukūn\u202f: le Ḍād ne fait pas partie de ق ط ب ج د.',
        ],
      },
      tta: {
        name: 'Ṭāʾ',
        short: 'emphatique, ferme, avec qalqala',
        makhraj:
          'La pointe de la langue aux racines des incisives supérieures, comme le Dāl et le Tāʾ. L’arrière de la langue s’appuie en plus largement au palais.',
        mistakes: [
          'Pas comme un t simple\u202f: le Ṭāʾ est emphatique (Iṭbāq), la voyelle suivante sonne pleine et sombre.',
          'Sans souffle (Jahr)\u202f: le t allemand est aspiré, le Ṭāʾ non – le souffle est retenu.',
          'Avec sukūn, le Ṭāʾ rebondit brièvement (qalqala).',
        ],
      },
      dal: {
        name: 'Dāl',
        short: 'léger, sonore, avec qalqala',
        makhraj:
          'La pointe de la langue aux racines des incisives supérieures, comme le Ṭāʾ et le Tāʾ.',
        mistakes: [
          'Ne pas le changer en t en fin de mot ou avant sukūn, comme en allemand («\u202fRad\u202f»)\u202f: le Dāl reste sonore et rebondit (qalqala).',
          'Rester léger\u202f: un Dāl lourd ressemble au Ḍād – بَعْدَ («\u202faprès\u202f») devient بَعْضَ («\u202fune partie\u202f»).',
          'Ne pas le confondre avec le Tāʾ\u202f: sans voix, هَادُوا۟ («\u202fceux qui sont juifs\u202f») devient هَاتُوا۟ («\u202fapportez\u202f!\u202f»).',
        ],
      },
      ta: {
        name: 'Tāʾ',
        short: 'léger, avec un souffle',
        makhraj:
          'La pointe de la langue aux racines des incisives supérieures, comme le Ṭāʾ et le Dāl.',
        mistakes: [
          'Rester léger (Istifāl)\u202f: la voyelle suivante sonne claire. Un Tāʾ sombre devient Ṭāʾ.',
          'Avec un léger souffle (Hams), surtout avec sukūn – comme un t ordinaire, sans exagérer.',
          'Ne pas le rendre sonore\u202f: s’il vibre, il devient Dāl – هَاتُوا۟ («\u202fapportez\u202f!\u202f») devient هَادُوا۟.',
        ],
      },
      tha: {
        name: 'Thāʾ',
        short: 'léger, sourd, comme th dans «\u202fthink\u202f»',
        makhraj:
          'La pointe de la langue touche le bord des incisives supérieures – elle dépasse un peu.',
        mistakes: [
          'Pas comme s\u202f: la langue doit toucher les dents. Si elle reste derrière, le Thāʾ devient Sīn.',
          'Sourd (Hams)\u202f: s’il vibre, il devient Dhāl.',
          'Rester léger (Istifāl)\u202f: si l’arrière de la langue se lève, il sonne lourd comme le Ẓāʾ.',
        ],
      },
      dha: {
        name: 'Dhāl',
        short: 'léger, sonore, comme th dans «\u202fthis\u202f»',
        makhraj:
          'Le même point que le Thāʾ\u202f: la pointe de la langue au bord des incisives supérieures.',
        mistakes: [
          'Pas comme z\u202f: la langue doit toucher les dents. Si elle reste derrière, le Dhāl devient Zāy.',
          'Sonore (Jahr)\u202f: sans voix, il devient Thāʾ.',
          'Rester léger (Istifāl)\u202f: un Dhāl lourd devient Ẓāʾ.',
        ],
      },
      zza: {
        name: 'Ẓāʾ',
        short: 'emphatique, sonore, la langue aux dents',
        makhraj:
          'Le même point que le Dhāl\u202f: la pointe de la langue au bord des incisives supérieures. L’arrière de la langue s’appuie en plus largement au palais.',
        mistakes: [
          'Pas comme z\u202f: la langue doit toucher les dents, sinon on entend un Zāy lourd.',
          'Emphatique (Iṭbāq)\u202f: la voyelle suivante sonne pleine et sombre – sinon il devient Dhāl.',
          'Ne pas le confondre avec le Ḍād\u202f: pour le Ẓāʾ, la pointe de la langue est aux dents\u202f; pour le Ḍād, le bord de la langue est aux molaires.',
        ],
      },
      lam: {
        name: 'Lām',
        short: 'léger, comme l dans «\u202flune\u202f»',
        makhraj:
          'Les bords avant de la langue, avec sa pointe, contre les gencives derrière les dents de devant du haut.',
        mistakes: [
          'Clair comme le l de «\u202flune\u202f», pas sombre comme dans l’anglais «\u202ffull\u202f»\u202f: le Lām est léger par nature.',
          'Seul le Lām de ٱللَّه devient lourd après fatḥa ou ḍamma\u202f; après kasra il reste léger – لِلَّهِ.',
          'Le garder net avec sukūn, sans l’avaler – لَمْ.',
        ],
      },
      nun: {
        name: 'Nūn',
        short: 'léger, avec ghunna',
        makhraj:
          'La pointe de la langue contre les gencives, un peu devant le Lām, plus près de la pointe. Une partie du son vient de la cavité nasale (ghunna).',
        mistakes: [
          'Comme un n ordinaire – mais avec shadda tenu nettement et nasalisé (ghunna), environ deux temps.',
          'Le nūn sākin et le tanwīn suivent leurs propres règles\u202f: net, caché ou fusionné. Tu les apprends sur le parcours.',
          'Ne pas le confondre avec le Lām\u202f: pour le Nūn, une partie de l’air passe par le nez – sinon إِنَّا («\u202fnous\u202f») devient إِلَّآ («\u202fsauf\u202f»).',
        ],
      },
      fa: {
        name: 'Fāʾ',
        short: 'léger, sourd, comme f',
        makhraj:
          'L’intérieur de la lèvre inférieure contre le bord des incisives supérieures.',
        mistakes: [
          'Comme un f ordinaire – mais ne jamais en faire un v\u202f: le Fāʾ est toujours sourd (Hams).',
          'Ne pas le confondre avec le Thāʾ\u202f: pour le Fāʾ, l’air frotte à la lèvre, pour le Thāʾ à la langue entre les dents – يُنفِقُ («\u202fil dépense\u202f»), pas يُوثِقُ («\u202fil attache\u202f»).',
          'Rester léger (Istifāl)\u202f: la voyelle suivante sonne claire.',
        ],
      },
      ba: {
        name: 'Bāʾ',
        short: 'sonore, ferme, avec qalqala',
        makhraj: 'Les deux lèvres se ferment fermement et s’ouvrent d’un coup.',
        mistakes: [
          'Ne pas le changer en p en fin de mot ou avant sukūn, comme en allemand («\u202fab\u202f»)\u202f: le Bāʾ reste sonore et rebondit (qalqala).',
          'Ferme (Shidda)\u202f: les lèvres se ferment complètement, le son s’arrête.',
          'Ne pas le confondre avec le Wāw\u202f: pour le Bāʾ, les lèvres se ferment – بَلَدًا («\u202fun pays\u202f»), pas وَلَدًا («\u202fun enfant\u202f»).',
        ],
      },
      mim: {
        name: 'Mīm',
        short: 'lèvres fermées, avec ghunna',
        makhraj:
          'Les deux lèvres se ferment, plus légèrement que pour le Bāʾ\u202f; le son passe par le nez (ghunna).',
        mistakes: [
          'Avec shadda, tenir nettement le son nasal, environ deux temps – ثُمَّ.',
          'Le mīm sākin est caché devant le Bāʾ et fusionné devant le Mīm\u202f; devant toutes les autres lettres, il reste net.',
          'Ne pas le confondre avec le Wāw\u202f: pour le Mīm, les lèvres se ferment complètement – لَمْ («\u202fne… pas\u202f»), pas لَوْ («\u202fsi\u202f»).',
        ],
      },
      waw: {
        name: 'Wāw',
        short: 'doux, sonore, lèvres arrondies',
        makhraj: 'Les deux lèvres s’arrondissent vers l’avant sans se fermer.',
        mistakes: [
          'Pas comme le w allemand, où les dents touchent la lèvre inférieure\u202f: pour le Wāw, seules les lèvres s’arrondissent, comme le ou de «\u202foui\u202f».',
          'Ne pas en faire un Bāʾ\u202f: les lèvres ne se ferment pas – وَلَدًا («\u202fun enfant\u202f»), pas بَلَدًا («\u202fun pays\u202f»).',
          'Un Wāw avec voyelle est une consonne, pas une voyelle longue\u202f: وُجُوهٌ commence par w, pas par ou.',
        ],
      },
    },
    makhraj: 'Makhraj · où il naît',
    sifat: 'Ṣifāt · ses qualités',
    sifa: {
      shidda: {
        name: 'Shidda',
        meaning:
          'Ferme\u202f: le son est entièrement retenu et s’arrête – il ne coule pas.',
      },
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
      qalqala: {
        name: 'Qalqala',
        meaning:
          'Rebond\u202f: avec sukūn, le son rebondit brièvement, comme un petit écho (ق ط ب ج د).',
      },
      tafashshi: {
        name: 'Tafashshī',
        meaning:
          'Diffusion\u202f: l’air se répand dans toute la bouche (seulement le Shīn).',
      },
      istitala: {
        name: 'Istiṭāla',
        meaning:
          'Allongement\u202f: le son court le long de tout le bord de la langue, de l’arrière à la pointe (seulement le Ḍād).',
      },
      ghunna: {
        name: 'Ghunna',
        meaning:
          'Nasalisation\u202f: un son de la cavité nasale, propre au Nūn et au Mīm.',
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
      hamzaAyn: {
        title: 'Hamza ou ʿAyn\u202f?',
        intro:
          'Dix mots, à l’oreille seulement\u202f: une attaque nette (Hamza) ou un son pressé de la gorge (ʿAyn)\u202f?',
        question: 'Quelle lettre entends-tu\u202f?',
      },
      hSounds: {
        title: 'Hāʾ, Ḥāʾ ou Khāʾ\u202f?',
        intro:
          'Dix mots, à l’oreille seulement\u202f: un souffle léger, un souffle fort de la gorge resserrée ou un frottement comme dans «\u202fBach\u202f»\u202f?',
        question: 'Quelle lettre entends-tu\u202f?',
      },
      khGh: {
        title: 'Khāʾ ou Ghayn\u202f?',
        intro:
          'Dix mots, à l’oreille seulement\u202f: le frottement est-il sans voix (Khāʾ) ou avec voix (Ghayn)\u202f?',
        question: 'Quelle lettre entends-tu\u202f?',
      },
      qafKaf: {
        title: 'Qāf ou Kāf\u202f?',
        intro:
          'Dix mots, à l’oreille seulement\u202f: profond et emphatique (Qāf) ou plus en avant et léger (Kāf)\u202f?',
        question: 'Quelle lettre entends-tu\u202f?',
      },
      middle: {
        title: 'Jīm, Shīn ou Yāʾ\u202f?',
        intro:
          'Dix mots, à l’oreille seulement\u202f: ferme avec voix (Jīm), un souffle large (Shīn) ou doux comme le y de «\u202fyeux\u202f» (Yāʾ)\u202f?',
        question: 'Quelle lettre entends-tu\u202f?',
      },
      dadDal: {
        title: 'Ḍād ou Dāl\u202f?',
        intro:
          'Dix mots, à l’oreille seulement\u202f: emphatique et plein (Ḍād) ou léger comme un d ordinaire (Dāl)\u202f?',
        question: 'Quelle lettre entends-tu\u202f?',
      },
      tip: {
        title: 'Ṭāʾ, Dāl ou Tāʾ\u202f?',
        intro:
          'Dix mots, à l’oreille seulement\u202f: emphatique (Ṭāʾ), sonore (Dāl) ou léger avec un souffle (Tāʾ)\u202f?',
        question: 'Quelle lettre entends-tu\u202f?',
      },
      teeth: {
        title: 'Thāʾ, Dhāl ou Ẓāʾ\u202f?',
        intro:
          'Dix mots, à l’oreille seulement\u202f: sans voix (Thāʾ), avec voix (Dhāl) ou emphatique avec voix (Ẓāʾ)\u202f?',
        question: 'Quelle lettre entends-tu\u202f?',
      },
      lamNun: {
        title: 'Lām ou Nūn\u202f?',
        intro:
          'Dix mots, à l’oreille seulement\u202f: le son coule-t-il le long du bord de la langue (Lām) ou par le nez (Nūn)\u202f?',
        question: 'Quelle lettre entends-tu\u202f?',
      },
      faTha: {
        title: 'Fāʾ ou Thāʾ\u202f?',
        intro:
          'Dix mots, à l’oreille seulement\u202f: l’air frotte-t-il à la lèvre (Fāʾ) ou à la langue entre les dents (Thāʾ)\u202f?',
        question: 'Quelle lettre entends-tu\u202f?',
      },
      lips: {
        title: 'Bāʾ, Mīm ou Wāw\u202f?',
        intro:
          'Dix mots, à l’oreille seulement\u202f: fermé d’un coup (Bāʾ), fermé par le nez (Mīm) ou rond et ouvert (Wāw)\u202f?',
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
        hamza: 'Hamza\u202f: une attaque courte et ferme – sans presser.',
        ha: 'Hāʾ\u202f: un souffle doux et ouvert.',
        ayn: 'ʿAyn\u202f: pressé depuis le milieu de la gorge, la voix sonne.',
        hha: 'Ḥāʾ\u202f: un souffle fort de la gorge resserrée, sans frottement en haut.',
        ghayn: 'Ghayn\u202f: un frottement doux avec voix.',
        kha: 'Khāʾ\u202f: un frottement sans voix, comme dans «\u202fBach\u202f».',
        qaf: 'Qāf\u202f: profond et emphatique, la voyelle sonne sombre.',
        kaf: 'Kāf\u202f: plus en avant, léger, avec un léger souffle.',
        jim: 'Jīm\u202f: ferme et sonore, comme dj.',
        shin: 'Shīn\u202f: un souffle large sans voix.',
        ya: 'Yāʾ\u202f: doux, comme le y de «\u202fyeux\u202f».',
        dad: 'Ḍād\u202f: emphatique, la langue s’appuie largement au palais.',
        tta: 'Ṭāʾ\u202f: emphatique et ferme, sans souffle.',
        dal: 'Dāl\u202f: léger et sonore.',
        ta: 'Tāʾ\u202f: léger, avec un léger souffle.',
        tha: 'Thāʾ\u202f: aux dents, sans voix.',
        dha: 'Dhāl\u202f: aux dents, avec voix, léger.',
        zza: 'Ẓāʾ\u202f: aux dents, avec voix, emphatique.',
        lam: 'Lām\u202f: clair, le son coule le long du bord de la langue.',
        nun: 'Nūn\u202f: une partie du son vient du nez.',
        fa: 'Fāʾ\u202f: l’air frotte à la lèvre.',
        ba: 'Bāʾ\u202f: les lèvres se ferment complètement, avec voix.',
        mim: 'Mīm\u202f: les lèvres sont fermées, le son passe par le nez.',
        waw: 'Wāw\u202f: lèvres arrondies, pas fermées.',
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
