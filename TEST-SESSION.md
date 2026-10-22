# D&D Map NPC — online test session

This is an isolated first online test room, separate from the existing campaign page. It does not change the production app or the existing character cards.

## What the MVP tests

- Master creates a room and shares a short room code.
- Players join from other devices using that code.
- Encounter name, round number and group note synchronize in real time.
- Each player can move their own token; the master can move any token and adjust HP/AC.
- Role checks are enforced by database policies and server-side RPC functions.

## One-time setup

1. Create a **separate test project** at [Supabase](https://supabase.com/). Do not use a production project for this test.
2. In Supabase **SQL Editor**, run all of `supabase/test-session.sql`.
3. In **Authentication → Providers / Sign In**, enable **Anonymous Sign-Ins**.
4. Open the test page: `https://vengency0511-maker.github.io/dndmapnpc/test-session.html`.
5. Enter the project's Project URL and its public publishable key (or legacy anon key) and press **Подключиться**. Repeat on every device. The values are saved only in that browser.
6. On one device create a room. On another device connect to the same Supabase project, enter the room code and join as a player.
7. Change the scene/round or HP/AC on the master device and move the player's token on the player device. Changes should appear on the other screen shortly.

## Security notes

- Never enter a Supabase `service_role` or secret key in the page. The page only needs the public publishable/anon key.
- Room membership is established by RPC functions. RLS restricts room reads to members and room-state updates to the master.
- Players can move only their own tokens; HP/AC changes are only accepted from the room master.
- This is an early test build. Anonymous identity is browser-session based, so clearing site data or changing browsers creates a new identity. The short room code is intended for a private test group, not public production access.

## Troubleshooting

- **Anonymous sign-in error:** make sure Anonymous Sign-Ins are enabled in Supabase Authentication.
- **Table / function not found:** rerun `supabase/test-session.sql` in the correct project.
- **No live updates:** confirm Realtime is enabled and that the three test tables are in the `supabase_realtime` publication.
- **Permission denied:** reconnect after running the SQL, and make sure you use the same project URL/key on every device.
