
// CSCC Treasure Hunt — Welcome Day 2026
// Frontend prototype. Quiz logic and scoring run client-side.
// Backend integration can be connected when the backend is ready.

// ── Question Bank ─────────────────────────────────────────────────────────────
const questions = [
    {
        question: "What does CPU stand for?",
        answers: [
            "Central Processing Unit",
            "Computer Personal Unit",
            "Central Program Utility",
            "Computer Processing User"
        ],
        correct: "Central Processing Unit",
        clue: "Look for the place where students usually wait before entering a lab.",
        qr: "QR-01"
    },
    {
        question: "Which language is mainly used to style a webpage?",
        answers: [
            "CSS",
            "Python",
            "C",
            "SQL"
        ],
        correct: "CSS",
        clue: "Your next checkpoint is somewhere near a place where people write code.",
        qr: "QR-02"
    },
    {
        question: "What does HTML stand for?",
        answers: [
            "HyperText Markup Language",
            "HighText Machine Language",
            "Hyper Transfer Markup Link",
            "Home Tool Markup Language"
        ],
        correct: "HyperText Markup Language",
        clue: "Search somewhere students can sit, connect their laptops and work.",
        qr: "QR-03"
    },
    {
        question: "Which data structure follows FIFO?",
        answers: [
            "Queue",
            "Stack",
            "Tree",
            "Graph"
        ],
        correct: "Queue",
        clue: "Your QR is hiding somewhere close to a door.",
        qr: "QR-04"
    },
    {
        question: "Which symbol is used for a single-line comment in JavaScript?",
        answers: [
            "//",
            "/*",
            "#",
            "<!--"
        ],
        correct: "//",
        clue: "Check a place where information is usually displayed to students.",
        qr: "QR-05"
    }
];

// ── Demo Participants ─────────────────────────────────────────────────────────
const demoParticipants = [
    { name: "Ava", score: 2, status: "Playing", challenge: "Question 3", checkpoint: "QR-02" },
    { name: "Leo", score: 4, status: "Playing", challenge: "Question 5", checkpoint: "QR-05" },
    { name: "Maya", score: 1, status: "Playing", challenge: "Question 2", checkpoint: "QR-02" },
    { name: "Jules", score: 5, status: "Completed", challenge: "Complete", checkpoint: "Finished" },
    { name: "Riley", score: 3, status: "Playing", challenge: "Question 4", checkpoint: "QR-04" }
];

// ── State ─────────────────────────────────────────────────────────────────────
let playerName = "";
let score = 0;
let currentQuestion = null;
let currentQuestionIndex = 0;
let usedQuestions = [];

const totalQuestions = questions.length;

// ── Screen References ─────────────────────────────────────────────────────────
const welcomeScreen = document.getElementById("welcomeScreen");
const nicknameScreen = document.getElementById("nicknameScreen");
const gameScreen = document.getElementById("gameScreen");
const endScreen = document.getElementById("endScreen");
const dashboardScreen = document.getElementById("dashboardScreen");

// ── UI References ─────────────────────────────────────────────────────────────
const playerNameInput = document.getElementById("playerName");
const startButton = document.getElementById("startButton");
const beginButton = document.getElementById("beginButton");
const backToLandingBtn = document.getElementById("backToLanding");
const startError = document.getElementById("startError");
const displayName = document.getElementById("displayName");
const scoreDisplay = document.getElementById("score");
const questionElement = document.getElementById("question");
const answersContainer = document.getElementById("answers");
const feedback = document.getElementById("feedback");
const questionNumber = document.getElementById("questionNumber");
const clueCard = document.getElementById("clueCard");
const clueText = document.getElementById("clueText");
const findQrButton = document.getElementById("findQrButton");
const qrCard = document.getElementById("qrCard");
const scanButton = document.getElementById("scanButton");
const qrFeedback = document.getElementById("qrFeedback");
const nextButton = document.getElementById("nextButton");
const progressBar = document.getElementById("progressBar");
const finalScore = document.getElementById("finalScore");
const finalMessage = document.getElementById("finalMessage");
const leaderboard = document.getElementById("leaderboard");
const restartButton = document.getElementById("restartButton");
const dashboardToggleWelcome = document.getElementById("dashboardToggleWelcome");
const dashboardToggleEnd = document.getElementById("dashboardToggleEnd");
const dashboardToggleBack = document.getElementById("dashboardToggleBack");
const dashboardSearch = document.getElementById("dashboardSearch");
const dashboardRefresh = document.getElementById("dashboardRefresh");
const dashboardLeaderboard = document.getElementById("dashboardLeaderboard");
const dashboardEmpty = document.getElementById("dashboardEmpty");
const dashboardActivity = document.getElementById("dashboardActivity");
const dashboardActivityEmpty = document.getElementById("dashboardActivityEmpty");
const statTotal = document.getElementById("statTotal");
const statPlaying = document.getElementById("statPlaying");
const statCompleted = document.getElementById("statCompleted");

