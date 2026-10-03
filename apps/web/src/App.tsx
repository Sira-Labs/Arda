import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { Account } from '@/modules/account/Account';
import { SignIn } from '@/modules/account/SignIn';
import { Soon } from '@/modules/Soon';
import { Today } from '@/modules/today/Today';
import { SessionProvider } from '@/state/session';

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Today /> },
      { path: '/anmelden', element: <SignIn /> },
      { path: '/konto', element: <Account /> },
      {
        path: '/pfad',
        element: (
          <Soon title="Der Pfad">
            Acht Einheiten vom Buchstaben bis zur Riwāya. Einheit 2 (Nūn sākina und
            Tanwīn) entsteht zuerst, aus dem Blatt deines Sheikhs.
          </Soon>
        ),
      },
      {
        path: '/mushaf',
        element: (
          <Soon title="Der Muṣḥaf">
            Der IndoPak-Muṣḥaf mit Tajwīd-Farben: tippe auf einen Buchstaben, hör den
            Rezitator Wort für Wort, langsam und in Schleife.
          </Soon>
        ),
      },
      {
        path: '/labor',
        element: (
          <Soon title="Das Buchstaben-Labor">
            Woher der Laut kommt: die Makhārij, gezeichnet und animiert, von deinem Sheikh
            geprüft.
          </Soon>
        ),
      },
      {
        path: '/sheikh',
        element: (
          <Soon title="Mein Sheikh">
            Deine Ḥalaqa, seine Aufgaben auf der Seite, deine Rezitationen in seiner
            Hörliste und das ʿArḍ-Buch.
          </Soon>
        ),
      },
      {
        path: '*',
        element: <Soon title="Nicht gefunden">Diese Seite gibt es nicht.</Soon>,
      },
    ],
  },
]);

export function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  );
}
