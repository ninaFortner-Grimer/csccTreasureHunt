
/* =============================================================
   CSCC Treasure Hunt — Frontend Application
   Connects to the Express backend API.
   ============================================================= */

// ── Configuration ─────────────────────────────────────────────
// Backend address comes from config.js (window.CSCC_API_BASE).
// Falls back to the local backend if config.js is missing.
const API = (window.CSCC_API_BASE || "http://localhost:3000") + "/api";
const TOTAL = 5; // total QR checkpoints

// ── State ──────────────────────────────────────────────────────
let playerName = "";
let token = "";
let score = 0;
let roundsDone = 0; // checkpoints found (score can be lower because of penalties)
let currentQuestion = null;
let busy = false;
let qrScanner = null;
let freezeTimer = null;

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
        const error = new Error(data.error || `Request failed (${response.status})`);
        error.status = response.status;
        throw error;
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

// ── Session Storage ────────────────────────────────────────────
// Keeps the player token across page reloads (refresh, closed tab).
const TOKEN_KEY = "csccPlayerToken";

function saveToken(value) {
    try { localStorage.setItem(TOKEN_KEY, value); } catch {}
}

function loadToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
}

function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
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
    stopFreeze();
    clearToken();
    token = "";
    playerName = "";
    score = 0;
    roundsDone = 0;
    currentQuestion = null;

    if (playerNameInput) playerNameInput.value = "";
    if (progressBar)     progressBar.style.width = "0%";

    message(startError, "");
    showScreen("welcome");
});

$("dashboardToggleWelcome")?.addEventListener("click", openDashboard);
$("dashboardToggleEnd")?.addEventListener("click", openDashboard);

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
        saveToken(token);
        score = 0;
        roundsDone = 0;

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
            roundsDone = TOTAL;
            updateProgress();
            await endGame();
            return;
        }

        score = Number(data.score ?? score);
        roundsDone = Math.max(0, Number(data.round || 1) - 1);
        updateProgress();

        if (data.state === "waiting_scan") {
            if (questionElement) questionElement.textContent = "Challenge solved!";
            message(feedback, "You already answered correctly! Find your checkpoint.", "");
            message(clueText, data.clue || "Find your assigned checkpoint.");
            clueCard?.classList.remove("hidden");
            setBusy(false);
            return;
        }

        if (data.state === "frozen") {
            startFreeze(Number(data.waitSeconds || 30));
            return;
        }

        currentQuestion = data;

        if (questionElement) questionElement.textContent = data.text;

        createAnswerButtons(data.choices || []);
    } catch (error) {
        console.error("[CSCC] loadQuestion error:", error.message);
        message(feedback, error.message, "#f87171");
    } finally {
        setBusy(false);
    }
}

// ── Wrong Answer Freeze ────────────────────────────────────────
// The server refuses answers during the freeze; this only shows the countdown
function startFreeze(seconds) {
    stopFreeze();
    if (answers) answers.innerHTML = "";

    let left = Math.max(1, seconds);
    const tick = () => {
        if (questionElement) questionElement.textContent = `⏳ Next question in ${left}s`;
        left -= 1;
        if (left < 0) {
            stopFreeze();
            loadQuestion();
        }
    };

    tick();
    freezeTimer = window.setInterval(tick, 1000);
}

