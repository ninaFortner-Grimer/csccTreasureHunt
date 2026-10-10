# 🏴‍☠️ CSCC Treasure Hunt — Welcome Day 2026

An interactive physical + digital treasure hunt application built for the **Computer Science Club (CSCC) Welcome Day 2026**.

Participants register on their mobile phones, answer randomized Computer Science quizzes, receive location clues, search the department for hidden physical QR codes, scan them using their phone's camera, and compete for top positions on the live leaderboard.

---

## 🎨 Visual Identity & Design System

The application preserves the signature **CSCC Navy-Blue and Gold visual identity**:
- **Primary Navy**: `#0A0F34` & `#101748`
- **Accent Gold**: `#FFB95F` & `#E59E38`
- **Card Backgrounds**: `#161F58` with subtle glassmorphism and gold borders
- **Typography**: Inter / Outfit modern sans-serif stack

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Install Dependencies & Generate QR Assets
```bash
# Clone or navigate to the project directory
cd csccTreasureHunt

# Install backend dependencies
cd backend
npm install
cd ..

# Install QR generator dependencies
npm install

# Generate QR images and print sheet
node generate_qr.js
```

### 3. Configure Environment Variables
Create a `.env` file inside the `backend` directory (or copy from `backend/.env.example`):

```env
PORT=3000
FRONTEND_ORIGIN=http://localhost:5500
ORGANIZER_PASSWORD=CSCC_WELCOME_2026_ADMIN
```

### 4. Start the Backend Server
```bash
cd backend
npm start
```
The backend API will run on `http://localhost:3000`.

### 5. Launch the Frontend
Serve the `frontend/` directory using any HTTP server (e.g. VS Code Live Server, `npx serve frontend`, or Python `http.server`):

```bash
npx serve frontend -p 5500
```
Open `http://localhost:5500` in your browser.

---

## 🧠 Question Bank (25 Questions)

The application features **25 beginner-friendly, verified questions** covering 6 core topics:
1. **Basic Computer Science**: CPU, RAM, Binary, Bytes, OS.
2. **Programming**: Variables, Comments, Queues, Types, Logic.
3. **Web Development**: HTML, CSS, JavaScript, HTTP Status Codes, Image Tags.
4. **Networking & Cybersecurity**: HTTPS, Routers, IP Addresses, Firewalls.
5. **Artificial Intelligence**: Machine Learning, Training Data, Voice Assistants, LLMs.
6. **Robotics**: Sensors, Actuators, Microcontrollers (Arduino), Input-Processing-Output sequence.

Every participant receives a **uniquely randomized set of 5 questions** stored on the server and persisted across browser refreshes.

---

## 📍 5 Physical QR Checkpoints & Clues

| Checkpoint ID | Intended Physical Location | Clue Shown to Participant | Secret Payload |
|---|---|---|---|
| **QR-01** | Laboratory Entrance | *"Find me where students wait before entering the laboratory."* | `CSCC:QR-01:CSCC-LAB-7K2P` |
| **QR-02** | Department Entrance | *"I'm hiding near the department entrance. Can you find me?"* | `CSCC:QR-02:CSCC-ENT-9M4X` |
| **QR-03** | Notice / Schedule Board | *"Look where schedules and announcements are posted."* | `CSCC:QR-03:CSCC-NOT-3W8Y` |
| **QR-04** | TD Classrooms | *"You'll find me where students gather to learn and gain knowledge."* | `CSCC:QR-04:CSCC-TD-5R1Z` |
| **QR-05** | Student Clubs Area | *"You'll find me where students learn new things, explore their interests, and have fun doing what they love."* | `CSCC:QR-05:CSCC-SOC-2L6V` |

---

## 🖨️ Printing & Setting Up QR Codes

1. Run `node generate_qr.js`.
2. Open `QR/print_sheet.html` in your browser.
3. Print the document (`Ctrl+P` / `Cmd+P`) on standard A4 paper.
4. Cut out each card along the borders.
5. Hide or fold the yellow "Organizer Section" at the bottom of each card.
6. Mount cards at their corresponding physical locations in the department.

---

## 🔐 Organizer Dashboard

Organizers can view live event statistics, active players, and final rankings.

- **URL**: Click **Organizer Access** on the footer of `index.html` or navigate directly.
- **Default Password**: `CSCC_WELCOME_2026_ADMIN` (Configurable via `ORGANIZER_PASSWORD` in `.env`).
- **Capabilities**: View total participants, players currently active, completed games, and detailed scores.

---

## 🧪 Automated Testing

A full PowerShell end-to-end regression test suite is included:

```powershell
powershell -ExecutionPolicy Bypass -File run_tests.ps1
```

**Tested Scenarios**:
- ✅ Nickname validation & special character sanitization
- ✅ Registration & token storage
- ✅ Stable session restoration on refresh
- ✅ 5-round complete gameplay flow
- ✅ Wrong answer rejection & retry
- ✅ Invalid QR code rejection
- ✅ Valid QR scan verification
- ✅ Leaderboard sorting & timing
- ✅ Organizer dashboard authentication & data access

---

## 📋 Event-Day Operations & Troubleshooting Guide

### 1. Camera Permission Issues
- **Symptoms**: Camera view is black or browser displays "Permission denied".
- **Fix**:
  1. Ensure the site is served over **HTTPS** (required by mobile browsers for camera access).
  2. Ask the user to go to site settings in Chrome/Safari and reset permissions for camera.
  3. If camera permission is blocked, use the **Manual Code Input** fallback option provided on screen.

### 2. Connection Drops / Refreshing
- **Symptoms**: Participant accidentally refreshes or loses connection.
- **Fix**:
  - The application automatically saves the player token in `localStorage`.
  - Upon reload, the application fetches `GET /api/player/me` and restores the exact game state, question, and checkpoint clue without losing progress.

### 3. Server Outage Recovery
- **Symptoms**: Backend server restarts during the event.
- **Fix**:
  - All player states are persisted continuously to `backend/data/players.json`.
  - When the backend restarts, `store.load()` reloads all active player records, allowing participants to resume seamlessly.

---

## 🏴‍☠️ Credits
CSCC Development Team — Welcome Day 2026