# CSCC Treasure Hunt — Bug Log

Each bug lists: what users see, why it happens, how it was fixed, and how to test it.
Status values: **Open** (found, not fixed), **Fixed** (fixed and tested).

---

## Bug 1 — "Begin the hunt" sends the player back, score stays at 0

**Status:** Fixed (tested locally: reload keeps the player at every step). Cause confirmed: the game works when served with `npx serve` instead of Live Server.

**What users see:** The player enters a nickname and clicks BEGIN THE HUNT.
The nickname appears in the organizer dashboard, but the page goes back to the start
and the player stays at 0 points.

**Why it happens (likely):**
1. When a player registers, the backend saves the player in `backend/data/players.json`
   (`backend/db/store.js`, `save()` function).
2. The frontend was opened with VS Code **Live Server** ("Go Live" button).
   Live Server reloads the web page every time **any** file in the project folder changes.
3. `players.json` is inside the project folder, so the page reloads right after registration.
4. The browser keeps the player token only in memory (`frontend/script.js`, line 15).
   A reload erases it, and the page restarts at the first screen.
5. The player exists on the server, but the browser no longer knows who it is,
   so the player can never earn points.

Before the backend existed, nothing wrote files during the game, so this never happened.

The same problem happens if the backend is started with `npm run dev` (nodemon):
nodemon restarts the server every time `players.json` changes.

**Fix (in `frontend/script.js`):**
- After registration, the token is saved in the browser (`localStorage`, key `csccPlayerToken`).
- When the page loads, `resumeSession()` reads the saved token, asks the backend
  `GET /api/player/me`, and puts the player back on the game screen at the right step
  (question, clue, or end screen).
- If the backend says the token is invalid (401), the saved token is deleted and the
  welcome screen is shown.
- PLAY AGAIN deletes the saved token, so a new player can register.

Live Server reloads no longer lose the player. A phone refresh or a closed tab no longer loses progress.
Using `npx serve` (see `PROJECT_GUIDE.md`) is still recommended.

**How to test:**
1. Start backend and frontend (see `PROJECT_GUIDE.md`, section 4).
2. Open http://localhost:5500, register a new nickname, answer one question correctly.
3. Press F5 to reload the page. Expected: the same player is back, with the clue card shown.
4. Scan QR-01 manually (`QR-01` / the QR-01 secret from `QR_SECRETS` in `backend/.env`), click CONTINUE, then reload again.
   Expected: score 1, question 2 shown.
5. Finish the game, reload. Expected: end screen with the final score.
6. Click PLAY AGAIN, reload. Expected: welcome screen (no player resumed).

---

## Bug 2 — `GET /api/health` on Render returns `{"error":"Not found"}`

**Status:** Code OK (tested on a new Render service). The original service needs its settings checked.

**What users see:** Opening `https://<render-app>.onrender.com/api/health` shows `{"error":"Not found"}`.

**Why it happens (likely):**
- `{"error":"Not found"}` comes from this project's own code (`backend/app.js`, line 65),
  so the server on Render is running.
- The `/api/health` route exists (`backend/app.js`, line 59).
- So either the URL typed was different from `/api/health`, or Render is running an older commit.

**Test done:** A new Render service was created from branch `fix/player-flow-houcine`
with the settings below. `GET /api/health` returned:
```
{"status":"ok","timestamp":"2026-10-11T16:05:10.499Z"}
```
So the backend code is correct. The problem is in the settings of the original Render service
or in the URL that was typed.

**Mistake found during the test:** with **Root Directory** left empty, Render runs commands in the
top folder of the repo and the deploy fails with `npm error Missing script: "start"`.

**Correct Render settings:**

| Setting | Value |
|---|---|
| Branch | the branch to deploy (for example `main`) |
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |
| Environment variable | `ORGANIZER_PASSWORD` (do not set `PORT`, Render sets it) |

**Fix for the original service:** the owner opens the service on Render, checks the settings above,
checks that the latest deploy in **Events** uses a recent commit, then calls exactly
`https://<service>.onrender.com/api/health`.

---

## Bug 3 — Frontend not deployed, game does not work end to end

**Status:** Open

**Why it happens:** `frontend/script.js` line 10 always calls `http://localhost:3000`.
A deployed website cannot reach a server on the player's own computer.

**Fix (part 1, backend address configurable):**
- New file `frontend/config.js` sets `window.CSCC_API_BASE` (local default: `http://localhost:3000`).
- `frontend/index.html` loads `config.js` before `script.js`.
- `frontend/script.js` already reads `window.CSCC_API_BASE` (line 10), so the game logic does not change.
- On Vercel, the build command rewrites `config.js` from the `CSCC_API_BASE` environment variable,
  so no URL is hardcoded for production.

**How to test (local):** start backend and frontend, open http://localhost:5500, press F12,
tab **Network**, register a player. Expected: requests go to `http://localhost:3000/api/...`
and the game works as before.

**Fix (part 2):** deploy the frontend on Vercel (to do).

---

## Bug 4 — "Continue the hunt" button does nothing

**Status:** Fixed (tested locally: full 5-round game, end screen and leaderboard OK)