// ── Event Listeners ───────────────────────────────────────────────────────────

// Landing CTA → nickname screen
startButton.addEventListener("click", function () {
    showScreen("nickname");
    playerNameInput.focus();
});

// Back button → landing screen
backToLandingBtn.addEventListener("click", function () {
    startError.textContent = "";
    showScreen("welcome");
});

// Nickname CTA → start game
beginButton.addEventListener("click", startGame);

// Allow Enter key in nickname input
playerNameInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        startGame();
    }
});

// Show the QR checkpoint demo
findQrButton.addEventListener("click", function () {
    clueCard.classList.add("hidden");
    qrCard.classList.remove("hidden");
    qrFeedback.textContent = "";
    qrFeedback.style.color = "";
});

// Simulate a successful QR scan for the frontend demo
scanButton.addEventListener("click", function () {
    if (!currentQuestion || scanButton.disabled) return;

    const checkpoint = currentQuestion.qr;

    qrFeedback.textContent =
        "Demo checkpoint " + checkpoint + " accepted for this local prototype. " +
        "Server validation will be required in production.";

    qrFeedback.style.color = "#FFB95F";

    score++;
    scoreDisplay.textContent = score;
    scanButton.disabled = true;
    nextButton.classList.remove("hidden");
});

// Continue to the next question or finish
nextButton.addEventListener("click", function () {
    if (currentQuestionIndex >= totalQuestions) {
        endGame();
        return;
    }

    loadQuestion();
});

// Restart the game
restartButton.addEventListener("click", function () {
    playerNameInput.value = "";
    startError.textContent = "";
    progressBar.style.width = "0%";
    showScreen("welcome");
});

// Open organizer dashboard
dashboardToggleWelcome.addEventListener("click", function () {
    renderDashboard();
    showScreen("dashboard");
});

dashboardToggleEnd.addEventListener("click", function () {
    renderDashboard();
    showScreen("dashboard");
});

// Exit dashboard
dashboardToggleBack.addEventListener("click", function () {
    showScreen("welcome");
});

// Refresh dashboard
dashboardRefresh.addEventListener("click", function () {
    renderDashboard();
});

// Search dashboard participants
dashboardSearch.addEventListener("input", function () {
    renderDashboard();
});

// ── Navigation ────────────────────────────────────────────────────────────────
function showScreen(screenName) {
    const screens = [
        welcomeScreen,
        nicknameScreen,
        gameScreen,
        endScreen,
        dashboardScreen
    ];

    screens.forEach(function (screen) {
        if (screen) screen.classList.remove("active");
    });

    if (screenName === "welcome") {
        welcomeScreen.classList.add("active");
    } else if (screenName === "nickname") {
        nicknameScreen.classList.add("active");
    } else if (screenName === "game") {
        gameScreen.classList.add("active");
    } else if (screenName === "end") {
        endScreen.classList.add("active");
    } else if (screenName === "dashboard") {
        dashboardScreen.classList.add("active");
    }
}

