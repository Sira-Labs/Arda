/**
 * Arabic (ADR-0020); typed against the German source catalog. The document runs right to
 * left; tajwīd terms use their Arabic names.
 */
import type { Messages } from './de';

/** Arabic-Indic digits. */
const num = (n: number): string => n.toLocaleString('ar-EG');

/** "n cards" with the Arabic number agreement (one, two, three to ten, eleven and more). */
function cards(count: number): string {
  if (count === 1) return 'بطاقة واحدة';
  if (count === 2) return 'بطاقتان';
  return count <= 10 ? `${num(count)} بطاقات` : `${num(count)} بطاقة`;
}

/** "n students" with the Arabic number agreement. */
function studentCount(count: number): string {
  if (count === 1) return 'طالب واحد';
  if (count === 2) return 'طالبان';
  return count <= 10 ? `${num(count)} طلاب` : `${num(count)} طالبًا`;
}

/** "n āyāt" with the Arabic number agreement. */
function ayatCount(count: number): string {
  if (count === 1) return 'آية واحدة';
  if (count === 2) return 'آيتان';
  return count <= 10 ? `${num(count)} آيات` : `${num(count)} آية`;
}

/** "n times" with the Arabic number agreement. */
function times(count: number): string {
  if (count === 1) return 'مرة واحدة';
  if (count === 2) return 'مرتان';
  return count <= 10 ? `${num(count)} مرات` : `${num(count)} مرة`;
}

/** "n more tasks" with the Arabic number agreement. */
function moreTasks(count: number): string {
  if (count === 1) return 'مهمة أخرى';
  if (count === 2) return 'مهمتان أخريان';
  return count <= 10 ? `${num(count)} مهام أخرى` : `${num(count)} مهمة أخرى`;
}