function stopFreeze() {
    if (freezeTimer) {
        window.clearInterval(freezeTimer);
        freezeTimer = null;
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

            // Wrong answer costs 1 point (never below 0)
            const lostPoint = Number(result.score ?? score) < score;
            score = Number(result.score ?? score);
            updateProgress();

            message(
                feedback,
                lostPoint
                    ? "✗ Incorrect. -1 point. Wait for a new question."
                    : "✗ Incorrect. Wait for a new question.",
                "#f87171"
            );
            currentQuestion = null;

            // Show the wrong answer briefly, then the countdown
            const waitSeconds = Number(result.waitSeconds || 30);
            window.setTimeout(() => startFreeze(waitSeconds - 1), 1000);
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
        try {
            qrScanner.stop().catch(() => {});
        } catch {
            // Scanner was not running (camera blocked or still starting)
        }
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
    const parts = payload.trim().split(":");
    if (parts.length >= 3 && parts[0] === "CSCC") {
        const code = parts[1];
        const secret = parts.slice(2).join(":");
        await submitQrScan(code, secret);
    } else {
        message(qrFeedback, "Invalid QR code. Please scan the correct checkpoint.", "#f87171");
        allowRescan();
    }
}

// After a failed scan the camera is off: show the clue card again
// so its "I FOUND THE QR CODE" button can restart the camera
function allowRescan() {
    clueCard?.classList.remove("hidden");
}

function scanCheckpointManual() {
    if (busy) return;

    const code = window.prompt("Enter checkpoint ID (e.g. QR-01):");
    if (code === null) return;

    const secret = window.prompt("Enter the checkpoint secret:");
    if (secret === null) return;

    // Checkpoint IDs and secrets are uppercase; accept lowercase typing on phones
    submitQrScan(code.trim().toUpperCase(), secret.trim().toUpperCase());
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
        roundsDone = result.finished ? TOTAL : roundsDone + 1;
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
        allowRescan();
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
        progressBar.style.width = `${Math.min((roundsDone / TOTAL) * 100, 100)}%`;
    }

    if (questionNumber) {
        questionNumber.textContent = `${Math.min(roundsDone + 1, TOTAL)} / ${TOTAL}`;
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
                ? `Outstanding! You found all ${TOTAL} checkpoints with a perfect score!`
                : `You found all ${TOTAL} checkpoints and scored ${score} out of ${TOTAL} points.`;
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
        points.textContent = `${player.score} pts${player.isFinished ? " ✓" : ""}`;

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
let organizerToken = "";

async function openDashboard() {
    if (!organizerToken) {
        const password = window.prompt("Organizer password:");
        if (password === null) return;

        try {
            const result = await api("/organizer/login", {
                method: "POST",
                body: JSON.stringify({ password })
            });
            organizerToken = result.token;
        } catch (error) {
            window.alert(error.message);
            return;
        }
    }

    showScreen("dashboard");
    await renderDashboard();
}

async function renderDashboard() {
    const container = $("dashboardLeaderboard");
    if (!container || !organizerToken) return;

    try {
        const data = await api("/organizer/dashboard", {
            headers: { "Authorization": `Bearer ${organizerToken}` }
        });
        const players = data.players || [];
        const query = ($("dashboardSearch")?.value || "").trim().toLowerCase();

        const filtered = players.filter(p =>
            p.name.toLowerCase().includes(query)
        );

        renderRows(container, filtered);

        $("dashboardEmpty")?.classList.toggle("hidden", filtered.length > 0);

        const completed = players.filter(p => p.isFinished).length;

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
                    status.textContent = player.isFinished
                        ? `Completed · ${player.score} pts`
                        : `Playing · ${player.score} pts`;

                    details.append(name, status);

                    const pts = document.createElement("div");
                    pts.classList.add("player-score");
                    pts.textContent = player.isFinished ? "✓ Done" : "In progress";

                    item.append(details, pts);
                    activity.appendChild(item);
                });
            }
        }
    } catch (error) {
        // Organizer session lost (e.g. server restarted): ask for the password again
        if (error.status === 401) {
            organizerToken = "";
            container.textContent = "Session expired. Exit and open Organizer View again.";
            return;
        }
        container.innerHTML = `<div class="empty-state">${error.message}</div>`;
    }
}

// ── Resume Saved Session ───────────────────────────────────────
async function resumeSession() {
    token = loadToken();
    if (!token) return;

    try {
        const player = await api("/player/me");

        playerName = player.name;
        score = Number(player.score || 0);
        roundsDone = Number(player.currentRoundIndex || 0);

        if (displayName) displayName.textContent = playerName;
        updateProgress();

        showScreen("game");
        await loadQuestion();
    } catch (error) {
        console.warn("[CSCC] Could not resume session:", error.message);
        // Forget the token only if the server rejected it (e.g. player deleted)
        if (error.status === 401) clearToken();
        token = "";
        showScreen("welcome");
    }
}

// ── Init ───────────────────────────────────────────────────────
showScreen("welcome");

// Silently pre-warm leaderboard (backend may be offline during dev)
showLeaderboard().catch(() => {});

resumeSession();