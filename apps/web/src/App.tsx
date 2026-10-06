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
import { Lab } from '@/modules/lab/Lab';
import { LabQuizPage } from '@/modules/lab/LabQuiz';
import { LetterPage } from '@/modules/lab/LetterPage';
import { Mushaf } from '@/modules/mushaf/Mushaf';
import { MushafPage } from '@/modules/mushaf/MushafPage';
import { SuraView } from '@/modules/mushaf/SuraView';
import { Path } from '@/modules/path/Path';
import { OutboxSender } from '@/modules/recite/OutboxSender';
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
  { path: '/labor/:letter/quiz', element: <LabQuizPage /> },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Today /> },
      { path: '/anmelden', element: <SignIn /> },
      { path: '/konto', element: <Account /> },
      { path: '/pfad', element: <Path /> },
      { path: '/mushaf', element: <Mushaf /> },
      { path: '/mushaf/seite/:page', element: <MushafPage /> },
      { path: '/mushaf/:sura', element: <SuraView /> },
      { path: '/labor', element: <Lab /> },
      { path: '/labor/:letter', element: <LetterPage /> },
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
          <OutboxSender />
          <RouterProvider router={router} />
        </ReviewProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
