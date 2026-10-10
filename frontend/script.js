
const API = "http://localhost:3000/api";
const TOTAL = 5;

let playerName = "";
let token = "";
let score = 0;
let currentQuestion = null;
let busy = false;

const $ = id => document.getElementById(id);

const welcomeScreen = $("welcomeScreen");
const nicknameScreen = $("nicknameScreen");
const gameScreen = $("gameScreen");
const endScreen = $("endScreen");
const dashboardScreen = $("dashboardScreen");

const playerNameInput = $("playerName");
const startButton = $("startButton");
const beginButton = $("beginButton");
const backToLanding = $("backToLanding");
const startError = $("startError");
const displayName = $("displayName");
const scoreDisplay = $("score");
const questionElement = $("question");
const answers = $("answers");
const feedback = $("feedback");
const questionNumber = $("questionNumber");
const clueCard = $("clueCard");
const clueText = $("clueText");
const findQrButton = $("findQrButton");
const qrCard = $("qrCard");
const scanButton = $("scanButton");
const qrFeedback = $("qrFeedback");
const nextButton = $("nextButton");
const progressBar = $("progressBar");
const finalScore = $("finalScore");
const finalMessage = $("finalMessage");
const leaderboard = $("leaderboard");
const restartButton = $("restartButton");

async function api(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) headers["x-player-token"] = token;

    let response;

    try {
        response = await fetch(API + path, {
            ...options,
            headers
        });
    } catch {
        throw new Error("Cannot connect to the backend. Keep npm start running.");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Request failed.");
    }

    return data;
}

function showScreen(name) {
    [
        welcomeScreen,
        nicknameScreen,
        gameScreen,
        endScreen,
        dashboardScreen
    ].forEach(screen => screen?.classList.remove("active"));

    const screens = {
        welcome: welcomeScreen,
        nickname: nicknameScreen,
        game: gameScreen,
        end: endScreen,
        dashboard: dashboardScreen
    };

    screens[name]?.classList.add("active");
}

function message(element, text, color = "") {
    if (!element) return;
    element.textContent = text;
    if (color) element.style.color = color;
}

function setBusy(value) {
    busy = value;
    if (beginButton) beginButton.disabled = value;
    if (scanButton) scanButton.disabled = value;
}

startButton?.addEventListener("click", event => {
    event.preventDefault();
    showScreen("nickname");
    playerNameInput?.focus();
});

backToLanding?.addEventListener("click", event => {
    event.preventDefault();
    message(startError, "");
    showScreen("welcome");
});

beginButton?.addEventListener("click", event => {
    event.preventDefault();
    startGame();
});

playerNameInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        startGame();
    }
});

findQrButton?.addEventListener("click", event => {
    event.preventDefault();
    clueCard?.classList.add("hidden");
    qrCard?.classList.remove("hidden");
    message(qrFeedback, "");
});

scanButton?.addEventListener("click", event => {
    event.preventDefault();
    scanCheckpoint();
});

nextButton?.addEventListener("click", async event => {
    event.preventDefault();
    if (busy) return;

    if (score >= TOTAL) {
        await endGame();
    } else {
        await loadQuestion();
    }
});

restartButton?.addEventListener("click", () => {
    token = "";
    playerName = "";
    score = 0;
    currentQuestion = null;

    if (playerNameInput) playerNameInput.value = "";
    if (progressBar) progressBar.style.width = "0%";

    message(startError, "");
    showScreen("welcome");
});

$("dashboardToggleWelcome")?.addEventListener("click", async () => {
    showScreen("dashboard");
    await renderDashboard();
});

$("dashboardToggleEnd")?.addEventListener("click", async () => {
    showScreen("dashboard");
    await renderDashboard();
});

$("dashboardToggleBack")?.addEventListener("click", () => {
    showScreen("welcome");
});

$("dashboardRefresh")?.addEventListener("click", renderDashboard);
$("dashboardSearch")?.addEventListener("input", renderDashboard);