// ── Game Logic ────────────────────────────────────────────────────────────────
function startGame() {
    const name = playerNameInput.value.trim();

    if (name === "") {
        startError.textContent = "Enter a nickname first.";
        playerNameInput.focus();
        return;
    }

    playerName = name;
    score = 0;
    currentQuestionIndex = 0;
    usedQuestions = [];

    displayName.textContent = playerName;
    scoreDisplay.textContent = score;
    startError.textContent = "";

    showScreen("game");
    loadQuestion();
}

function loadQuestion() {
    resetRound();

    if (usedQuestions.length >= questions.length) {
        endGame();
        return;
    }

    // Pick a question that hasn't appeared in this game
    let randomIndex;

    do {
        randomIndex = Math.floor(Math.random() * questions.length);
    } while (usedQuestions.includes(randomIndex));

    usedQuestions.push(randomIndex);

    currentQuestion = questions[randomIndex];
    currentQuestionIndex++;

    questionNumber.textContent =
        currentQuestionIndex + " / " + totalQuestions;

    updateProgress();
    questionElement.textContent = currentQuestion.question;
    createAnswerButtons(currentQuestion);
}

function createAnswerButtons(question) {
    answersContainer.innerHTML = "";

    const shuffledAnswers = [...question.answers];
    shuffleArray(shuffledAnswers);

    shuffledAnswers.forEach(function (answer) {
        const button = document.createElement("button");

        button.textContent = answer;
        button.classList.add("answer-button");

        button.addEventListener("click", function () {
            checkAnswer(answer, button);
        });

        answersContainer.appendChild(button);
    });
}

function checkAnswer(answer, clickedButton) {
    const answerButtons = document.querySelectorAll(".answer-button");

    answerButtons.forEach(function (button) {
        button.disabled = true;
    });

    if (answer === currentQuestion.correct) {
        clickedButton.classList.add("correct");
        feedback.textContent = "Correct. Follow the clue below.";
        feedback.style.color = "#4ade80";
        showClue();
        return;
    }

    clickedButton.classList.add("wrong");
    feedback.textContent = "Not quite. Try the next challenge.";
    feedback.style.color = "#f87171";

    setTimeout(function () {
        loadQuestion();
    }, 1200);
}

function showClue() {
    clueText.textContent = currentQuestion.clue;
    clueCard.classList.remove("hidden");
}

function resetRound() {
    clueCard.classList.add("hidden");
    qrCard.classList.add("hidden");
    nextButton.classList.add("hidden");

    feedback.textContent = "";
    feedback.style.color = "";

    qrFeedback.textContent = "";
    qrFeedback.style.color = "";

    scanButton.disabled = false;
    answersContainer.innerHTML = "";
}

function updateProgress() {
    const progress = (currentQuestionIndex / totalQuestions) * 100;
    progressBar.style.width = progress + "%";
}

function endGame() {
    showScreen("end");

    finalScore.textContent = score;

    const endPlayerName = document.getElementById("endPlayerName");

    if (endPlayerName) {
        endPlayerName.textContent = playerName;
    }

    finalMessage.textContent =
        "You completed all " + totalQuestions + " challenges.";

    saveScore();
    showLeaderboard();
    renderDashboard();
}

// ── Persistence ───────────────────────────────────────────────────────────────
function saveScore() {
    const oldScores = getStoredScores();

    oldScores.push({
        name: playerName,
        score: score
    });

    oldScores.sort(function (a, b) {
        return b.score - a.score;
    });

    try {
        localStorage.setItem("csccScores", JSON.stringify(oldScores));
    } catch (error) {
        console.warn("Could not save scores in this browser.", error);
    }
}

