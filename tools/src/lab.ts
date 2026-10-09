import type { Pack } from '@arda/quran';
import type { LabClips } from './labClips';

/**
 * The words of the letter lab (spec F5; first set س ز ص ر, the throat ء ه ع ح غ خ, the back
 * and middle of the tongue ق ك ج ش ي, ḍād and the tip of the tongue ض ط د ت, the teeth ث ذ ظ
 * with lām and nūn, the lips ف ب م و), taken from the shipped packs rather than typed by hand. The picks below are only word keys; the text in both
 * scripts, the letter to mark and, for rāʾ, whether it is heavy or light are read from the words
 * and checked here, so a pick that does not show what it is meant to show fails the build.
 */

export type LabLetter =
  | 'sin'
  | 'zay'
  | 'sad'
  | 'ra'
  | 'hamza'
  | 'ha'
  | 'ayn'
  | 'hha'
  | 'ghayn'
  | 'kha'
  | 'qaf'
  | 'kaf'
  | 'jim'
  | 'shin'
  | 'ya'
  | 'dad'
  | 'tta'
  | 'dal'
  | 'ta'
  | 'tha'
  | 'dha'
  | 'zza'
  | 'lam'
  | 'nun'
  | 'fa'
  | 'ba'
  | 'mim'
  | 'waw';
export type Weight = 'heavy' | 'light';

/** How each letter is written; hamza has its seats (أ إ ؤ ئ) and stands alone (ء). */
const LETTER: Record<LabLetter, string> = {
  sin: 'س',
  zay: 'ز',
  sad: 'ص',
  ra: 'ر',
  hamza: 'أإءؤئ',
  ha: 'ه',
  ayn: 'ع',
  hha: 'ح',
  ghayn: 'غ',
  kha: 'خ',
  qaf: 'ق',
  kaf: 'ك',
  jim: 'ج',
  shin: 'ش',
  ya: 'ي',
  dad: 'ض',
  tta: 'ط',
  dal: 'د',
  ta: 'ت',
  tha: 'ث',
  dha: 'ذ',
  zza: 'ظ',
  lam: 'ل',
  nun: 'ن',
  fa: 'ف',
  ba: 'ب',
  mim: 'م',
  waw: 'و',
};

/** IndoPak writes a hamza that opens a word as a bare alif with its vowel (اَحَدٌ). */
const INDOPAK_LETTER: Partial<Record<LabLetter, string>> = { hamza: `ا${LETTER.hamza}` };

/**
 * The letters a word of a letter must not also hold, so that its listening quiz has one answer:
 * the letters it is heard against (the whistling three; hamza and ʿayn; hāʾ, ḥāʾ and khāʾ;
 * khāʾ and ghayn; qāf and kāf; jīm, shīn and yāʾ; ḍād and dāl; ṭāʾ, dāl and tāʾ; thāʾ, dhāl
 * and ẓāʾ; lām and nūn; fāʾ and thāʾ; bāʾ, mīm and wāw). Rāʾ is
 * asked heavy or light instead. Yāʾ has its dotless form too (ى, as in شَىْءٍ, where it is
 * heard as a yāʾ), and tāʾ its tied form (ة, a t when the reciter goes on). Ḍād keeps clear of
 * ẓāʾ too, the letter it is most often mixed up with in Arabic, and ẓāʾ of ḍād.
 */
const RIVALS: Record<Exclude<LabLetter, 'ra'>, string> = {
  sin: 'سزص',
  zay: 'سزص',
  sad: 'سزص',
  hamza: 'أإءؤئع',
  ayn: 'أإءؤئع',
  ha: 'هحخ',
  hha: 'هحخ',
  kha: 'هحخغ',
  ghayn: 'غخ',
  qaf: 'قك',
  kaf: 'قك',
  jim: 'جشيى',
  shin: 'جشيى',
  ya: 'جشيى',
  dad: 'ضدظ',
  tta: 'طدتة',
  dal: 'طدتةض',
  ta: 'طدتة',
  tha: 'ثذظف',
  dha: 'ثذظ',
  zza: 'ثذظض',
  lam: 'لن',
  nun: 'لن',
  fa: 'فث',
  ba: 'بمو',
  mim: 'بمو',
  waw: 'بمو',
};

