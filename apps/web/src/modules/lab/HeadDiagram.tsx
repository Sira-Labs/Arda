import { useId } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { AREAS, type Area, type Point } from './letters';
import './lab.css';

/**
 * Where each point sits on the drawing (viewBox 640 × 700, the face looking left). The
 * whistling letters: the tip of the tongue at the incisors, a narrow gap for the air; rāʾ:
 * the tip of the tongue against the gum ridge behind the upper incisors, a little behind the
 * point of nūn; the throat's three points down the throat; the tongue's under the palate, on
 * the drawn tongue's upper edge (qāf where it meets the soft palate, kāf just before it, the
 * middle three under the hard palate, ḍād on the edge where the molars stand, ṭāʾ, dāl and
 * tāʾ with the tip at the roots of the upper incisors, in front of rāʾ).
 */
const POINTS: Record<Point, { x: number; y: number }> = {
  whistle: { x: 180, y: 406 },
  ra: { x: 194, y: 368 },
  // The throat from the mouth down: its upper part (غ خ), its middle (ع ح), its deepest (ء ه).
  halqNear: { x: 429, y: 430 },
  halqMid: { x: 430, y: 515 },
  halqDeep: { x: 432, y: 610 },
  tongueFar: { x: 385, y: 429 },
  tongueBack: { x: 362, y: 413 },
  tongueMid: { x: 272, y: 400 },
  tongueSide: { x: 227, y: 404 },
  tongueTip: { x: 186, y: 378 },
};

/** Where each area's number stands on the drawing; the lips' stands just in front of them. */
const AREA_MARKS: Record<Area, { x: number; y: number }> = {
  jawf: { x: 300, y: 378 },
  halq: { x: 431, y: 600 },
  lisan: { x: 330, y: 452 },
  shafatan: { x: 98, y: 410 },
  khayshum: { x: 280, y: 306 },
};

/** The tag naming the point, below the chin where the drawing is empty. */
const TAG = { x: 14, y: 584, width: 256, height: 84 };

/** The number of an area in the reader's digits (Arabic-Indic in Arabic). */
export function areaNumber(area: Area, language: string): string {
  return (AREAS.indexOf(area) + 1).toLocaleString(language === 'ar' ? 'ar-EG' : 'de-DE');
}

/**
 * The makhārij head (spec F5, design screen 3): a side view with the five areas in their
 * colours, each numbered as in the legend below it (colour is never alone), and, for a
 * letter, its point pulsing with a label. Our own drawing, CC BY 4.0, a draft until the
 * sheikh has checked it (ADR-0018).
 */
export function HeadDiagram({ point }: { point?: Point }) {
  const { m, language } = useI18n();
  // The face never mirrors, but an Arabic label reads right to left.
  const arabic = language === 'ar' ? ({ lang: 'ar', dir: 'rtl' } as const) : {};
  const id = useId();
  const t = m.lab.diagram;
  const at = point ? POINTS[point] : undefined;
  const label = point ? m.lab.points[point] : undefined;
  return (
    <figure className="lab-head stack" style={{ gap: 12 }}>
      <svg
        className="lab-head-svg"
        viewBox="0 0 640 700"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
      >
        <title id={`${id}-title`}>{t.title}</title>
        <desc id={`${id}-desc`}>
          {label
            ? `${t.description} ${[label.line1, label.line2].filter(Boolean).join(' – ')}.`
            : t.description}
        </desc>
        {/* Head outline */}
        <path
          className="lab-outline"
          d="M520 40 C380 0 230 20 190 130 C175 175 180 215 175 245 L105 335 C100 348 110 358 135 356 L160 360 C152 372 138 380 136 392 C146 398 146 402 138 408 C146 418 150 430 156 440 C162 456 150 476 158 500 C170 530 220 536 280 530 C290 580 292 640 292 700 L500 700 C500 600 530 500 570 400 C610 280 620 120 520 40 Z"
        />
        {/* Nasal cavity: khayshūm */}
        <path
          className="lab-area"
          data-area="khayshum"
          d="M190 300 C240 282 320 282 380 300 L382 330 C320 318 250 318 175 330 Z"
        />
        {/* Mouth space: jawf */}
        <path
          className="lab-area"
          data-area="jawf"
          d="M170 380 C230 360 320 355 380 362 C405 370 420 390 425 420 L425 470 C410 430 380 405 330 400 C270 395 210 405 172 412 Z"
        />
        {/* Tongue: lisān */}
        <path
          className="lab-area"
          data-area="lisan"
          d="M172 414 C215 402 290 395 340 405 C395 418 412 460 410 520 L405 560 C360 540 300 500 240 470 C205 455 180 440 172 430 Z"
        />
        {/* Throat: ḥalq */}
        <path
          className="lab-area"
          data-area="halq"
          d="M412 400 L448 400 C452 500 452 600 455 700 L410 700 C408 620 408 580 410 520 Z"
        />
        {/* Palate */}
        <path
          className="lab-line"
          d="M168 372 C220 352 320 345 382 355 C405 362 418 378 420 398"
        />
        {/* Lips: shafatān */}
        <ellipse
          className="lab-area"
          data-area="shafatan"
          cx="141"
          cy="393"
          rx="14"
          ry="9"
        />
        <ellipse
          className="lab-area"
          data-area="shafatan"
          cx="148"
          cy="425"
          rx="14"
          ry="10"
        />
        {/* Upper and lower front teeth */}
        <rect className="lab-tooth" x="160" y="366" width="14" height="16" rx="3" />
        <rect className="lab-tooth" x="164" y="412" width="14" height="14" rx="3" />
        {/* Ear and eye */}
        <ellipse className="lab-line lab-thin" cx="455" cy="300" rx="26" ry="44" />
        <path className="lab-line lab-round" d="M215 205 C230 195 250 195 262 205" />

        {AREAS.map((area) => (
          <g key={area} className="lab-area-mark" aria-hidden="true">
            <circle cx={AREA_MARKS[area].x} cy={AREA_MARKS[area].y} r="17" />
            <text x={AREA_MARKS[area].x} y={AREA_MARKS[area].y} dy="0.36em">
              {areaNumber(area, language)}
            </text>
          </g>
        ))}

        {at && label && (
          <g className="lab-point" data-point={point}>
            <line
              className="lab-leader"
              x1={at.x}
              y1={at.y}
              x2={TAG.x + TAG.width / 2}
              y2={TAG.y}
            />
            <circle className="lab-pulse" cx={at.x} cy={at.y} r="12" />
            <circle className="lab-dot" cx={at.x} cy={at.y} r="9" />
            <rect className="lab-tag" {...TAG} rx="16" />
            <text
              className="lab-tag-text"
              x={TAG.x + TAG.width / 2}
              y={TAG.y + 34}
              {...arabic}
            >
              {label.line1}
            </text>
            <text
              className="lab-tag-text"
              x={TAG.x + TAG.width / 2}
              y={TAG.y + 66}
              {...arabic}
            >
              {label.line2}
            </text>
          </g>
        )}
      </svg>
      <figcaption className="stack" style={{ gap: 8 }}>
        <ul className="lab-legend" aria-label={t.legend}>
          {AREAS.map((area) => (
            <li key={area}>
              <span className="lab-num" aria-hidden="true">
                {areaNumber(area, language)}
              </span>
              <span className="lab-swatch" data-area={area} aria-hidden="true" />
              <span>
                <strong>{m.lab.areas[area].name}</strong> · {m.lab.areas[area].gloss}
              </span>
            </li>
          ))}
        </ul>
        <p className="muted lab-licence">{t.licence}</p>
      </figcaption>
    </figure>
  );
}