function getStoredScores() {
    try {
        const stored = JSON.parse(localStorage.getItem("csccScores"));
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        return [];
    }
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
function showLeaderboard() {
    const scores = getStoredScores();

    leaderboard.innerHTML = "";

    if (!scores.length) {
        leaderboard.innerHTML =
            '<div class="empty-state">No scores recorded yet.</div>';
        return;
    }

    scores.slice(0, 10).forEach(function (player, index) {
        const row = document.createElement("div");
        row.classList.add("leaderboard-row");

        const nameContainer = document.createElement("div");
        nameContainer.classList.add("player-name");

        const place = document.createElement("span");
        place.classList.add("player-place");
        place.textContent = "#" + (index + 1);

        const name = document.createElement("strong");
        name.textContent = player.name;

        const playerScore = document.createElement("span");
        playerScore.classList.add("player-score");
        playerScore.textContent = player.score + " pts";

        nameContainer.appendChild(place);
        nameContainer.appendChild(name);
        row.appendChild(nameContainer);
        row.appendChild(playerScore);
        leaderboard.appendChild(row);
    });
}

// ── Organizer Dashboard ───────────────────────────────────────────────────────
function getDashboardParticipants() {
    const savedScores = getStoredScores();

    const savedRows = savedScores.map(function (entry) {
        return {
            name: entry.name,
            score: entry.score,
            status: entry.score >= 5 ? "Completed" : "Playing",
            challenge: entry.score >= 5 ? "Complete" : "In progress",
            checkpoint: entry.score >= 5
                ? "Finished"
                : "QR-0" + Math.min(entry.score + 1, 5)
        };
    });

    const combined = [...demoParticipants, ...savedRows];
    const seen = new Set();

    return combined
        .filter(function (item) {
            const key = (item.name || "").toLowerCase();

            if (!key || seen.has(key)) return false;

            seen.add(key);
            return true;
        })
        .sort(function (a, b) {
            return b.score - a.score;
        });
}

function renderDashboard() {
    const participants = getDashboardParticipants();
    const searchText = (dashboardSearch.value || "").trim().toLowerCase();

    const filtered = participants.filter(function (person) {
        return person.name.toLowerCase().includes(searchText);
    });

    dashboardLeaderboard.innerHTML = "";

    if (filtered.length === 0) {
        dashboardEmpty.classList.remove("hidden");
    } else {
        dashboardEmpty.classList.add("hidden");

        filtered.slice(0, 8).forEach(function (player, index) {
            const row = document.createElement("div");
            row.classList.add("leaderboard-row");

            const nameContainer = document.createElement("div");
            nameContainer.classList.add("player-name");

            const place = document.createElement("span");
            place.classList.add("player-place");
            place.textContent = "#" + (index + 1);

            const name = document.createElement("strong");
            name.textContent = player.name;

            const playerScore = document.createElement("span");
            playerScore.classList.add("player-score");
            playerScore.textContent = player.score + " pts";

            nameContainer.appendChild(place);
            nameContainer.appendChild(name);
            row.appendChild(nameContainer);
            row.appendChild(playerScore);

            dashboardLeaderboard.appendChild(row);
        });
    }

    const completedCount = participants.filter(function (person) {
        return person.status === "Completed" || person.score >= 5;
    }).length;

    const playingCount = participants.filter(function (person) {
        return person.status === "Playing";
    }).length;

    statTotal.textContent = participants.length;
    statPlaying.textContent = playingCount;
    statCompleted.textContent = completedCount;

    const activityItems = filtered.length
        ? filtered.slice(0, 5)
        : [];

    dashboardActivity.innerHTML = "";

    if (activityItems.length === 0) {
        dashboardActivityEmpty.classList.remove("hidden");
        return;
    }

    dashboardActivityEmpty.classList.add("hidden");

    activityItems.forEach(function (player) {
        const item = document.createElement("div");
        item.classList.add("activity-row");

        const details = document.createElement("div");

        const name = document.createElement("strong");
        name.textContent = player.name;

        const meta = document.createElement("div");
        meta.classList.add("activity-meta");
        meta.textContent =
            "Status: " + player.status + " • " + player.challenge;

        const playerScore = document.createElement("div");
        playerScore.classList.add("player-score");
        playerScore.textContent = player.score + " pts";

        details.appendChild(name);
        details.appendChild(meta);
        item.appendChild(details);
        item.appendChild(playerScore);

        dashboardActivity.appendChild(item);
    });
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
    }
}

// ── Initialise ────────────────────────────────────────────────────────────────
showScreen("welcome");
showLeaderboard();
renderDashboard();