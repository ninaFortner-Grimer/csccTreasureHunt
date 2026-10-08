// CSCC treasure hunt

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


let playerName = "";
let score = 0;
let currentQuestion = null;
let currentQuestionIndex = 0;
let usedQuestions = [];

const totalQuestions = questions.length;

const welcomeScreen = document.getElementById("welcomeScreen");
const gameScreen = document.getElementById("gameScreen");
const endScreen = document.getElementById("endScreen");

const playerNameInput = document.getElementById("playerName");
const startButton = document.getElementById("startButton");
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


startButton.addEventListener("click", startGame);

function startGame() {

    const name = playerNameInput.value.trim();

    if (name === "") {
        startError.textContent = "Enter a nickname first.";
        return;
    }

    playerName = name;
    score = 0;
    currentQuestionIndex = 0;
    usedQuestions = [];

    displayName.textContent = playerName;
    scoreDisplay.textContent = score;
    startError.textContent = "";

    welcomeScreen.classList.add("hidden");
    endScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    loadQuestion();
}


function loadQuestion() {

    resetRound();

    if (usedQuestions.length >= questions.length) {
        endGame();
        return;
    }

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

    shuffledAnswers.forEach(function(answer) {

        const button = document.createElement("button");

        button.textContent = answer;
        button.classList.add("answer-button");

        button.addEventListener("click", function() {
            checkAnswer(answer, button);
        });

        answersContainer.appendChild(button);
    });
}


function checkAnswer(answer, clickedButton) {

    const answerButtons =
        document.querySelectorAll(".answer-button");

    answerButtons.forEach(function(button) {
        button.disabled = true;
    });

    if (answer === currentQuestion.correct) {

        clickedButton.classList.add("correct");

        feedback.textContent =
            "Correct. Your path continues.";

        feedback.style.color = "#4ade80";

        showClue();

        return;
    }

    clickedButton.classList.add("wrong");

    feedback.textContent =
        "Wrong path. Get ready for another challenge.";

    feedback.style.color = "#f87171";

    setTimeout(function() {
        loadQuestion();
    }, 1200);
}


function showClue() {

    clueText.textContent = currentQuestion.clue;

    clueCard.classList.remove("hidden");
}


findQrButton.addEventListener("click", function() {

    clueCard.classList.add("hidden");
    qrCard.classList.remove("hidden");

    qrFeedback.textContent = "";
});


scanButton.addEventListener("click", function() {

    const checkpoint = currentQuestion.qr;

    qrFeedback.textContent =
        "Checkpoint " + checkpoint + " discovered. +1 honor.";

    qrFeedback.style.color = "#4ade80";

    score++;

    scoreDisplay.textContent = score;

    scanButton.disabled = true;

    nextButton.classList.remove("hidden");
});


nextButton.addEventListener("click", function() {

    if (currentQuestionIndex >= totalQuestions) {
        endGame();
        return;
    }

    loadQuestion();
});


function resetRound() {

    clueCard.classList.add("hidden");
    qrCard.classList.add("hidden");
    nextButton.classList.add("hidden");

    feedback.textContent = "";
    qrFeedback.textContent = "";

    scanButton.disabled = false;

    answersContainer.innerHTML = "";
}


function updateProgress() {

    const progress =
        (currentQuestionIndex / totalQuestions) * 100;

    progressBar.style.width = progress + "%";
}


function endGame() {

    gameScreen.classList.add("hidden");
    endScreen.classList.remove("hidden");

    finalScore.textContent = score;

    finalMessage.textContent =
        playerName + ", your hunt is complete.";

    saveScore();
    showLeaderboard();
}


function saveScore() {

    const oldScores =
        JSON.parse(localStorage.getItem("csccScores")) || [];

    oldScores.push({
        name: playerName,
        score: score
    });

    oldScores.sort(function(a, b) {
        return b.score - a.score;
    });

    localStorage.setItem(
        "csccScores",
        JSON.stringify(oldScores)
    );
}


function showLeaderboard() {

    const scores =
        JSON.parse(localStorage.getItem("csccScores")) || [];

    leaderboard.innerHTML = "";

    scores.slice(0, 10).forEach(function(player, index) {

        const row = document.createElement("div");

        row.classList.add("leaderboard-row");

        row.innerHTML = `
            <div>
                <span class="player-place">
                    #${index + 1}
                </span>

                <strong>
                    ${player.name}
                </strong>
            </div>

            <span class="player-score">
                ${player.score} pts
            </span>
        `;

        leaderboard.appendChild(row);
    });
}


restartButton.addEventListener("click", function() {

    playerNameInput.value = "";

    endScreen.classList.add("hidden");
    welcomeScreen.classList.remove("hidden");

    progressBar.style.width = "0%";
});


function shuffleArray(array) {

    for (let i = array.length - 1; i > 0; i--) {

        const randomIndex =
            Math.floor(Math.random() * (i + 1));

        [array[i], array[randomIndex]] =
            [array[randomIndex], array[i]];
    }
}