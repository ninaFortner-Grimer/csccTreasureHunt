🏴‍☠️ CSCC Treasure Hunt
An interactive physical + digital treasure hunt made for CSCC Welcome Day.
Players solve randomized quizzes, receive clues, search the department for hidden QR codes, scan them to earn points, and repeat until they collect as many points as possible.
💡 How It Works
START
  ↓
Random Quiz
  ↓
Correct Answer
  ↓
Get a Clue
  ↓
Find Hidden QR
  ↓
Scan QR
  ↓
+1 Point
  ↓
New Random Quiz
  ↓
REPEAT
Example
Player answers:
What does CPU stand for?
✅ Correct!
They receive:
"Find me where students wait before entering the lab."
They search → find the corresponding QR → scan it → +1 point.
Then the website gives them another quiz.
🧠 Randomized Challenges
The same game should not give every player the same quiz.
For example:
Player A → Question 3 → Clue → QR-04

Player B → Question 7 → Clue → QR-02

Player C → Question 1 → Clue → QR-06
Questions and answer choices can be randomized.
This means sharing answers or simply following another player's path becomes much less useful.
📱 QR Codes
The QR codes are the treasure/checkpoints.
Each QR has its own unique ID:
QR-01
QR-02
QR-03
QR-04
...
When a player scans one, the backend checks whether it is the checkpoint they were supposed to find.
If valid:
🎉 Checkpoint found!
+1 POINT
A player cannot score the same QR twice.
🛡 Anti-Cheat
The backend should handle the important game logic.
Frontend
   ↓
API
   ↓
Backend
   ↓
Database
The frontend should not decide:
whether an answer is correct
whether a QR is valid
how many points the player gets
The backend does that.
🏗 Tech Stack
Frontend
HTML
CSS
JavaScript
Backend
Choose one:
Python + Flask
Python + FastAPI
Node.js + Express
Database
Choose one:
SQLite
Supabase
Firebase
For the 3-day MVP, use whatever the team already knows best.
🔌 API
Main endpoints:
POST /api/player
GET  /api/challenge
POST /api/challenge/answer
POST /api/qr/scan
GET  /api/leaderboard
Basic flow:
Player
  ↓
GET challenge
  ↓
Answer
  ↓
POST answer
  ↓
Receive clue
  ↓
Find QR
  ↓
POST QR scan
  ↓
Receive point
  ↓
New challenge
📁 Project Structure
CSCC-Treasure-Hunt/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/
│   ├── app.py
│   └── ...
│
├── qr/
│   ├── QR-01.png
│   ├── QR-02.png
│   └── ...
│
├── README.md
└── .gitignore
🔄 Development Pipeline
1. Define Game Rules
        ↓
2. Design Database
        ↓
3. Build API / Backend
        ↓
4. Build Frontend
        ↓
5. Create QR Codes + Clues
        ↓
6. Connect Everything
        ↓
7. Test With Multiple Players
        ↓
8. Deploy 🚀
⏱️ 3-Day MVP
Day 1
Backend
Database
Player system
Quiz system
Basic frontend
Day 2
QR system
Clues
Score system
Leaderboard
Connect frontend + backend
Day 3
Testing
Bug fixing
Mobile UI
Generate/print QR codes
Final deployment
Priority: A simple working game > a huge unfinished game.
🚀 Future Ideas
If we have more time later:
🏆 Live leaderboard
👥 Team mode
⏱️ Timer
🎁 Bonus QR codes
🔐 Cybersecurity challenges
🤖 Department-specific challenges
🛠 Admin dashboard
🏴‍☠️ Solve. Search. Scan. Score.
CSCC Dev Team — Welcome Day