/** The other forms of a letter, counted as that letter: dotless yāʾ, tied tāʾ. */
const SAME: Record<string, string> = { ى: 'ي', ة: 'ت' };

const FATHA = '\u064E';
const DAMMA = '\u064F';
const KASRA = '\u0650';
const SHADDA = '\u0651';

/** Harakāt and the other marks that sit on a letter (not letters themselves). */
const MARK = /[\u064B-\u065F\u0670\u06D6-\u06ED]/;

/**
 * Picks, `sura:aya:n`, al-Ḥuṣarī's teaching recitation timing each as a word of its own. The
 * letter with a vowel at the start of the word (after the article or wa/fa at most), short
 * well-known words from Juzʾ ʿAmma, al-Fātiḥa and al-Baqara; whistling words hold no other
 * whistling letter, so a listening quiz has one answer. A word whose letter follows a nūn sākin
 * or tanwīn (or a letter merged into it) is left out: there the reciter hides the nūn in it, and
 * the clip would start in the ghunna.
 */
export const LAB_PICKS: Record<LabLetter, readonly string[]> = {
  sin: [
    '87:1:1', // sabbiḥ
    '97:5:1', // salāmun
    '102:3:2', // sawfa
    '93:2:3', // sajā
    '78:13:2', // sirājan
    '2:255:10', // sinatun
    '81:8:3', // suʾilat
    '2:32:2', // subḥānaka
    '2:93:13', // samiʿnā
    '2:154:6', // sabīli
  ],
  zay: [
    '99:1:2', // zulzilati
    '102:2:2', // zurtumu
    '79:13:3', // zajratun
    '81:7:3', // zuwwijat
    '99:1:4', // zilzālahā
    '95:1:2', // wa-z-zaytūni
    '98:5:13', // az-zakāta
    '2:212:1', // zuyyina
    '2:230:10', // zawjan
    '2:247:31', // wa-zādahu
  ],
  sad: [
    '1:6:2', // aṣ-ṣirāṭa
    '78:38:5', // ṣaffan
    '80:25:4', // ṣabban
    '87:19:1', // ṣuḥufi
    '81:18:1', // wa-ṣ-ṣubḥi
    '89:13:1', // fa-ṣabba
    '2:3:5', // aṣ-ṣalāta
    '2:158:2', // aṣ-ṣafā
    '2:250:9', // ṣabran
    '2:138:1', // ṣibghata
  ],
  hamza: [
    '89:25:5', // aḥadun
    '97:3:5', // alfi
    '84:25:7', // ajrun
    '1:5:1', // iyyāka
    '114:3:1', // ilāhi
    '2:173:20', // ithma
    '89:7:1', // irama
    '2:258:22', // uḥyī
    '2:187:1', // uḥilla
    '2:184:13', // ukhara
  ],
  ha: [
    '79:40:9', // al-hawā
    '104:1:3', // humazatin
    '2:67:13', // huzuwan
    '2:111:8', // hūdan
    '83:17:3', // hādhā
    '101:9:2', // hāwiyatun
    '2:218:5', // hājarū
    '112:1:2', // huwa
    '87:3:3', // fa-hadā
    '2:74:7', // fa-hiya
  ],
  ayn: [
    '80:1:1', // ʿabasa
    '96:2:4', // ʿalaqin
    '96:4:2', // ʿallama
    '98:8:5', // ʿadnin
    '88:5:3', // ʿaynin
    '102:5:4', // ʿilma
    '2:87:10', // ʿīsā
    '81:20:3', // ʿinda
    '2:18:3', // ʿumyun
    '2:178:16', // ʿufiya
  ],
  hha: [
    '1:2:1', // al-ḥamdu
    '78:15:3', // ḥabban
    '113:5:5', // ḥasada
    '111:5:3', // ḥablun
    '86:4:6', // ḥāfiẓun
    '89:5:6', // ḥijrin
    '2:36:19', // ḥīnin
    '78:27:5', // ḥisāban
    '2:83:18', // ḥusnan
    '81:5:3', // ḥushirat
  ],
  ghayn: [
    '2:249:53', // ghalabat
    '113:3:3', // ghāsiqin
    '82:6:4', // gharraka
    '2:90:24', // ghaḍabin
    '79:1:2', // gharqan
    '2:263:10', // ghaniyyun
    '80:30:2', // ghulban
    '2:88:3', // ghulfun
    '2:285:24', // ghufrānaka
    '2:7:9', // ghishāwatun
  ],
  kha: [
    '87:2:2', // khalaqa
    '87:17:2', // khayrun
    '79:40:3', // khāfa
    '91:10:2', // khāba
    '106:4:7', // khawfin
    '103:2:4', // khusrin
    '86:5:4', // khuliqa
    '2:254:16', // khullatun
    '2:85:35', // khizyun
    '78:37:10', // khiṭāban
  ],
  qaf: [
    '83:13:5', // qāla
    '80:17:1', // qutila
    '81:20:2', // quwwatin
    '87:3:2', // qaddara
    '2:11:2', // qīla
    '2:263:1', // qawlun
    '79:8:1', // qulūbun
    '97:1:5', // al-qadri
    '106:1:2', // qurayshin
    '2:177:6', // qibala
  ],
  kaf: [
    '78:4:1', // kallā
    '78:17:4', // kāna
    '88:17:5', // kayfa
    '92:16:2', // kadhdhaba
    '98:3:2', // kutubun
    '83:9:1', // kitābun
    '111:2:6', // kasaba
    '81:1:3', // kuwwirat
    '112:4:4', // kufuwan
    '82:11:1', // kirāman
  ],
  jim: [
    '110:1:2', // jāʾa
    '85:11:7', // jannātun
    '2:22:2', // jaʿala
    '104:2:2', // jamaʿa
    '2:260:28', // jabalin
    '78:21:2', // jahannama
    '78:26:1', // jazāʾan
    '2:197:13', // jidāla
    '2:158:13', // junāḥa
    '78:20:2', // al-jibālu
  ],
  shin: [
    '87:7:3', // shāʾa
    '80:26:4', // shaqqan
    '2:223:7', // shiʾtum
    '97:3:6', // shahrin
    '2:133:3', // shuhadāʾa
    '98:6:15', // sharru
    '85:7:6', // shuhūdun
    '2:137:14', // shiqāqin
    '81:1:2', // ash-shamsu
    '106:2:3', // ash-shitāʾi
  ],
  ya: [
    '1:4:2', // yawmi
    '112:3:2', // yalid
    '112:3:4', // yūlad
    '112:4:2', // yakun
    '107:2:3', // yaduʿʿu
    '2:190:12', // yuḥibbu
    '78:38:2', // yaqūmu
    '89:24:1', // yaqūlu
    '87:13:3', // yamūtu
    '96:5:5', // yaʿlam
  ],
  dad: [
    '2:282:42', // ḍaʿīfan
    '93:7:2', // ḍāllan
    '100:1:2', // ḍabḥan
    '2:273:9', // ḍarban
    '79:29:4', // ḍuḥāhā
    '80:39:1', // ḍāḥikatun
    '2:231:13', // ḍirāran
    '2:265:18', // ḍiʿfayni
    '1:7:9', // aḍ-ḍāllīna
    '93:1:1', // wa-ḍ-ḍuḥā
  ],
  tta: [
    '79:17:5', // ṭaghā
    '84:19:2', // ṭabaqan
    '88:6:3', // ṭaʿāmun
    '95:2:1', // wa-ṭūri
    '105:3:3', // ṭayran
    '91:6:3', // ṭaḥāhā
    '2:15:6', // ṭughyānihim
    '79:16:6', // ṭuwan
    '2:227:3', // aṭ-ṭalāqa
    '86:2:4', // aṭ-ṭāriqu
  ],
  dal: [
    '89:21:5', // dakkan
    '1:4:3', // ad-dīni
    '109:6:2', // dīnukum
    '2:251:15', // dafʿu
    '2:171:11', // duʿāʾan
    '2:186:11', // daʿāni
    '79:30:4', // daḥāhā
    '2:94:5', // ad-dāru
    '2:173:5', // wa-d-dama
    '79:38:3', // ad-dunyā
  ],
  ta: [
    '79:12:2', // tilka
    '2:69:17', // tasurru
    '79:6:2', // tarjufu
    '83:24:1', // taʿrifu
    '88:4:1', // taṣlā
    '88:11:2', // tasmaʿu
    '97:4:1', // tanazzalu
    '86:9:2', // tublā
    '88:5:1', // tusqā
    '78:40:15', // turāban
  ],
  tha: [
    '102:4:1', // thumma
    '83:36:2', // thuwwiba
    '2:174:11', // thamanan
    '2:228:4', // thalāthata
    '91:11:2', // thamūdu
    '84:11:3', // thubūran
    '89:26:3', // wathāqahu
    '2:155:10', // wa-th-thamarāti
    '86:3:2', // ath-thāqibu
    '85:18:2', // wa-thamūda
  ],
  dha: [
    '2:2:1', // dhālika
    '2:17:10', // dhahaba
    '81:27:4', // dhikrun
    '80:12:3', // dhakarahu
    '85:1:2', // dhāti
    '99:7:4', // dharratin
    '2:266:22', // dhurriyyatun
    '87:9:1', // fa-dhakkir
    '81:20:1', // dhī
    '92:3:3', // adh-dhakara
  ],
  zza: [
    '84:14:2', // ẓanna
    '2:210:8', // ẓulalin
    '2:231:19', // ẓalama
    '2:17:15', // ẓulumātin
    '94:3:3', // ẓahraka
    '84:10:6', // ẓahrihi
    '2:54:7', // ẓalamtum
    '2:101:19', // ẓuhūrihim
    '2:57:1', // wa-ẓallalnā
    '2:124:19', // aẓ-ẓālimīna
  ],
  lam: [
    '102:5:2', // law
    '112:3:1', // lam
    '2:120:25', // laka
    '100:8:2', // li-ḥubbi
    '111:1:4', // lahabin
    '1:2:2', // lillāhi
    '2:187:12', // libāsun
    '2:187:3', // laylata
    '85:22:2', // lawḥin
    '90:4:1', // laqad
  ],
  nun: [
    '101:11:1', // nārun
    '110:1:3', // naṣru
    '2:123:5', // nafsun
    '1:5:2', // naʿbudu
    '2:211:11', // niʿmata
    '81:10:3', // nushirat
    '82:13:4', // naʿīmin
    '94:1:2', // nashraḥ
    '91:13:5', // nāqata
    '2:30:19', // nusabbiḥu
  ],
  fa: [
    '90:13:1', // fakku
    '105:1:4', // faʿala
    '2:243:21', // faḍlin
    '2:100:5', // farīqun
    '2:102:32', // fitnatun
    '2:184:17', // fidyatun
    '2:197:11', // fusūqa
    '2:22:5', // firāshan
    '94:7:2', // faraghta
    '82:3:3', // fujjirat
  ],
  ba: [
    '2:116:6', // bal
    '113:1:3', // bi-rabbi
    '2:102:40', // bayna
    '2:247:7', // baʿatha
    '2:68:17', // bikrun
    '85:12:2', // baṭsha
    '2:110:17', // baṣīrun
    '2:67:10', // baqaratan
    '78:24:4', // bardan
    '100:9:4', // buʿthira
  ],
  mim: [
    '1:4:1', // māliki
    '114:2:1', // maliki
    '2:102:6', // mulki
    '2:153:9', // maʿa
    '2:22:11', // māʾan
    '104:2:3', // mālan
    '2:61:32', // miṣran
    '2:135:9', // millata
    '84:3:3', // muddat
    '2:253:17', // maryama
  ],
  waw: [
    '2:109:1', // wadda
    '104:1:1', // waylun
    '2:115:7', // wajhu
    '2:255:41', // wasiʿa
    '90:3:3', // walada
    '2:101:18', // warāʾa
    '2:116:4', // waladan
    '80:38:1', // wujūhun
    '2:233:24', // wālidatun
    '84:17:3', // wasaqa
  ],
  ra: [
    '1:2:3', // rabbi (heavy)
    '1:1:3', // ar-raḥmāni (heavy)
    '98:2:1', // rasūlun (heavy)
    '88:18:4', // rufiʿat (heavy)
    '78:38:3', // ar-rūḥu (heavy)
    '90:13:2', // raqabatin (heavy)
    '2:185:2', // ramaḍāna (heavy)
    '2:22:16', // rizqan (light)
    '2:59:13', // rijzan (light)
    '2:164:35', // ar-riyāḥi (light)
    '2:177:31', // ar-riqābi (light)
    '89:16:7', // rizqahu (light)
    '106:2:2', // riḥlata (light)
    '2:239:3', // fa-rijālan (light)
  ],
};

