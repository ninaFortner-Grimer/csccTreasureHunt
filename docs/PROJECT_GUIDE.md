# CSCC Treasure Hunt — Project Guide

This guide explains how the project works and how to run it on your own computer.
It is written for team members who are new to web development.

---

## 1. What the game does

1. A player opens the website and clicks **START THE HUNT**.
2. The player types a nickname and clicks **BEGIN THE HUNT**.
3. The player answers a multiple-choice question (QCM).
   - Correct answer: the player gets a clue that points to a hidden QR code.
   - Wrong answer: the player gets another question.
4. The player finds the QR code, scans it with the phone camera, and earns 1 point.
5. Steps 3 and 4 repeat until the player has found all 5 QR checkpoints.
6. The end screen shows the final score and the leaderboard.
7. Organizers can open the **Organizer View** to see all players and their scores.

---

## 2. The two parts of the project

The project has two separate programs that talk to each other.

| Part | Folder | What it is | What it does |
|---|---|---|---|
| Frontend | `frontend/` | HTML, CSS, JavaScript files | What the player sees in the browser. Buttons, screens, camera scanner. |
| Backend | `backend/` | A Node.js + Express server | The "brain". It creates players, picks questions, checks answers, checks QR codes, keeps scores. |

The frontend never decides if an answer is correct. It asks the backend.
They talk over HTTP: the frontend sends a request (for example "here is my answer"),
and the backend sends back a response (for example "correct, here is your clue").

```
 Player's browser                         Backend server (Node.js)
 (frontend/index.html + script.js)        (backend/app.js)
        |                                         |
        |  POST /api/player  {name}               |
        | --------------------------------------> |  creates player, saves to players.json
        | <-------------------------------------- |  returns a token (the player's ID card)
        |                                         |
        |  GET /api/challenge  + token            |
        | --------------------------------------> |  finds this player's current question
        | <-------------------------------------- |  returns question + choices
        |                                         |
        |  POST /api/challenge/answer + token     |
        | --------------------------------------> |  checks the answer
        | <-------------------------------------- |  correct -> clue / wrong -> try again
        |                                         |
        |  POST /api/qr/scan  + token             |
        | --------------------------------------> |  checks the QR code, adds 1 point
        | <-------------------------------------- |  returns new score
```

### The token

When a player registers, the backend gives the browser a **token** (a long random text).
The browser sends this token with every request in a header named `x-player-token`.
This is how the backend knows which player is talking. If the browser loses the token,
the player can no longer continue their game.

---

## 3. Folder structure

```
csccTreasureHunt/
├── frontend/                 Website the players use
│   ├── index.html            All 5 screens (landing, nickname, game, end, dashboard)
│   ├── script.js             Game logic in the browser + calls to the backend
│   ├── style.css             Design
│   └── assets/               Logo
├── backend/                  Server
│   ├── app.js                Starts the server, sets up CORS, rate limits, routes
│   ├── routes/               One file per group of API endpoints
│   │   ├── player.js         Register a player, get player info
│   │   ├── challenge.js      Get the current question, submit an answer
│   │   ├── qr.js             Scan a QR checkpoint
│   │   ├── leaderboard.js    Public ranking
│   │   └── organizer.js      Organizer login + dashboard data
│   ├── middleware/auth.js    Checks the player token on protected routes
│   ├── db/store.js           Reads and writes the JSON data files
│   ├── data/                 The "database" (plain JSON files)
│   │   ├── questions.json    Question bank
│   │   ├── qrcodes.json      The 5 checkpoints, their secrets and clues
│   │   └── players.json      All registered players and their progress
│   ├── .env.example          Template for settings (copy it to .env)
│   └── package.json          Backend dependencies and start commands
├── QR/                       Generated QR images + printable sheet
├── generate_qr.js            Script that creates the QR images
├── run_tests.ps1             Automatic API test (PowerShell)
└── docs/                     Project documentation (this file + bug log)
```

There is no real database. All data lives in the JSON files in `backend/data/`.