async function startGame() {
    if (busy) return;

    const name = (playerNameInput?.value || "").trim();

    if (name.length < 2 || name.length > 30) {
        message(startError, "Enter a nickname between 2 and 30 characters.");
        playerNameInput?.focus();
        return;
    }

    setBusy(true);
    message(startError, "");

    try {
        console.log("START GAME: sending nickname");
        const player = await api("/player", {
            method: "POST",
            body: JSON.stringify({ name })
        });

        playerName = player.name;
        console.log("PLAYER CREATED:", player);
        token = player.token;
        score = 0;

        if (displayName) displayName.textContent = playerName;
        if (scoreDisplay) scoreDisplay.textContent = "0";
        if (progressBar) progressBar.style.width = "0%";

        showScreen("game");
        await loadQuestion();
    } catch (error) {
        showScreen("nickname");
        message(startError, error.message, "#f87171");
    } finally {
        setBusy(false);
    }
}

async function loadQuestion() {
    setBusy(true);
    resetRound();

    try {
        const data = await api("/challenge");

        if (data.finished) {
            score = Number(data.score ?? score);
            updateProgress();
            await endGame();
            return;
        }

        if (data.state === "waiting_scan") {
            message(feedback, "Correct answer! Find your checkpoint.");
            message(clueText, data.clue || "Find your assigned checkpoint.");
            clueCard?.classList.remove("hidden");
            return;
        }

        currentQuestion = data;

        if (questionNumber) {
            questionNumber.textContent = `${Math.min(score + 1, TOTAL)} / ${TOTAL}`;
        }

        if (questionElement) questionElement.textContent = data.text;

        updateProgress();
        createAnswerButtons(data.choices || []);
    } catch (error) {
        message(feedback, error.message, "#f87171");
    } finally {
        setBusy(false);
    }
}

function createAnswerButtons(choices) {
    if (!answers) return;

    answers.innerHTML = "";

    choices.forEach(answer => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = answer;
        button.classList.add("answer-button");

        button.addEventListener("click", () => checkAnswer(answer, button));

        answers.appendChild(button);
    });
}

async function checkAnswer(answer, button) {
    if (busy || !currentQuestion) return;

    setBusy(true);

    document.querySelectorAll(".answer-button").forEach(item => {
        item.disabled = true;
    });

    try {
        const result = await api("/challenge/answer", {
            method: "POST",
            body: JSON.stringify({ answer })
        });

        if (result.correct) {
            button.classList.add("correct");
            message(feedback, "Correct! Follow the clue below.", "#4ade80");
            message(clueText, result.clue || "Find your assigned checkpoint.");
            clueCard?.classList.remove("hidden");
        } else {
            button.classList.add("wrong");
            message(feedback, "Incorrect answer. Try the next question.", "#f87171");
            currentQuestion = null;

            window.setTimeout(() => {
                loadQuestion();
            }, 1000);
        }
    } catch (error) {
        message(feedback, error.message, "#f87171");

        document.querySelectorAll(".answer-button").forEach(item => {
            item.disabled = false;
        });
    } finally {
        setBusy(false);
    }
}

async function scanCheckpoint() {
    if (busy) return;

    const code = window.prompt("Enter your checkpoint ID (example: QR-01):");
    if (code === null) return;

    const secret = window.prompt("Enter the checkpoint secret:");
    if (secret === null) return;

    setBusy(true);
    message(qrFeedback, "Checking checkpoint...");

    try {
        const result = await api("/qr/scan", {
            method: "POST",
            body: JSON.stringify({
                code: code.trim(),
                secret: secret.trim()
            })
        });

        score = Number(result.score ?? score);
        updateProgress();

        message(
            qrFeedback,
            result.finished
                ? "Checkpoint accepted! Hunt completed!"
                : "Checkpoint accepted! You earned a point!",
            "#4ade80"
        );

        nextButton?.classList.remove("hidden");

        if (nextButton) {
            nextButton.textContent = result.finished
                ? "FINISH THE HUNT"
                : "CONTINUE THE HUNT →";
        }

        await showLeaderboard();
    } catch (error) {
        message(qrFeedback, error.message, "#f87171");
    } finally {
        setBusy(false);
    }
}