/**
 * Pairs to compare. Exact pairs (the same letters but the one) are rare in these sūras, so
 * most are near pairs; the build says which is which.
 */
export const LAB_PAIR_PICKS: readonly {
  letters: readonly [LabLetter, LabLetter];
  keys: readonly [string, string];
}[] = [
  { letters: ['sin', 'sad'], keys: ['2:216:7', '79:21:2'] }, // wa-ʿasā / wa-ʿaṣā
  { letters: ['sin', 'sad'], keys: ['2:185:35', '103:1:1'] }, // al-ʿusr / wa-l-ʿaṣr
  { letters: ['sin', 'sad'], keys: ['79:3:2', '100:3:2'] }, // sabḥan / ṣubḥan
  { letters: ['sin', 'zay'], keys: ['78:20:4', '88:16:1'] }, // sarāban / wa-zarābiyyu
  { letters: ['sin', 'zay'], keys: ['2:273:20', '2:217:30'] }, // yasʾalūna / yazālūna
  { letters: ['sin', 'zay'], keys: ['2:205:10', '2:176:4'] }, // wa-n-nasla / nazzala
  { letters: ['ayn', 'hamza'], keys: ['2:29:19', '2:10:9'] }, // ʿalīmun / alīmun
  { letters: ['ayn', 'hamza'], keys: ['2:74:36', '80:5:1'] }, // ʿammā / ammā
  { letters: ['ayn', 'hamza'], keys: ['102:7:3', '2:148:7'] }, // ʿayna / ayna
  { letters: ['hha', 'ha'], keys: ['2:187:1', '2:173:9'] }, // uḥilla / uhilla
  { letters: ['kha', 'ghayn'], keys: ['2:197:24', '2:59:5'] }, // khayra / ghayra
  { letters: ['kha', 'ghayn'], keys: ['80:9:2', '92:1:3'] }, // yakhshā / yaghshā
  { letters: ['qaf', 'kaf'], keys: ['100:2:2', '84:6:7'] }, // qadḥan / kadḥan
  { letters: ['qaf', 'kaf'], keys: ['83:13:5', '78:17:4'] }, // qāla / kāna
  { letters: ['jim', 'shin'], keys: ['110:1:2', '2:20:15'] }, // jāʾa / shāʾa
  { letters: ['jim', 'ya'], keys: ['81:6:3', '81:3:3'] }, // sujjirat / suyyirat
  { letters: ['dad', 'dal'], keys: ['2:259:30', '2:164:27'] }, // baʿḍa / baʿda
  { letters: ['tta', 'dal'], keys: ['91:6:3', '79:30:4'] }, // ṭaḥāhā / daḥāhā
  { letters: ['tta', 'ta'], keys: ['91:6:3', '91:2:3'] }, // ṭaḥāhā / talāhā
  { letters: ['ta', 'dal'], keys: ['2:111:14', '2:62:5'] }, // hātū / hādū
  { letters: ['tha', 'dha'], keys: ['89:26:3', '89:25:4'] }, // wathāqahu / ʿadhābahu
  { letters: ['dha', 'zza'], keys: ['94:4:3', '94:3:3'] }, // dhikraka / ẓahraka
  { letters: ['tha', 'zza'], keys: ['2:276:11', '83:5:2'] }, // athīmin / ʿaẓīmin
  { letters: ['lam', 'nun'], keys: ['2:9:7', '2:14:12'] }, // illā / innā
  { letters: ['lam', 'nun'], keys: ['2:12:1', '2:258:21'] }, // alā / anā
  { letters: ['fa', 'tha'], keys: ['2:264:10', '89:26:2'] }, // yunfiqu / yūthiqu
  { letters: ['ba', 'mim'], keys: ['2:81:1', '2:214:23'] }, // balā / matā
  { letters: ['ba', 'waw'], keys: ['2:126:7', '2:116:4'] }, // baladan / waladan
  { letters: ['mim', 'waw'], keys: ['2:6:8', '2:96:11'] }, // lam / law
  { letters: ['mim', 'waw'], keys: ['2:6:7', '2:19:1'] }, // am / aw
];

