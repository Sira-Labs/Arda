import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { I18nProvider } from '@/i18n/I18nProvider';
import { Account } from '@/modules/account/Account';
import { SignIn } from '@/modules/account/SignIn';
import { ReviewSession } from '@/modules/games/ReviewSession';
import { SortLetters } from '@/modules/games/SortLetters';
import { WhichRule } from '@/modules/games/WhichRule';
import { Halaqa } from '@/modules/halaqa/Halaqa';
import { Join } from '@/modules/halaqa/Join';
import { Path } from '@/modules/path/Path';
import { RuleCardPage } from '@/modules/path/RuleCard';
import { Sheikh } from '@/modules/sheikh/Sheikh';
import { Soon } from '@/modules/Soon';
import { Today } from '@/modules/today/Today';
import { ReviewProvider } from '@/review/ReviewProvider';
import { SessionProvider } from '@/state/session';

const router = createBrowserRouter([
  // Learning screens bring their own shell: no navigation bar, a close button and progress.
  { path: '/pfad/2/:rule', element: <RuleCardPage /> },
  { path: '/pfad/2/spiel/welche-regel', element: <WhichRule /> },
  { path: '/pfad/2/spiel/sortieren', element: <SortLetters /> },
  { path: '/pfad/wiederholen', element: <ReviewSession /> },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Today /> },
      { path: '/anmelden', element: <SignIn /> },
      { path: '/konto', element: <Account /> },
      { path: '/pfad', element: <Path /> },
      { path: '/mushaf', element: <Soon page="mushaf" /> },
      { path: '/labor', element: <Soon page="lab" /> },
      { path: '/sheikh', element: <Sheikh /> },
      { path: '/halaqa/:id', element: <Halaqa /> },
      { path: '/beitreten', element: <Join /> },
      { path: '*', element: <Soon page="notFound" /> },
    ],
  },
]);

export function App() {
  return (
    <SessionProvider>
      <I18nProvider>
        <ReviewProvider>
          <RouterProvider router={router} />
        </ReviewProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
