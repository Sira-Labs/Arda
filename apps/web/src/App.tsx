import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { I18nProvider } from '@/i18n/I18nProvider';
import { Account } from '@/modules/account/Account';
import { SignIn } from '@/modules/account/SignIn';
import { Path } from '@/modules/path/Path';
import { RuleCardPage } from '@/modules/path/RuleCard';
import { Sheikh } from '@/modules/sheikh/Sheikh';
import { Soon } from '@/modules/Soon';
import { Today } from '@/modules/today/Today';
import { SessionProvider } from '@/state/session';

const router = createBrowserRouter([
  // Learning screens bring their own shell: no navigation bar, a close button and progress.
  { path: '/pfad/2/:rule', element: <RuleCardPage /> },
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
      { path: '*', element: <Soon page="notFound" /> },
    ],
  },
]);

export function App() {
  return (
    <SessionProvider>
      <I18nProvider>
        <RouterProvider router={router} />
      </I18nProvider>
    </SessionProvider>
  );
}