/** One word of the lab, in both scripts, with the letter to mark as UTF-16 offsets. */
export interface LabWord {
  key: string;
  letter: LabLetter;
  weight?: Weight;
  uthmani: string;
  indopak: string;
  focus: { uthmani: [number, number]; indopak: [number, number] };
  /** Where the word sounds in its āya's file, measured (labClips.ts), in milliseconds. */
  clip: [number, number];
}

export interface LabPair {
  letters: readonly [LabLetter, LabLetter];
  /** The same letters and harakāt but the one letter that differs (else a near pair). */
  exact: boolean;
  words: readonly [LabWord, LabWord];
}

export interface LabData {
  words: LabWord[];
  pairs: LabPair[];
}

/** al-Ḥuṣarī's teaching recitation timings as shipped: segments per `sura:aya`. */
export interface ShippedTimings {
  ayat: Record<string, readonly (readonly number[])[]>;
}

/** Letters and harakāt only: what makes two words sound the same (not the madd sign). */
const HARAKA = /[\u064B-\u0652]/;
const sounds = (text: string) =>
  [...text].filter((c) => !MARK.test(c) || HARAKA.test(c)).join('');

/** Where the first of `letters` (one letter, or hamza's forms) stands in `text`, with its marks. */
function focusOf(text: string, letters: string, key: string): [number, number] {
  let start = 0;
  while (start < text.length && !letters.includes(text[start]!)) start++;
  if (start === text.length) start = -1;
  if (start < 0) throw new Error(`${key}: ${text} has no ${letters}`);
  let end = start + 1;
  while (end < text.length && MARK.test(text[end]!)) end++;
  return [start, end];
}

