# ADR-0019: iOS and Android later, with Capacitor around the same web build

- Status: proposed
- Date: 2026-10-03
- Source: Suffa ADR-0019

## Decision

When the PWA is in use, wrap the same build with Capacitor as Suffa does: bearer tokens in
Keychain/Keystore (the api already accepts signed bearer tokens from `ARDA_APP_ORIGINS`,
ADR-0004), push reminders for due assignments, Universal Links / App Links for sign-in links
(served by the api; the Caddy route is added then). Recording uses the native microphone
permission.

## Consequences

Nothing to do now beyond keeping the api's app origins and bearer mode tested.
