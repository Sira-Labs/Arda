import type { ComponentType } from 'react';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { I18nProvider } from '@/i18n/I18nProvider';
import { SignIn } from '@/modules/account/SignIn';
import { Path } from '@/modules/path/Path';
import { OutboxSender } from '@/modules/recite/OutboxSender';
import { RuleCardPage } from '@/modules/path/RuleCard';
import { ScreenError } from '@/modules/ScreenError';
import { Soon } from '@/modules/Soon';
import { Today } from '@/modules/today/Today';
import { ProgressSync } from '@/review/ProgressSync';
import { ReviewProvider } from '@/review/ReviewProvider';
import { SessionProvider } from '@/state/session';

/**
 * A screen fetched when it is first opened (spec 01 §6, first load): the app starts with
 * Today, the path, a rule card and sign-in; everything else arrives with its first visit and
 * is precached by the service worker, so it also opens offline afterwards.
 */
function screen<Name extends string>(
  load: () => Promise<Record<Name, ComponentType>>,
  name: Name
): () => Promise<{ Component: ComponentType }> {
  return async () => ({ Component: (await load())[name] });
}

/** Every screen of the app; the accessibility check walks them all. */
const screens: RouteObject[] = [
  // Learning screens bring their own shell: no navigation bar, a close button and progress.
  { path: '/pfad/:unit/:rule', element: <RuleCardPage /> },
  {
    path: '/pfad/2/spiel/welche-regel',
    lazy: screen(() => import('@/modules/games/WhichRule'), 'WhichRule'),
  },
  {
    path: '/pfad/2/spiel/sortieren',
    lazy: screen(() => import('@/modules/games/SortLetters'), 'SortLetters'),
  },
  {
    path: '/pfad/3/spiel/welche-regel',
    lazy: screen(() => import('@/modules/games/WhichRule3'), 'WhichRule3'),
  },
  {
    path: '/pfad/3/spiel/ghunna-halten',
    lazy: screen(() => import('@/modules/games/HoldGhunna'), 'HoldGhunna'),
  },
  {
    path: '/pfad/4/spiel/buchstaben',
    lazy: screen(() => import('@/modules/games/QalqalaLetters'), 'QalqalaLetters'),
  },
  {
    path: '/pfad/5/spiel/wie-lang',
    lazy: screen(() => import('@/modules/games/MaddLength'), 'MaddLength'),
  },
  {
    path: '/pfad/6/spiel/schwer-oder-leicht',
    lazy: screen(() => import('@/modules/games/HeavyOrLight'), 'HeavyOrLight'),
  },
  {
    path: '/pfad/7/spiel/anhalten',
    lazy: screen(() => import('@/modules/games/StopAndStart'), 'StopAndStart'),
  },
  {
    path: '/pfad/7/spiel/zeichen',
    lazy: screen(() => import('@/modules/games/WaqfSigns'), 'WaqfSigns'),
  },
  {
    path: '/pfad/8/spiel/was-aendert-warsh',
    lazy: screen(() => import('@/modules/games/WarshChanges'), 'WarshChanges'),
  },
  {
    path: '/pfad/8/spiel/hafs-oder-warsh',
    lazy: screen(() => import('@/modules/games/HafsOrWarsh'), 'HafsOrWarsh'),
  },
  {
    path: '/pfad/:unit/test',
    lazy: screen(() => import('@/modules/games/UnitTest'), 'UnitTest'),
  },
  {
    path: '/pfad/wiederholen',
    lazy: screen(() => import('@/modules/games/ReviewSession'), 'ReviewSession'),
  },
  {
    path: '/labor/:letter/quiz',
    lazy: screen(() => import('@/modules/lab/LabQuiz'), 'LabQuizPage'),
  },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Today /> },
      { path: '/anmelden', element: <SignIn /> },
      {
        path: '/konto',
        lazy: screen(() => import('@/modules/account/Account'), 'Account'),
      },
      { path: '/pfad', element: <Path /> },
      {
        path: '/lernplan',
        lazy: screen(() => import('@/modules/plan/StudyPlan'), 'StudyPlan'),
      },
      {
        path: '/abzeichen',
        lazy: screen(() => import('@/modules/today/Badges'), 'Badges'),
      },
      {
        path: '/mushaf',
        lazy: screen(() => import('@/modules/mushaf/Mushaf'), 'Mushaf'),
      },
      {
        path: '/mushaf/seite/:page',
        lazy: screen(() => import('@/modules/mushaf/MushafPage'), 'MushafPage'),
      },
      {
        path: '/mushaf/:sura',
        lazy: screen(() => import('@/modules/mushaf/SuraView'), 'SuraView'),
      },
      { path: '/labor', lazy: screen(() => import('@/modules/lab/Lab'), 'Lab') },
      {
        path: '/labor/:letter',
        lazy: screen(() => import('@/modules/lab/LetterPage'), 'LetterPage'),
      },
      {
        path: '/sheikh',
        lazy: screen(() => import('@/modules/sheikh/Sheikh'), 'Sheikh'),
      },
      {
        path: '/halaqa/:id',
        lazy: screen(() => import('@/modules/halaqa/Halaqa'), 'Halaqa'),
      },
      {
        path: '/verwaltung',
        lazy: screen(() => import('@/modules/admin/Admin'), 'Admin'),
      },
      { path: '/beitreten', lazy: screen(() => import('@/modules/halaqa/Join'), 'Join') },
      { path: '*', element: <Soon page="notFound" /> },
    ],
  },
];

/** The screens under one roof that says so when a screen cannot be fetched or fails. */
export const routes: RouteObject[] = [
  { errorElement: <ScreenError />, hydrateFallbackElement: <></>, children: screens },
];

const router = createBrowserRouter(routes);

export function App() {
  return (
    <SessionProvider>
      <I18nProvider>
        <ReviewProvider>
          <OutboxSender />
          <ProgressSync />
          <RouterProvider router={router} />
        </ReviewProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