export const ar: Messages = {
  nav: {
    brand: 'العَرْضة',
    label: 'التنقل الرئيسي',
    today: 'اليوم',
    path: 'المسار',
    mushaf: 'المصحف',
    lab: 'المختبر',
    sheikh: 'الشيخ',
  },
  language: { label: 'اللغة' },
  today: {
    eyebrow: 'اليوم',
    greeting: (name) => (name ? `السلام عليكم يا ${name}` : 'السلام عليكم'),
    account: 'الحساب',
    signIn: 'الدخول',
    offline: 'دون اتصال – واصل التعلّم، وسيرى شيخك ذلك عند الاتصال القادم.',
    fromSheikh: 'من شيخي',
    noTasks: 'لا توجد واجبات بعد',
    noTasksHint: 'حين يحدد لك موضعًا في المصحف يظهر هنا في الأعلى مع موعده.',
    connect: 'انضم إلى شيخك',
    connectHint: 'سجّل الدخول وانضم إلى حلقته عبر رابط أو رمز QR.',
    nextUnit: 'التالي في المسار · الوحدة ٢',
    openCard: 'افتح بطاقة الحكم',
    legend: 'ألوان المصحف',
  },
  rules: {
    ghunna: { name: 'غنة', hint: 'صوت من الخيشوم، حركتان (إخفاء، إدغام، إقلاب)' },
    qalqala: { name: 'قلقلة', hint: 'اضطراب الصوت في ق ط ب ج د عند السكون' },
    silent: { name: 'لا يُنطق', hint: 'يُكتب ولا يُلفظ' },
    'madd-2': { name: 'مد ٢', hint: 'المد الطبيعي، حركتان' },
    'madd-4': { name: 'مد ٤–٥', hint: 'المد المتصل أو المنفصل' },
    'madd-6': { name: 'مد ٦', hint: 'المد اللازم، ست حركات' },
  },
  path: {
    eyebrow: 'المسار',
    unitTitle: 'الوحدة ٢ · النون الساكنة والتنوين',
    intro:
      'الحرف الذي يلي النون الساكنة أو التنوين يحدد طريقة النطق: ٢٨ حرفًا وأربعة أحكام – ٦ + ٦ + ١ + ١٥.',
    letters: (count) => {
      if (count === 1) return 'حرف واحد';
      if (count === 2) return 'حرفان';
      const n = count.toLocaleString('ar-EG');
      return count <= 10 ? `${n} أحرف` : `${n} حرفًا`;
    },
    next: 'تليها الوحدة ٣ (الغنة والميم الساكنة) والوحدة ٤ (القلقلة)، من ورقة شيخك أيضًا.',
  },
  ruleCard: {
    eyebrow: 'الوحدة ٢ · الفهم',
    close: 'إغلاق',
    progress: (index, total) =>
      `البطاقة ${index.toLocaleString('ar-EG')} من ${total.toLocaleString('ar-EG')}`,
    draft: 'مسودة',
    draftHint: 'لم يراجعها شيخك بعد.',
    letters: 'إذا تلاه أحد هذه الحروف',
    examples: 'أمثلة من ورقتك',
    decides: 'هذا الحرف يحدد الحكم',
    followerKey: 'ما تحته خط = الحرف الذي يحدد الحكم',
    clear: 'دون لون = يُنطق بوضوح',
    colourKey: (colour, name, hint) => `${colour} = ${name}، ${hint}`,
    colours: {
      ghunna: 'الأخضر',
      qalqala: 'الأزرق',
      silent: 'الرمادي',
      'madd-2': 'الأحمر الفاتح',
      'madd-4': 'الأحمر',
      'madd-6': 'الأحمر الداكن',
    },
    cases: { inside: 'في كلمة واحدة', across: 'بين كلمتين', tanwin: 'بعد التنوين' },
    withGhunna: 'بغنة',
    withoutGhunna: 'بلا غنة',
    exceptions: 'استثناء: في الكلمة الواحدة يبقى الإظهار',
    sourcesDiffer: 'المصادر تختلف',
    sources: {
      iqlabGhunna: 'أحد المصادر يعلّم الإقلاب دون غنة. نحن نعلّمه بغنة كما في ورقتك.',
    },
    teacherNote: 'ملاحظة شيخك: لا شيء بعد.',
    previous: 'السابق',
    next: 'التالي',
    done: 'إلى الوحدة',
  },
  cards: {
    izhar: {
      title: 'النطق بالنون واضحة قبل حروف الحلق الستة',
      steps: [
        'تعرّف على النون الساكنة أو التنوين.',
        'إن تلاه أحد حروف الحلق الستة فهو إظهار.',
        'انطق النون واضحة دون غنة ودون إدغام.',
        'انتقل إلى حرف الحلق مباشرة دون سكت.',
      ],
      tip: 'سُمّي إظهارًا حلقيًا لأن الحروف الستة تخرج من الحلق.',
    },
    idgham: {
      title: 'تُدغم النون في الكلمة التالية',
      steps: [
        'تعرّف على النون الساكنة أو التنوين في آخر الكلمة.',
        'إن بدأت الكلمة التالية بأحد الحروف الستة أُدغمت النون فيه.',
        'مع «ينمو» تبقى غنة بمقدار حركتين، ومع اللام والراء تسقط.',
        'لا إدغام إلا بين كلمتين؛ في الكلمة الواحدة يبقى الإظهار.',
      ],
      tip: 'حروفه مجموعة في كلمة «يرملون».',
    },
    iqlab: {
      title: 'تُقلب النون ميمًا قبل الباء',
      steps: [
        'تعرّف على النون الساكنة أو التنوين قبل الباء',
        'اقلب النون ميمًا',
        'أطبق الشفتين وأمسك الغنة حركتين',
        'افتح الشفتين وانطق الباء',
      ],
      tip: 'في المصحف تُكتب غالبًا ميم صغيرة فوق النون أو التنوين.',
    },
    ikhfa: {
      title: 'تُخفى النون مع الغنة',
      steps: [
        'تعرّف على النون الساكنة أو التنوين قبل أحد الحروف الخمسة عشر.',
        'لا يعتمد اللسان على مخرج النون: تُخفى النون ولا تُظهر.',
        'أمسك الغنة حركتين والفم مستعد للحرف التالي.',
        'ثم انطق الحرف.',
      ],
      tip: 'حروفه أوائل كلمات البيت: صِفْ ذا ثَنا كَمْ جادَ شَخْصٌ قَدْ سَما / دُمْ طَيِّبًا زِدْ في تُقًى ضَعْ ظالِما.',
    },
  },
  games: {
    eyebrow: 'الوحدة ٢ · التدريب',
    practise: 'التدريب',
    progress: (index, total) => `${num(index)} / ${num(total)}`,
    seconds: (seconds) => `${num(seconds)} ث`,
    options: 'الأحكام',
    whichRule: {
      title: 'ما الحكم؟',
      intro:
        'عشر كلمات حقيقية من ورقتك: انظر إلى الحرف الذي يلي النون الساكنة أو التنوين.',
      question: 'ما حكم النون أو التنوين المحدد؟',
    },
    sort: {
      title: 'رتّب الحروف الثمانية والعشرين',
      intro: 'لكل حرف حكم واحد فقط. ما أسرع وقت ترتّب فيه الحروف كلها؟',
      question: 'النون الساكنة قبل هذا الحرف – ما الحكم؟',
      best: (seconds) => `أفضل وقت: ${num(seconds)} ث`,
      newBest: 'وقت قياسي جديد!',
    },
    review: {
      title: 'المراجعة',
      intro: 'ما أخطأت فيه يعود إليك حتى تتقنه.',
      none: 'لا شيء للمراجعة الآن. أحسنت!',
      open: (count) => `راجع ${cards(count)}`,
    },
    good: 'جيد',
    check: 'راجِع',
    rightAnswer: 'الصواب',
    follows: 'يليه',
    insideWord: 'في كلمة واحدة، وهو الاستثناء',
    toReview: 'سيُضاف إلى مراجعتك.',
    next: 'التالي',
    finish: 'النتيجة',
    score: (right, total) => `${num(right)} من ${num(total)} صحيحة`,
    newCards: (count) =>
      count === 0 ? 'لا بطاقات مراجعة جديدة.' : `تُضاف ${cards(count)} إلى مراجعتك.`,
    again: 'مرة أخرى',
    back: 'إلى الوحدة',
  },
  halaqa: {
    mine: 'حلقاتي',
    none: 'لست في أي حلقة بعد. اطلب رابط الدعوة من شيخك، أو أره هذه الصفحة.',
    noneTeacher: 'لم تفتح أي حلقة بعد.',
    teacherOf: (name) => (name ? `مع ${name}` : 'مع شيخك'),
    waiting: 'بانتظار الموافقة',
    oneToOne: 'درس فردي',
    students: (count) => studentCount(count),
    pending: (count) => `${num(count)} بالانتظار`,
    create: {
      title: 'حلقة جديدة',
      name: 'الاسم',
      placeholder: 'مثلًا: جزء عمّ، يوم الثلاثاء',
      oneToOne: 'درس فردي (طالب واحد فقط)',
      submit: 'افتح الحلقة',
    },
    invite: {
      title: 'دعوة',
      hint: 'شارك الرابط أو اعرض رمز QR. من ينضم ينتظر حتى توافق.',
      create: 'أنشئ رابط دعوة',
      renew: 'أنشئ رابطًا جديدًا',
      validUntil: (date) => `صالح حتى ${date}. الرابط الجديد يحل محل هذا.`,
      hidden: (date) =>
        `يوجد رابط فعّال حتى ${date}. يظهر عند إنشائه فقط؛ والرابط الجديد يحل محله.`,
      copy: 'انسخ الرابط',
      copied: 'نُسخ الرابط.',
      share: 'مشاركة',
      revoke: 'اسحب الرابط',
      revoked: 'لم يعد الرابط يعمل.',
      qr: 'رمز QR للانضمام',
    },
    waitingTitle: 'بانتظار الموافقة',
    approve: 'اقبل',
    reject: 'ارفض',
    membersTitle: 'الطلاب',
    remove: 'أزل',
    noMembers: 'لا أحد بعد. شارك رابط الدعوة.',
    leave: 'غادر الحلقة',
    retry: 'حاول مرة أخرى',
    back: 'إلى حلقاتي',
    join: {
      eyebrow: 'دعوة',
      title: (name) => `حلقة «${name}»`,
      signIn: 'سجّل الدخول للانضمام، ثم تعود إلى هنا.',
      confirm: 'انضم',
      pending: 'أُرسل الطلب. حين يوافق شيخك ترى الحلقة وواجباته.',
      active: 'أنت في هذه الحلقة بالفعل.',
      missing: 'افتح رابط الدعوة من شيخك أو امسح رمز QR الخاص به.',
    },
  },
  assignments: {
    title: 'المهام',
    kinds: {
      learn: 'تعلُّم',
      read: 'قراءة',
      recite: 'إعادة التلاوة',
      practise: 'تدريب',
    },
    range: (sura, from, to) =>
      from === to
        ? `سورة ${num(sura)}، الآية ${num(from)}`
        : `سورة ${num(sura)}، الآيات ${num(from)}–${num(to)}`,
    times: (count) => times(count),
    rangeWords: (sura, from, wordFrom, to, wordTo) =>
      from !== to
        ? `سورة ${num(sura)}، من الآية ${num(from)} الكلمة ${num(wordFrom)} إلى الآية ${num(to)} الكلمة ${num(wordTo)}`
        : wordFrom === wordTo
          ? `سورة ${num(sura)}، الآية ${num(from)}، الكلمة ${num(wordFrom)}`
          : `سورة ${num(sura)}، الآية ${num(from)}، الكلمات ${num(wordFrom)}–${num(wordTo)}`,
    focus: 'انتبه إلى',
    // The Arabic names already tell the two idghām rules apart.
    variant: () => null,
    due: (date) => `حتى ${date}`,
    dueToday: 'مستحقة اليوم',
    overdue: (date) => `متأخرة منذ ${date}`,
    from: (name, halaqa) => (name ? `من ${name} · ${halaqa}` : halaqa),
    markDone: 'أنجزتُها',
    done: 'أُنجزت – يراها شيخك.',
    doneOn: (date) => `أُنجزت في ${date}`,
    undo: 'لم أُنجزها بعد',
    openCard: 'إلى بطاقة الحكم',
    play: 'إلى اللعبة',
    more: (count) => moreTasks(count),
    none: 'لا مهام في هذه الحلقة بعد.',
    older: 'عرض الأقدم',
    forAll: 'للجميع',
    forStudent: (name) => `لـ${name}`,
    doneCount: (done, of) => `أنجزها ${num(done)} من ${num(of)}`,
    doneBy: 'أنجزها',
    remove: 'سحب',
    form: {
      title: 'إعطاء مهمة',
      who: 'لمن',
      everyone: 'جميع الطلاب',
      kind: 'النوع',
      sura: 'السورة',
      from: 'من الآية',
      to: 'إلى الآية',
      rule: 'الحكم',
      noRule: 'بلا',
      repetitions: 'كم مرة',
      due: 'تاريخ الاستحقاق',
      note: 'ملاحظة (اختيارية)',
      submit: 'إعطاء المهمة',
      given: 'أُعطيت المهمة.',
    },
  },
  mushaf: {
    eyebrow: 'المصحف · جزء عمّ',
    title: 'المصحف',
    script:
      'بالرسم العثماني (المدني)، رواية حفص. يأتي الرسم الهندي لمصحفك حين يتضح مصدره.',
    sura: (number) => `سورة ${num(number)}`,
    ayat: (count) => ayatCount(count),
    loading: 'جارٍ تحميل المصحف …',
    saved: 'محفوظ للاستخدام دون اتصال',
    failure: {
      offline: 'افتح المصحف مرة واحدة مع الاتصال، ثم يعمل دونه أيضًا.',
      checksum: 'وصلت بيانات المصحف تالفة. أعد تحميل الصفحة من فضلك.',
      invalid: 'وصلت بيانات المصحف تالفة. أعد تحميل الصفحة من فضلك.',
      missing: 'هذه السورة ليست في المصحف بعد.',
    },
    tap: 'اضغط على كلمة لترى أحكامها.',
    all: 'كل السور',
    previous: 'السورة السابقة',
    next: 'السورة التالية',
    range: (from, to) =>
      from === to ? `مهمتك: الآية ${num(from)}` : `مهمتك: الآيات ${num(from)}–${num(to)}`,
    word: (sura, aya, n) => `سورة ${num(sura)}، الآية ${num(aya)}، الكلمة ${num(n)}`,
    noRule: 'لا حكم معلَّم هنا: اقرأ بوضوح.',
    follows: (rule) => `يحدد الحكم الذي قبله: ${rule}`,
    close: 'إغلاق',
    open: 'افتح في المصحف',
    assign: 'أعطِ مهمة هنا',
    pick: 'اضغط على الكلمة الأولى ثم على الكلمة الأخيرة من المهمة.',
    cancel: 'إلغاء',
    halaqa: 'الحلقة',
    sources: 'المصادر',
    text: 'النص: مشروع تنزيل (CC BY 3.0)',
    rules: 'أحكام التجويد: cpfair/quran-tajweed (CC BY 4.0)',
  },
  signIn: {
    eyebrow: 'الدخول',
    title: 'مرحبًا بك في العَرْضة',
    intro:
      'سجّل الدخول ليستمع شيخك إلى تلاوتك ويعطيك الواجبات. دون كلمة مرور: نرسل إليك رابطًا ورمزًا.',
    linkFailed: 'انتهت صلاحية الرابط أو استُخدم من قبل. اطلب رابطًا جديدًا.',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'you@example.com',
    sendLink: 'أرسل الرابط',
    sentTo: (email) => `✓ أُرسل الرابط إلى ${email}`,
    sentHint:
      'افتح الرسالة على هذا الجهاز واضغط «الدخول إلى العَرْضة». الرابط والرمز صالحان ١٥ دقيقة. لم يصل شيء؟ انظر في مجلد الرسائل غير المرغوب فيها.',
    codeLabel:
      'هل يفتح تطبيق البريد الرابط في متصفحه الخاص؟ أدخل هنا الرمز المكوّن من ٦ أرقام من الرسالة:',
    code: 'رمز الدخول',
    confirm: 'دخول',
    resend: 'أعد الإرسال',
    otherEmail: 'بريد إلكتروني آخر',
    sendFailed: 'تعذّر إرسال رابط الدخول.',
    signInFailed: 'لم ينجح الدخول.',
    passkey: 'الدخول بمفتاح المرور',
  },
  account: {
    eyebrow: 'الحساب',
    roles: { student: 'طالب', teacher: 'شيخ / معلّم', admin: 'مشرف' },
    devices: 'الأجهزة المتصلة',
    unknownDevice: 'جهاز غير معروف',
    thisDevice: 'هذا الجهاز',
    endOthers: 'تسجيل الخروج من الأجهزة الأخرى',
    endedOthers: (count) => `تم تسجيل الخروج من ${count} من الأجهزة الأخرى.`,
    addPasskey: 'إضافة مفتاح مرور',
    passkeyAdded: 'أُضيف مفتاح المرور.',
    signOut: 'تسجيل الخروج',
    languageHint: 'بهذه اللغة ترى التطبيق وتصلك الرسائل وتقرأ ملاحظات شيخك.',
  },
  passkey: {
    'already-added': 'يوجد على هذا الجهاز مفتاح مرور للعَرْضة بالفعل.',
    'stale-session': 'للأمان: سجّل الدخول مجددًا (رابط أو رمز) ثم أضف مفتاح المرور.',
    'unknown-passkey': 'مفتاح المرور هذا غير معروف لدى العَرْضة. ادخل برابط أو رمز.',
    'not-verified': 'أكّد بوجهك أو بصمتك أو رمز جهازك.',
    'rate-limited': 'محاولات كثيرة – حاول بعد دقائق.',
    offline: 'لا يوجد اتصال – حاول بعد قليل.',
    failed: 'لم ينجح ذلك. حاول مجددًا أو استخدم رابطًا أو رمزًا.',
  },
  errors: {
    offline: 'لا يوجد اتصال.',
    unauthorized: 'يرجى تسجيل الدخول.',
    forbidden: 'ليست لديك صلاحية لذلك.',
    not_found: 'غير موجود.',
    invalid_body: 'المدخلات غير صالحة.',
    invalid_redirect: 'عنوان العودة غير صالح.',
    cross_origin: 'جاء هذا الطلب من موقع آخر.',
    INVALID_OTP: 'الرمز غير صحيح.',
    OTP_EXPIRED: 'انتهت صلاحية الرمز – اطلب رابطًا جديدًا.',
    TOO_MANY_ATTEMPTS: 'محاولات خاطئة كثيرة – اطلب رابطًا جديدًا.',
    invite_invalid:
      'انتهت صلاحية هذا الرابط أو أنه غير صالح. اطلب رابطًا جديدًا من شيخك.',
    halaqa_full: 'هذا الدرس الفردي له طالب بالفعل.',
    too_many_halaqat: 'بلغت الحد الأقصى لعدد الحلقات.',
    too_many_assignments: 'بلغت هذه الحلقة الحد الأقصى لعدد المهام.',
    generic: (status) => `خطأ في الخادم (${status}).`,
  },
  remarks: {
    ghunnaShort: 'الغنة قصيرة – أمسكها حركتين.',
    ghunnaLong: 'الغنة طويلة – حركتان فقط.',
    nunTooClear: 'النون ظاهرة أكثر من اللازم – هنا تُخفى (إخفاء).',
    qalqalaMissing: 'القلقلة غائبة – اجعل الصوت يرتدّ قليلًا.',
    maddShort: 'المد قصير – أطِل أكثر.',
    good: 'أحسنت، حافظ على ذلك.',
  },
  feedback: {
    eyebrow: 'للشيخ',
    title: 'ملاحظاتك بلغة طلابك',
    intro:
      'اكتب بلغتك. يقرأ كل طالب الملاحظات السريعة بلغته، وتترجم العَرْضة النص الحر مع إبقاء مصطلحات التجويد والآيات كما هي.',
    quick: 'ملاحظات سريعة',
    write: 'ملاحظتك الخاصة',
    from: 'أكتب بـ',
    to: 'يقرأ الطالب بـ',
    placeholder: 'مثال: Your ghunna on “min sharri” was too short.',
    preview: 'ما يقرؤه طالبك',
    translate: 'عرض الترجمة',
    machine: 'ترجمة آلية',
    original: 'الأصل',
    sameLanguage: 'اللغة نفسها – لا حاجة إلى ترجمة.',
    unavailable: {
      not_configured: 'الترجمة غير مفعّلة على هذا الخادم.',
      limit: 'بلغت الحد اليومي للترجمات – تستأنف غدًا.',
      refused: 'الترجمة غير متاحة. يتلقى طالبك النص الأصلي.',
      failed: 'الترجمة غير ممكنة الآن. يتلقى طالبك النص الأصلي.',
    },
  },
  soon: {
    eyebrow: 'قيد الإعداد',
    notFound: { title: 'غير موجود', text: 'هذه الصفحة غير موجودة.' },
    mushaf: {
      title: 'المصحف',
      text: 'مصحف IndoPak بألوان التجويد: اضغط على حرف واستمع إلى القارئ كلمةً كلمة، ببطء وبتكرار.',
    },
    lab: {
      title: 'مختبر الحروف',
      text: 'من أين يخرج الصوت: المخارج مرسومةً ومتحركة، يراجعها شيخك.',
    },
    sheikh: {
      title: 'شيخي',
      text: 'حلقتك، وواجباته على الصفحة، وتلاواتك في قائمة استماعه، وسجل العَرْضة.',
    },
  },
};