function resetRound() {
    clueCard?.classList.add("hidden");
    qrCard?.classList.add("hidden");
    nextButton?.classList.add("hidden");

    message(feedback, "");
    message(qrFeedback, "");

    if (answers) answers.innerHTML = "";
}

function updateProgress() {
    if (scoreDisplay) scoreDisplay.textContent = String(score);

    if (progressBar) {
        progressBar.style.width = `${Math.min(score / TOTAL * 100, 100)}%`;
    }

    if (questionNumber) {
        questionNumber.textContent = `${Math.min(score + 1, TOTAL)} / ${TOTAL}`;
    }
}

async function endGame() {
    showScreen("end");

    if (finalScore) finalScore.textContent = String(score);

    const endName = $("endPlayerName");
    if (endName) endName.textContent = playerName;

    if (finalMessage) {
        finalMessage.textContent =
            `You completed the hunt with ${score} out of ${TOTAL} checkpoints.`;
    }

    await showLeaderboard();
    await renderDashboard();
}

function renderRows(container, players) {
    if (!container) return;

    container.innerHTML = "";

    if (!players.length) {
        container.innerHTML = '<div class="empty-state">No scores recorded yet.</div>';
        return;
    }

    players.slice(0, 10).forEach((player, index) => {
        const row = document.createElement("div");
        row.classList.add("leaderboard-row");

        const nameContainer = document.createElement("div");
        nameContainer.classList.add("player-name");

        const place = document.createElement("span");
        place.classList.add("player-place");
        place.textContent = "#" + (player.rank || index + 1);

        const name = document.createElement("strong");
        name.textContent = player.name;

        const points = document.createElement("span");
        points.classList.add("player-score");
        points.textContent = `${player.score} pts`;

        nameContainer.append(place, name);
        row.append(nameContainer, points);
        container.appendChild(row);
    });
}

async function showLeaderboard() {
    try {
        const players = await api("/leaderboard");
        renderRows(leaderboard, players);
    } catch (error) {
        if (leaderboard) leaderboard.textContent = error.message;
    }
}

async function renderDashboard() {
    const container = $("dashboardLeaderboard");
    if (!container) return;

    try {
        const players = await api("/leaderboard");
        const query = ($("dashboardSearch")?.value || "").trim().toLowerCase();

        const filtered = players.filter(player =>
            player.name.toLowerCase().includes(query)
        );

        renderRows(container, filtered);

        $("dashboardEmpty")?.classList.toggle("hidden", filtered.length > 0);

        const completed = players.filter(player => player.finished).length;

        if ($("statTotal")) $("statTotal").textContent = String(players.length);
        if ($("statCompleted")) $("statCompleted").textContent = String(completed);
        if ($("statPlaying")) $("statPlaying").textContent = String(players.length - completed);

        const activity = $("dashboardActivity");

        if (activity) {
            activity.innerHTML = "";

            filtered.slice(0, 5).forEach(player => {
                const item = document.createElement("div");
                item.classList.add("activity-row");

                const details = document.createElement("div");
                const name = document.createElement("strong");
                name.textContent = player.name;

                const status = document.createElement("div");
                status.classList.add("activity-meta");
                status.textContent = player.finished ? "Status: Completed" : "Status: Playing";

                details.append(name, status);

                const points = document.createElement("div");
                points.classList.add("player-score");
                points.textContent = `${player.score} pts`;

                item.append(details, points);
                activity.appendChild(item);
            });
        }

        $("dashboardActivityEmpty")?.classList.toggle("hidden", filtered.length > 0);
    } catch (error) {
        container.textContent = error.message;
    }
}

showScreen("welcome");
showLeaderboard();