/** The vowel on the letter at `start` (after a shadda), if any. */
function vowelAt(text: string, start: number): string | undefined {
  let i = start + 1;
  if (text[i] === SHADDA) i++;
  return [FATHA, DAMMA, KASRA].includes(text[i] ?? '') ? text[i] : undefined;
}

/**
 * The pause signs IndoPak writes into a word (ط ز ج لا قف …, and the disputed āya end). A
 * word heard on its own is not a place to stop, and a small high zain over a sīn word would
 * read as the very letter the learner listens for, so the lab leaves them out.
 */
export const PAUSE_SIGNS =
  /(?:[\u0615\u0617\u06D6-\u06DB\u08D5\u08D7\u08DD-\u08DF\u08E2]|\u034F)+$/u;

function wordIn(packs: readonly Pack[], key: string): string {
  const [sura, aya, n] = key.split(':').map(Number);
  const word = packs
    .find((p) => p.suras.some((s) => s.sura === sura))
    ?.suras.find((s) => s.sura === sura)
    ?.ayat.find((a) => a.aya === aya)?.words[n! - 1];
  if (!word) throw new Error(`${key}: no such word in the packs`);
  return word.t;
}

/** Tanwīn (ً ٌ ٍ) and the throat letters, before which a nūn is said plainly (iẓhār). */
const TANWIN = /[\u064B-\u064D]/;
const THROAT = 'ءأإؤئهعحغخ';
/** The small signs after a word's last letter (a tanwīn's mīm, pause signs). */
const TRAILING = /[\u06D6-\u06ED]+$/u;

