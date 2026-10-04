/**
 * The packs the app ships (ADR-0010). A pack whose content changes gets a new version, so a
 * copy kept on a device is never mistaken for the new one.
 */
export const PACKS: readonly {
  id: string;
  version: number;
  title: string;
  fromSura: number;
  toSura: number;
}[] = [
  {
    id: 'uthmani-hafs-fatiha-baqara',
    version: 1,
    title:
      'al-Fātiḥa and al-Baqara, ʿUthmānī script (Tanzil), riwāyat Ḥafṣ, with tajwīd rules (cpfair)',
    fromSura: 1,
    toSura: 2,
  },
  {
    id: 'uthmani-hafs-juz30',
    version: 2,
    title:
      'Juzʾ ʿAmma, ʿUthmānī script (Tanzil), riwāyat Ḥafṣ, with tajwīd rules (cpfair)',
    fromSura: 78,
    toSura: 114,
  },
];
