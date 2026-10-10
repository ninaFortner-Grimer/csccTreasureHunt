
/* =============================================================
   CSCC Treasure Hunt — Frontend Application
   Connects to the Express backend API.
   ============================================================= */

// ── Configuration ─────────────────────────────────────────────
// In production, replace with your deployed backend URL.
// During local development: http://localhost:3000/api
const API = (window.CSCC_API_BASE || "http://localhost:3000") + "/api";
const TOTAL = 5; // total QR checkpoints

// ── State ──────────────────────────────────────────────────────
let playerName = "";
let token = "";
let score = 0;
let currentQuestion = null;
let busy = false;
let qrScanner = null;

// ── DOM Helpers ────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const welcomeScreen    = $("welcomeScreen");
const nicknameScreen   = $("nicknameScreen");
const gameScreen       = $("gameScreen");
const endScreen        = $("endScreen");
const dashboardScreen  = $("dashboardScreen");

const playerNameInput  = $("playerName");
const startButton      = $("startButton");
const beginButton      = $("beginButton");
const backToLanding    = $("backToLanding");
const startError       = $("startError");
const displayName      = $("displayName");
const scoreDisplay     = $("score");
const questionElement  = $("question");
const answers          = $("answers");
const feedback         = $("feedback");
const questionNumber   = $("questionNumber");
const clueCard         = $("clueCard");
const clueText         = $("clueText");
const findQrButton     = $("findQrButton");
const qrCard           = $("qrCard");
const scanButton       = $("scanButton");
const qrFeedback       = $("qrFeedback");
const nextButton       = $("nextButton");
const progressBar      = $("progressBar");
const finalScore       = $("finalScore");
const finalMessage     = $("finalMessage");
const leaderboard      = $("leaderboard");
const restartButton    = $("restartButton");

// ── API Helper ─────────────────────────────────────────────────
async function api(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) headers["x-player-token"] = token;

    let response;
    try {
        response = await fetch(API + path, { ...options, headers });
    } catch {
        throw new Error("Cannot reach the server. Make sure the backend is running.");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
}

// ── Screen Management ──────────────────────────────────────────
function showScreen(name) {
    [welcomeScreen, nicknameScreen, gameScreen, endScreen, dashboardScreen]
        .forEach(s => s?.classList.remove("active"));

    const map = {
        welcome:   welcomeScreen,
        nickname:  nicknameScreen,
        game:      gameScreen,
        end:       endScreen,
        dashboard: dashboardScreen
    };

    map[name]?.classList.add("active");
}

// ── Utility ────────────────────────────────────────────────────
function message(element, text, color = "") {
    if (!element) return;
    element.textContent = text;
    element.style.color = color || "";
}

function setBusy(value) {
    busy = value;
    if (beginButton) beginButton.disabled = value;
    if (scanButton)  scanButton.disabled  = value;
}

// ── Navigation Listeners ───────────────────────────────────────
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
    // Show scanner UI when player reaches checkpoint card
    startQrScanner();
});

scanButton?.addEventListener("click", event => {
    event.preventDefault();
    // Manual fallback — prompt for code+secret
    scanCheckpointManual();
});

nextButton?.addEventListener("click", async event => {
    event.preventDefault();
    if (busy) return;

    stopQrScanner();
    nextButton.classList.add("hidden");
    await loadQuestion();
});