---

## 4. How to run the project on your computer (Windows)

You need **two terminal windows open at the same time**: one for the backend,
one for the frontend. Both must keep running while you play.

### Step 0 — One-time setup

1. Install Node.js (LTS version) from https://nodejs.org if it is not installed.
2. Check it works. Open a terminal and type:
   ```
   node -v
   npm -v
   ```
   Both commands must print a version number.

**How to open a terminal in VS Code:** menu **Terminal > New Terminal**.
It opens at the bottom of the window, already inside the project folder.
To open a second one, click the **+** icon in the terminal panel.

### Step 1 — Start the backend (terminal 1)

```
cd backend
npm install
copy .env.example .env
npm start
```

| Command | What it does |
|---|---|
| `cd backend` | Moves into the backend folder. |
| `npm install` | Downloads the libraries the backend needs (only needed the first time, or after `package.json` changes). |
| `copy .env.example .env` | Creates your local settings file (only the first time). Never commit `.env`. |
| `npm start` | Starts the server. |

When it works, you see:
```
CSCC Treasure Hunt backend running on port 3000
```
Leave this terminal open. Closing it stops the server.
To stop the server on purpose, click in the terminal and press **Ctrl + C**.

Quick check: open http://localhost:3000/api/health in your browser.
You should see `{"status":"ok", ...}`.

### Step 2 — Start the frontend (terminal 2)

Open a **second** terminal (the **+** icon). It starts in the project root folder.

```
npx serve frontend -l 5500
```

| Command | What it does |
|---|---|
| `npx serve frontend -l 5500` | Serves the `frontend` folder as a website on port 5500. The first time, it asks to install `serve`: type `y` and press Enter. |

Then open http://localhost:5500 in your browser.

Do **not** use the VS Code "Go Live" (Live Server) button for this project.
See bug 1 in `BUG_LOG.md` for the reason.

### Common problems

| Message | Meaning | Fix |
|---|---|---|
| `npm.ps1 cannot be loaded because running scripts is disabled` | PowerShell blocks npm. | Use `npm.cmd install` and `npm.cmd start` instead, or switch the terminal to "Command Prompt" with the dropdown next to **+**. |
| `EADDRINUSE: address already in use :::3000` | The backend is already running in another terminal. | Use the terminal that is already running it, or stop it with Ctrl + C. |
| "Cannot reach the server" in the game | The backend is not running. | Do Step 1. |

---

## 5. API reference

Base URL locally: `http://localhost:3000/api`

| Method | URL | Token needed | Body | What it does |
|---|---|---|---|---|
| GET | `/health` | No | — | Checks the server is alive. |
| POST | `/player` | No | `{"name":"Alan"}` | Registers a player. Returns `token`. |
| GET | `/player/me` | Yes | — | Returns the player's state and score. |
| GET | `/challenge` | Yes | — | Returns the current question, or the clue if the player must scan. |
| POST | `/challenge/answer` | Yes | `{"answer":"..."}` | Checks an answer. |
| POST | `/qr/scan` | Yes | `{"code":"QR-01","secret":"..."}` | Validates a checkpoint and adds 1 point. |
| GET | `/leaderboard` | No | — | Ranking of all players. |
| POST | `/organizer/login` | No | `{"password":"..."}` | Returns an organizer token. |
| GET | `/organizer/dashboard` | Organizer token | — | Detailed player list. |

"Token needed: Yes" means the request must include the header
`x-player-token: <token from POST /player>`.

---

## 6. Settings (environment variables)

Settings live in `backend/.env` (never committed to git).

| Variable | Example | Meaning |
|---|---|---|
| `PORT` | `3000` | Port the backend listens on. |
| `FRONTEND_ORIGIN` | `http://localhost:5500` | Website address allowed to call the backend (CORS). |
| `ORGANIZER_PASSWORD` | (secret) | Password for the organizer login. |

---

## 7. Deployment

Not done yet. This section will be completed when the game works locally.