/**
 * Whether the reciter carries a nūn sākin or tanwīn from the word before into this one: hidden
 * in its first letter (ikhfāʾ) or merged into it (idghām). Then the word is not heard on its
 * own; its clip starts in the ghunna. Not before a throat letter (iẓhār), not at the start of
 * an āya, not before a hamzat al-waṣl (the reciter adds a vowel to the nūn). A mīm sākin does
 * the same before bāʾ and mīm (ikhfāʾ and idghām shafawī).
 */
export function nasalBefore(packs: readonly Pack[], key: string): boolean {
  const [sura, aya, n] = key.split(':').map(Number);
  if (n === 1) return false;
  const first = wordIn(packs, key)[0]!;
  if (first === 'ٱ' || THROAT.includes(first)) return false;
  const before = wordIn(packs, `${sura}:${aya}:${n! - 1}`).replace(TRAILING, '');
  // A fatḥatān sits before the alif (or yāʾ) that carries it: سَبْعًا, هُدًى.
  const end = 'اى'.includes(before.at(-1)!) ? before.slice(0, -1) : before;
  const last = end.at(-1)!;
  const sakin = (letter: string) =>
    last === letter || (last === '\u0652' && end.at(-2) === letter);
  return TANWIN.test(last) || sakin('ن') || ('بم'.includes(first) && sakin('م'));
}