restartButton?.addEventListener("click", () => {
    stopQrScanner();
    token = "";
    playerName = "";
    score = 0;
    currentQuestion = null;

    if (playerNameInput) playerNameInput.value = "";
    if (progressBar)     progressBar.style.width = "0%";

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

// ── Player Registration ────────────────────────────────────────
async function startGame() {
    if (busy) return;

    const name = (playerNameInput?.value || "").trim();

    // Nickname validation — mirrors backend rule
    const NICKNAME_REGEX = /^[A-Za-z0-9 \-_'.]{2,30}$/;
    if (!NICKNAME_REGEX.test(name)) {
        message(
            startError,
            "Nickname must be 2–30 characters. Allowed: letters, numbers, spaces, hyphens, apostrophes, underscores.",
            "#f87171"
        );
        playerNameInput?.focus();
        return;
    }

    setBusy(true);
    message(startError, "");

    try {
        console.log("[CSCC] Registering player…");
        const player = await api("/player", {
            method: "POST",
            body: JSON.stringify({ name })
        });

        playerName = player.name;
        token = player.token;
        score = 0;

        if (displayName) displayName.textContent = playerName;
        if (scoreDisplay) scoreDisplay.textContent = "0";
        if (progressBar) progressBar.style.width = "0%";

        console.log("[CSCC] Player registered, entering game.");
        showScreen("game");
        await loadQuestion();
    } catch (error) {
        console.error("[CSCC] Registration failed:", error.message);
        showScreen("nickname");
        message(startError, error.message, "#f87171");
    } finally {
        setBusy(false);
    }
}

// ── Game Flow ──────────────────────────────────────────────────
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
            message(feedback, "You already answered correctly! Find your checkpoint.", "");
            message(clueText, data.clue || "Find your assigned checkpoint.");
            clueCard?.classList.remove("hidden");
            setBusy(false);
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
        console.error("[CSCC] loadQuestion error:", error.message);
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
    document.querySelectorAll(".answer-button").forEach(b => { b.disabled = true; });

    try {
        const result = await api("/challenge/answer", {
            method: "POST",
            body: JSON.stringify({ answer })
        });

        if (result.correct) {
            button.classList.add("correct");
            message(feedback, "✓ Correct! Follow the clue to find your checkpoint.", "#4ade80");
            message(clueText, result.clue || "Find your assigned checkpoint.");
            clueCard?.classList.remove("hidden");
        } else {
            button.classList.add("wrong");
            message(feedback, "✗ Incorrect. You'll get a new question.", "#f87171");
            currentQuestion = null;

            window.setTimeout(() => {
                loadQuestion();
            }, 1200);
        }
    } catch (error) {
        console.error("[CSCC] checkAnswer error:", error.message);
        message(feedback, error.message, "#f87171");
        document.querySelectorAll(".answer-button").forEach(b => { b.disabled = false; });
    } finally {
        setBusy(false);
    }
}

// ── QR Scanning ────────────────────────────────────────────────
function startQrScanner() {
    // Check if the library is loaded
    if (typeof Html5Qrcode === "undefined") {
        // Library not available — show manual fallback UI only
        showManualScanFallback();
        return;
    }

    const container = $("qrReaderContainer");
    if (!container) return;

    container.classList.remove("hidden");

    // Don't start a new scanner if one is running
    if (qrScanner) return;

    qrScanner = new Html5Qrcode("qrReader");

    const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
    };

    qrScanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            // QR code scanned — parse and submit
            console.log("[CSCC] QR scanned:", decodedText);
            stopQrScanner();
            handleQrPayload(decodedText);
        },
        (errorMessage) => {
            // Scanning error (normal during scan, not user-facing)
        }
    ).catch(err => {
        console.warn("[CSCC] Camera start failed:", err);
        stopQrScanner();
        showManualScanFallback();
    });
}

function stopQrScanner() {
    if (qrScanner) {
        qrScanner.stop().catch(() => {});
        qrScanner = null;
    }
    const container = $("qrReaderContainer");
    if (container) container.classList.add("hidden");
}

function showManualScanFallback() {
    const fallback = $("manualScanFallback");
    if (fallback) fallback.classList.remove("hidden");
}

async function handleQrPayload(payload) {
    // QR payload format: CSCC:code:secret
    // Example: CSCC:QR-01:CSCC-LAB-7K2P
    const parts = payload.trim().split(":");
    if (parts.length >= 3 && parts[0] === "CSCC") {
        const code = parts[1];
        const secret = parts.slice(2).join(":");
        await submitQrScan(code, secret);
    } else {
        message(qrFeedback, "Invalid QR code. Please scan the correct checkpoint.", "#f87171");
    }
}

function scanCheckpointManual() {
    if (busy) return;

    const code = window.prompt("Enter checkpoint ID (e.g. QR-01):");
    if (code === null) return;

    const secret = window.prompt("Enter the checkpoint secret:");
    if (secret === null) return;

    submitQrScan(code.trim(), secret.trim());
}

