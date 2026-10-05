import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { RuleLegend } from '@/components/RuleLegend';
import { TajweedText } from '@/components/TajweedText';
import { errorMessage, useI18n } from '@/i18n/I18nProvider';
import { LanguagePicker } from '@/i18n/LanguagePicker';
import { cardName } from '@/content/unit2';
import { StudentAssignmentItem } from '@/modules/assignments/StudentAssignmentItem';
import { useOpenAssignments } from '@/modules/assignments/useOpenAssignments';
import { useHalaqat } from '@/modules/halaqa/useHalaqat';
import { segmentsOf } from '@/tajweed/segments';
import { useSession } from '@/state/session';

/**
 * Iqlāb from its rule card (spec F2): nūn before bāʾ becomes mīm, with ghunna. IndoPak and
 * Madīna spelling write the small high mīm (U+06E2) on the nūn; the engine colours it.
 */
const IQLAB = segmentsOf('مِنۢ بَعْدِ', new Set(['iqlab']));

/** How many open assignments Today lists before pointing to the rest. */
const SHOWN = 3;

/**
 * Today: what your sheikh asked for comes first (spec T2, ADR-0014), soonest due on top, then
 * the next step on the path (a placeholder until the path, spec F1, exists).
 */
export function Today() {
  const { me, offline } = useSession();
  const { m, language } = useI18n();
  const { halaqat } = useHalaqat();
  const open = useOpenAssignments();
  const tasks = open.assignments ?? [];
  // What "from my sheikh" says: sign in, join, wait for approval, or (soon) the assignments.
  const sheikh = !me
    ? { title: m.today.connect, hint: m.today.connectHint, link: null }
    : halaqat?.length === 0
      ? me.role === 'student'
        ? { title: m.today.connect, hint: m.halaqa.none, link: '/sheikh' }
        : { title: m.halaqa.create.title, hint: m.halaqa.noneTeacher, link: '/sheikh' }
      : halaqat && halaqat.every((h) => h.status === 'pending')
        ? { title: m.today.noTasks, hint: m.halaqa.join.pending, link: null }
        : { title: m.today.noTasks, hint: m.today.noTasksHint, link: null };

  return (
    <div className="stack" style={{ gap: 24 }}>
      <header className="row" style={{ justifyContent: 'space-between' }}>
        <div className="stack" style={{ gap: 4 }}>
          <p className="eyebrow">{m.today.eyebrow}</p>
          <h1>{m.today.greeting(me?.name ?? null)}</h1>
        </div>
        <div
          className="row"
          style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}
        >
          {/* The language at hand on the first screen, not only in the account (owner, 2026-10-05). */}
          <LanguagePicker compact />
          <Link className="btn" to={me ? '/konto' : '/anmelden'}>
            <Icon name="account" />
            {me ? m.today.account : m.today.signIn}
          </Link>
        </div>
      </header>
      {offline && (
        <p className="muted" role="status">
          {m.today.offline}
        </p>
      )}

      <section className="card card-ink stack" aria-labelledby="from-sheikh">
        <p className="eyebrow" style={{ color: 'var(--accent-fill)' }}>
          {m.today.fromSheikh}
        </p>
        {/* A failed load says so instead of claiming there is nothing to do. */}
        {tasks.length > 0 || open.failure ? (
          <>
            <h2 id="from-sheikh">{m.assignments.title}</h2>
            <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {tasks.slice(0, SHOWN).map((assignment) => (
                <StudentAssignmentItem
                  key={assignment.id}
                  assignment={assignment}
                  showFrom
                  busy={open.busy}
                  onMark={(done) => void open.mark(assignment, done)}
                />
              ))}
            </ul>
            {tasks.some((a) => a.doneAt) && (
              <p className="muted" role="status">
                {m.assignments.done}
              </p>
            )}
            {tasks.length > SHOWN && (
              <Link to="/sheikh" style={{ color: 'inherit' }}>
                {m.assignments.more(tasks.length - SHOWN)}
              </Link>
            )}
          </>
        ) : (
          <>
            <h2 id="from-sheikh">{sheikh.title}</h2>
            <p className="muted">{sheikh.hint}</p>
            {sheikh.link && (
              <Link
                className="btn btn-primary"
                to={sheikh.link}
                style={{ alignSelf: 'flex-start' }}
              >
                {m.halaqa.mine}
              </Link>
            )}
          </>
        )}
        {open.failure && <p role="alert">{errorMessage(m, open.failure)}</p>}
      </section>

      <section className="card stack" aria-labelledby="next-unit">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p className="eyebrow">{m.today.nextUnit}</p>
          {/* Numbers with signs stay left to right inside Arabic text. */}
          <span className="chip" dir="ltr">
            +20 XP
          </span>
        </div>
        <h2 id="next-unit">
          {cardName('iqlab', language)} – {m.cards.iqlab.title}
        </h2>
        <TajweedText segments={IQLAB} large />
        <ol className="muted" style={{ margin: 0, paddingInlineStart: 22 }}>
          {m.cards.iqlab.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <Link
          className="btn btn-primary"
          to="/pfad/2/iqlab"
          style={{ alignSelf: 'flex-start' }}
        >
          {m.today.openCard}
        </Link>
      </section>

      <RuleLegend />
    </div>
  );
}