function timed(timings: ShippedTimings, key: string): boolean {
  const [sura, aya, n] = key.split(':').map(Number);
  return (timings.ayat[`${sura}:${aya}`] ?? []).some(
    ([from, to]) => from === n! - 1 && to === n
  );
}

/** Every word the lab plays: the letters' words and both words of each pair. */
export const LAB_KEYS: readonly string[] = [
  ...new Set([
    ...Object.values(LAB_PICKS).flat(),
    ...LAB_PAIR_PICKS.flatMap((p) => p.keys),
  ]),
];

/** The āya's segments and whether `sura:aya:n` is its last word. */
export function timedWord(
  timings: ShippedTimings,
  key: string
): { start: number; end: number; last: boolean } | null {
  const [sura, aya, n] = key.split(':').map(Number);
  const segments = timings.ayat[`${sura}:${aya}`] ?? [];
  const own = segments.find(([from, to]) => from === n! - 1 && to === n);
  if (!own) return null;
  return {
    start: own[2]!,
    end: own[3]!,
    last: !segments.some(([from]) => from! >= n!),
  };
}

function labWord(
  key: string,
  letter: LabLetter,
  packs: { uthmani: readonly Pack[]; indopak: readonly Pack[] },
  timings: ShippedTimings,
  clips: LabClips,
  strict: boolean
): LabWord {
  if (!timed(timings, key)) throw new Error(`${key}: not timed as a word of its own`);
  const clip = clips.clips[key];
  if (!clip)
    throw new Error(`${key}: not measured; run npm run lab-clips -w @arda/tools`);
  if (nasalBefore(packs.uthmani, key)) {
    throw new Error(
      `${key}: follows a nūn sākin, tanwīn or mīm sākin, so it starts in the ghunna`
    );
  }
  const uthmani = wordIn(packs.uthmani, key);
  const indopak = wordIn(packs.indopak, key).replace(PAUSE_SIGNS, '');
  const sign = LETTER[letter];
  const focus = {
    uthmani: focusOf(uthmani, sign, key),
    indopak: focusOf(indopak, INDOPAK_LETTER[letter] ?? sign, key),
  };
  const word: LabWord = { key: `hafs:${key}`, letter, uthmani, indopak, focus, clip };
  if (letter === 'ra') {
    if ([...uthmani].filter((c) => c === sign).length !== 1) {
      throw new Error(`${key}: ${uthmani} should have one rāʾ`);
    }
    const vowel = vowelAt(uthmani, focus.uthmani[0]);
    if (!vowel) throw new Error(`${key}: the rāʾ of ${uthmani} has no vowel`);
    word.weight = vowel === KASRA ? 'light' : 'heavy';
    return word;
  }
  // Kinds of letter, not occurrences (zulzilat has zāy twice); hamza's forms are one letter,
  // and so are the two forms of yāʾ and of tāʾ.
  const rivals = new Set(
    [...uthmani]
      .filter((c) => RIVALS[letter].includes(c))
      .map((c) => (LETTER.hamza.includes(c) ? 'ء' : (SAME[c] ?? c)))
  );
  if (rivals.size !== 1) {
    throw new Error(`${key}: ${uthmani} holds more than one of ${RIVALS[letter]}`);
  }
  if (strict && !vowelAt(uthmani, focus.uthmani[0])) {
    throw new Error(`${key}: the ${sign} of ${uthmani} has no vowel`);
  }
  return word;
}

