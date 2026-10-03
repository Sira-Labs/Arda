# ADR-0001: The name ʿArḍa (العَرْضة)

- Status: proposed (waiting for the sheikh's confirmation, spec 01 §8 question 5)
- Date: 2026-10-03

## Context

Every Sira Labs project is named for a moment of the Sīra that says what the product is for
(Suffa, Arqam, Tabayyun, Sahifa, Thawr, Khandaq). This project teaches tajwīd so that a
student arrives prepared to recite to a teacher.

## Decision

- Name: **ʿArḍa** (العَرْضة), in ASCII `arda` (repository, packages `@arda/*`, apps
  `arda-*`, env prefix `ARDA_*`, domain `arda-stg.siralabs.org`).
- Meaning: each Ramaḍān Jibrīl reviewed the whole Qurʾān with the Prophet ﷺ; in his last year
  twice, _al-ʿarḍa al-akhīra_ («إِنَّ جِبْرِيلَ كَانَ يُعَارِضُنِي الْقُرْآنَ كُلَّ سَنَةٍ مَرَّةً،
  وَإِنَّهُ عَارَضَنِي الْعَامَ مَرَّتَيْنِ», Ṣaḥīḥ al-Bukhārī 3624, to be double-checked by the
  sheikh). _ʿArḍ_ is also the technical term for how the Qurʾān is still passed on: the
  student recites, the teacher corrects.
- The product promise follows from it: **everything in the app prepares that moment,
  reciting to your sheikh.** The app never gives an ijāza and never replaces the teacher.
- Display spelling with transliteration marks where fonts allow (ʿArḍa), `Arda` where they do
  not (TOTP issuer, file names).

## Alternatives

- **Muqriʾ**: Muṣʿab ibn ʿUmayr, sent to teach Madīna the Qurʾān. Strong, but a title for a
  person, not for the act.
- **Ubayy**: to whom the Prophet ﷺ recited Sūrat al-Bayyina. Personal name; less clear.

## Consequences

Renaming later touches the domain (passkeys are bound to the host, ADR-0004), the images and
the env prefix; decide before the first learners sign in.