**What users see:** After a checkpoint is accepted, clicking CONTINUE THE HUNT does nothing.

**Why it happens:**
1. Clicking I FOUND THE QR CODE tries to start the camera.
2. If the camera does not start (permission blocked, not answered yet, or no camera),
   the QR library is not running.
3. CONTINUE THE HUNT first calls `stopQrScanner()` (`frontend/script.js`).
4. The QR library throws `Cannot stop, scanner is not running or paused.` when asked to stop
   a camera that is not running. The error stops the click handler before the next question loads.
5. The same error also prevented the "Camera not available" message from appearing.

**Fix:** In `stopQrScanner()`, the call to `qrScanner.stop()` is wrapped in `try { } catch { }`,
so the game ignores this error and continues.

**How to test:**
1. Start backend and frontend (see `PROJECT_GUIDE.md`, section 4).
2. Open http://localhost:5500, register a new nickname, answer correctly.
3. Click I FOUND THE QR CODE. When the browser asks for the camera, click **Block**.
4. Expected: the message "Camera not available..." appears.
5. Click ENTER CODE MANUALLY, type `QR-01`, then the QR-01 secret from `QR_SECRETS` in `backend/.env`.
6. Click CONTINUE THE HUNT. Expected: question 2 appears.

---

## Other issues found (not fixed yet)

| # | Issue | Where | Risk |
|---|---|---|---|
| 1 | ~~Rate limit counts all players as one user on Render (missing `trust proxy`).~~ Fixed: `app.set('trust proxy', 1)` in `backend/app.js`, so each player is limited by their own IP. | `backend/app.js` | — |
| 2 | ~~Render free plan erases files on restart and sleeps after 15 minutes. Players and scores in `players.json` are lost.~~ Fixed: players are stored in Neon PostgreSQL when `DATABASE_URL` is set (`backend/db/store.js`). | `backend/db/store.js` | — |
| 3 | ~~The correct answer is sent to the browser. Players can see it in DevTools.~~ Fixed: `answer` removed from `GET /api/challenge`. | `backend/routes/challenge.js` | — |
| 4 | ~~A wrong answer shows the same question again, not a new one.~~ Fixed: a wrong answer replaces the round's question with a random unused one. | `backend/routes/challenge.js` | — |
| 5 | ~~Dashboard "Completed" count is always 0 (`finished` vs `isFinished`).~~ Fixed: frontend reads `isFinished`. | `frontend/script.js` | — |
| 6 | ~~Organizer dashboard has no password in the frontend. Default passwords are written in the code, README and `.env.example`.~~ Fixed: Organizer View asks for the password and uses `/api/organizer/dashboard`; no default password; login limited to 30 attempts per 15 minutes. | `frontend/script.js`, `backend/routes/organizer.js`, `backend/app.js` | — |
| 7 | ~~`players.json` with real player names and tokens is committed to git.~~ Fixed: file no longer tracked (`.gitignore`). Old versions remain in git history; they only contain test players. | `backend/data/players.json` | — |
| 8 | ~~QR secrets are written in the README and `qrcodes.json`.~~ Fixed: secrets moved to the `QR_SECRETS` environment variable and replaced with new ones (the old ones stay visible in git history, so they must not be printed). `QR/` folder no longer tracked. | `backend/db/store.js`, `generate_qr.js`, `README.md` | — |
| 9 | If `FRONTEND_ORIGIN` is not set, any website can call the backend. | `backend/app.js` line 13 | Security |
| 10 | ~~README says the game survives a page refresh, but the code does not save the token.~~ Fixed with bug 1. | `frontend/script.js` | — |
| 12 | ~~Rate limits too low for campus Wi-Fi, where all players can share one public IP (10 registrations and 120 requests per minute for everyone).~~ Fixed: raised to 100 registrations and 2000 requests per minute per IP. | `backend/app.js` | — |
| 13 | ~~After a wrong or unknown QR code, the camera turned off and the "I FOUND THE QR CODE" button stayed hidden: the player was stuck.~~ Fixed: after a failed scan the clue card and its button are shown again. | `frontend/script.js` (`allowRescan`) | — |
| 14 | ~~All players visited the checkpoints in the same order (QR-01 to QR-05): crowds at the same spot, players following each other.~~ Fixed: checkpoint order is shuffled per player. | `backend/db/store.js` (`createPlayer`) | — |
| 15 | Rule change requested by the organizers: a wrong answer costs 1 point, never below 0, and freezes the player for 30 seconds (enforced by the server, countdown shown on screen). Round counter and progress bar now follow checkpoints found, not the score. | `backend/routes/challenge.js`, `frontend/script.js` | — |
| 16 | ~~Scanning the wrong checkpoint showed "You need to scan QR-0X", which gave away the answer to the clue.~~ Fixed: message is now "Wrong checkpoint! Read your clue again." | `backend/routes/qr.js` | — |
| 11 | ~~Checkpoint ID and secret are case-sensitive. A player typing `qr-01` gets "Wrong checkpoint! You need to scan QR-01."~~ Fixed: manual entry is converted to uppercase before sending. | `frontend/script.js` (`scanCheckpointManual`) | — |