/** The lab's words and pairs from the shipped packs and timings, checked. */
export function buildLab(
  packs: { uthmani: readonly Pack[]; indopak: readonly Pack[] },
  timings: ShippedTimings,
  clips: LabClips
): LabData {
  const words = (Object.keys(LAB_PICKS) as LabLetter[]).flatMap((letter) =>
    LAB_PICKS[letter].map((key) => labWord(key, letter, packs, timings, clips, true))
  );
  const pairs = LAB_PAIR_PICKS.map(({ letters, keys }): LabPair => {
    const a = labWord(keys[0], letters[0], packs, timings, clips, false);
    const b = labWord(keys[1], letters[1], packs, timings, clips, false);
    // The one letter of each word swapped for the other's (hamza by the seat it has there).
    const one = a.uthmani[a.focus.uthmani[0]]!;
    const other = b.uthmani[b.focus.uthmani[0]]!;
    const swapped = sounds(a.uthmani).replaceAll(one, other);
    return { letters, exact: swapped === sounds(b.uthmani), words: [a, b] };
  });
  return { words, pairs };
}

/**
 * `apps/web/src/modules/lab/words.ts`. One word per line as JSON; the file is generated, so
 * Prettier leaves it alone (.prettierignore).
 */
export function labModule(data: LabData): string {
  const line = (value: unknown) => `  ${JSON.stringify(value)},`;
  return `/**
 * The letter lab's words (spec F5): real words from the shipped packs, each timed as a word of
 * its own in al-Ḥuṣarī's teaching recitation, with where it really sounds (tools/lab-clips.json).
 * Generated by \`npm run lab -w @arda/tools\` from the picks in tools/src/lab.ts; do not edit.
 */
import type { LabPair, LabWord } from './types';

export const LAB_WORDS: readonly LabWord[] = [
${data.words.map(line).join('\n')}
];

export const LAB_PAIRS: readonly LabPair[] = [
${data.pairs.map(line).join('\n')}
];
`;
}
