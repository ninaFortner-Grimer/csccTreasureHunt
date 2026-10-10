# CSCC Treasure Hunt — Bug Log

Each bug lists: what users see, why it happens, how it was fixed, and how to test it.
Status values: **Open** (found, not fixed), **Fixed** (fixed and tested).

---

## Bug 1 — "Begin the hunt" sends the player back, score stays at 0

**Status:** Open (cause confirmed: the game works when served with `npx serve` instead of Live Server)

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

**Fix:** To be decided.

**How to test:** See `PROJECT_GUIDE.md`, section 4. Start the frontend with
`npx serve frontend -l 5500` instead of Live Server, then play one round.

---

## Bug 2 — `GET /api/health` on Render returns `{"error":"Not found"}`

**Status:** Open (need Render settings to confirm)

**What users see:** Opening `https://<render-app>.onrender.com/api/health` shows `{"error":"Not found"}`.

**Why it happens (likely):**
- `{"error":"Not found"}` comes from this project's own code (`backend/app.js`, line 65),
  so the server on Render is running.
- The `/api/health` route exists (`backend/app.js`, line 59).
- So either the URL typed was different from `/api/health`, or Render is running an older commit.

**Fix:** To be decided after checking the Render settings and deploy log.

---

## Bug 3 — Frontend not deployed, game does not work end to end

**Status:** Open

**Why it happens:** `frontend/script.js` line 10 always calls `http://localhost:3000`.
A deployed website cannot reach a server on the player's own computer.

**Fix:** To be done during deployment (make the backend address configurable).

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
5. Click ENTER CODE MANUALLY, type `QR-01`, then `CSCC-LAB-7K2P`.
6. Click CONTINUE THE HUNT. Expected: question 2 appears.

---

## Other issues found (not fixed yet)

| # | Issue | Where | Risk |
|---|---|---|---|
| 1 | Rate limit counts all players as one user on Render (missing `trust proxy`). The whole event shares 10 registrations per minute. | `backend/app.js` lines 24–39 | High on event day |
| 2 | Render free plan erases files on restart and sleeps after 15 minutes. Players and scores in `players.json` are lost. | `backend/db/store.js` | High on event day |
| 3 | The correct answer is sent to the browser. Players can see it in DevTools. | `backend/routes/challenge.js` line 47 | Cheating |
| 4 | A wrong answer shows the same question again, not a new one. | `backend/routes/challenge.js` line 96 | Does not match game rules |
| 5 | Dashboard "Completed" count is always 0 (`finished` vs `isFinished`). | `frontend/script.js` lines 523, 559, 585 | Wrong stats |
| 6 | Organizer dashboard has no password in the frontend. Default passwords are written in the code, README and `.env.example`. | `backend/routes/organizer.js` line 7 | Security |
| 7 | `players.json` with real player names and tokens is committed to git. | `backend/data/players.json` | Privacy |
| 8 | QR secrets are written in the README and `qrcodes.json`. If the repo is public, players can score without finding the QR codes. | `README.md`, `backend/data/qrcodes.json` | Cheating |
| 9 | If `FRONTEND_ORIGIN` is not set, any website can call the backend. | `backend/app.js` line 13 | Security |
| 10 | README says the game survives a page refresh, but the code does not save the token. | `README.md`, `frontend/script.js` | Players lose progress on refresh |