async function submitQrScan(code, secret) {
    if (busy) return;

    setBusy(true);
    message(qrFeedback, "Verifying checkpoint…");

    try {
        const result = await api("/qr/scan", {
            method: "POST",
            body: JSON.stringify({ code, secret })
        });

        score = Number(result.score ?? score);
        updateProgress();

        const msg = result.finished
            ? "🎉 All checkpoints found! The hunt is complete!"
            : "✓ Checkpoint accepted! +1 point earned.";

        message(qrFeedback, msg, "#4ade80");
        nextButton?.classList.remove("hidden");

        if (nextButton) {
            nextButton.textContent = result.finished
                ? "VIEW YOUR RESULTS →"
                : "CONTINUE THE HUNT →";
        }

        // Pre-load leaderboard in background
        showLeaderboard().catch(() => {});
    } catch (error) {
        console.error("[CSCC] QR scan error:", error.message);
        message(qrFeedback, error.message, "#f87171");
    } finally {
        setBusy(false);
    }
}

// ── Round Reset ────────────────────────────────────────────────
function resetRound() {
    clueCard?.classList.add("hidden");
    qrCard?.classList.add("hidden");
    nextButton?.classList.add("hidden");
    stopQrScanner();

    const fallback = $("manualScanFallback");
    if (fallback) fallback.classList.add("hidden");

    message(feedback, "");
    message(qrFeedback, "");

    if (answers) answers.innerHTML = "";
}

function updateProgress() {
    if (scoreDisplay) scoreDisplay.textContent = String(score);

    if (progressBar) {
        progressBar.style.width = `${Math.min((score / TOTAL) * 100, 100)}%`;
    }

    if (questionNumber) {
        questionNumber.textContent = `${Math.min(score + 1, TOTAL)} / ${TOTAL}`;
    }
}

// ── End Game ───────────────────────────────────────────────────
async function endGame() {
    showScreen("end");

    if (finalScore) finalScore.textContent = String(score);

    const endName = $("endPlayerName");
    if (endName) endName.textContent = playerName;

    if (finalMessage) {
        finalMessage.textContent =
            score >= TOTAL
                ? `Outstanding! You found all ${TOTAL} checkpoints!`
                : `You completed the hunt with ${score} out of ${TOTAL} checkpoints.`;
    }

    await showLeaderboard();
    await renderDashboard();
}

// ── Leaderboard ────────────────────────────────────────────────
function renderRows(container, players) {
    if (!container) return;

    container.innerHTML = "";

    if (!players.length) {
        container.innerHTML = '<div class="empty-state">No scores yet.</div>';
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
        points.textContent = `${player.score} pts${player.finished ? " ✓" : ""}`;

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
        if (leaderboard) {
            leaderboard.innerHTML = `<div class="empty-state">${error.message}</div>`;
        }
    }
}

// ── Organizer Dashboard ────────────────────────────────────────
async function renderDashboard() {
    const container = $("dashboardLeaderboard");
    if (!container) return;

    try {
        const players = await api("/leaderboard");
        const query = ($("dashboardSearch")?.value || "").trim().toLowerCase();

        const filtered = players.filter(p =>
            p.name.toLowerCase().includes(query)
        );

        renderRows(container, filtered);

        $("dashboardEmpty")?.classList.toggle("hidden", filtered.length > 0);

        const completed = players.filter(p => p.finished).length;

        if ($("statTotal"))     $("statTotal").textContent     = String(players.length);
        if ($("statCompleted")) $("statCompleted").textContent = String(completed);
        if ($("statPlaying"))   $("statPlaying").textContent   = String(players.length - completed);

        const activity = $("dashboardActivity");

        if (activity) {
            activity.innerHTML = "";

            if (filtered.length === 0) {
                $("dashboardActivityEmpty")?.classList.remove("hidden");
            } else {
                $("dashboardActivityEmpty")?.classList.add("hidden");

                filtered.slice(0, 10).forEach(player => {
                    const item = document.createElement("div");
                    item.classList.add("activity-row");

                    const details = document.createElement("div");
                    const name = document.createElement("strong");
                    name.textContent = player.name;

                    const status = document.createElement("div");
                    status.classList.add("activity-meta");
                    status.textContent = player.finished
                        ? `Completed · ${player.score} pts`
                        : `Playing · ${player.score} pts`;

                    details.append(name, status);

                    const pts = document.createElement("div");
                    pts.classList.add("player-score");
                    pts.textContent = player.finished ? "✓ Done" : "In progress";

                    item.append(details, pts);
                    activity.appendChild(item);
                });
            }
        }
    } catch (error) {
        container.innerHTML = `<div class="empty-state">${error.message}</div>`;
    }
}

// ── Init ───────────────────────────────────────────────────────
showScreen("welcome");

// Silently pre-warm leaderboard (backend may be offline during dev)
showLeaderboard().catch(() => {});