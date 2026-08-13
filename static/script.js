// ===== Setup panel elements =====
const topicInput = document.getElementById("topicInput");
const generateBtn = document.getElementById("generateBtn");
const errorBox = document.getElementById("errorBox");
const loader = document.getElementById("loader");
const topicChips = document.getElementById("topicChips");
const difficultySelect = document.getElementById("difficultySelect");
const countSelect = document.getElementById("countSelect");
const typeSelect = document.getElementById("typeSelect");
const timerSelect = document.getElementById("timerSelect");
const quizSetup = document.getElementById("quizSetup");

// ===== Study card elements =====
const studyCard = document.getElementById("studyCard");
const explanationText = document.getElementById("explanationText");
const keyPointsList = document.getElementById("keyPointsList");
const startQuizBtn = document.getElementById("startQuizBtn");

// ===== Quiz-taking elements =====
const quizTaking = document.getElementById("quizTaking");
const timerDisplay = document.getElementById("timerDisplay");
const timerText = document.getElementById("timerText");
const progressText = document.getElementById("progressText");
const progressBarFill = document.getElementById("progressBarFill");
const activeQuestionText = document.getElementById("activeQuestionText");
const activeOptionsList = document.getElementById("activeOptionsList");
const prevBtn = document.getElementById("prevBtn");
const skipBtn = document.getElementById("skipBtn");
const nextBtn = document.getElementById("nextBtn");
const submitQuizBtn = document.getElementById("submitQuizBtn");
const regenerateBtn = document.getElementById("regenerateBtn");
const regenerateError = document.getElementById("regenerateError");
const historyEmpty = document.getElementById("historyEmpty");
const historyTable = document.getElementById("historyTable");
const historyBody = document.getElementById("historyBody");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const HISTORY_KEY = "aiStudyAssistant_quizHistory";

// ===== Results elements =====
const results = document.getElementById("results");
const resultsSummaryText = document.getElementById("resultsSummaryText");
const restartBtn = document.getElementById("restartBtn");
const reviewList = document.getElementById("reviewList");
const analysisCard = document.getElementById("analysisCard");
const analysisLoader = document.getElementById("analysisLoader");
const analysisContent = document.getElementById("analysisContent");
const analysisError = document.getElementById("analysisError");
const weakAreasList = document.getElementById("weakAreasList");
const recommendationText = document.getElementById("recommendationText");

// ===== State =====
let currentQuizData = null;   // full { explanation, key_points, quiz: [...] } from /generate
let currentSettings = null;   // { topic, difficulty, num_questions, question_type, timer_minutes }
let userAnswers = [];         // array of selected letter (or null) per question, aligned by index
let currentQuestionIndex = 0;
let timerInterval = null;
let timeRemainingSeconds = 0;
let quizStartTime = null;


function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
}

function hideError() {
    errorBox.classList.add("hidden");
    errorBox.textContent = "";
}

function showLoader() {
    loader.classList.remove("hidden");
}

function hideLoader() {
    loader.classList.add("hidden");
}

function setButtonLoading(isLoading) {
    generateBtn.disabled = isLoading;
    generateBtn.textContent = isLoading ? "Generating..." : "Generate Quiz 🚀";
}


// ===== Topic suggestion chips =====
topicChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    topicInput.value = chip.dataset.topic;
    topicInput.focus();
});


// ===== STEP A: Generate quiz + study material =====
async function generateStudyMaterial() {

    const topic = topicInput.value.trim();

    hideError();
    studyCard.classList.add("hidden");
    quizTaking.classList.add("hidden");
    results.classList.add("hidden");

    if (!topic) {
        showError("Please enter a topic or question before generating.");
        return;
    }

    currentSettings = {
        topic: topic,
        difficulty: difficultySelect.value,
        num_questions: parseInt(countSelect.value, 10),
        question_type: typeSelect.value,
        timer_minutes: parseInt(timerSelect.value, 10)
    };

    setButtonLoading(true);
    showLoader();

    try {
        const response = await fetch("/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                topic: currentSettings.topic,
                difficulty: currentSettings.difficulty,
                num_questions: currentSettings.num_questions,
                question_type: currentSettings.question_type
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.error || "Something went wrong. Please try again.");
            return;
        }

        currentQuizData = data;
        renderStudyCard(data);

        if (data.warning) {
            showError(data.warning);
        }

    } catch (err) {
        console.error(err);
        showError("Could not reach the server. Please check your connection and try again.");
    } finally {
        hideLoader();
        setButtonLoading(false);
    }
}


function renderStudyCard(data) {
    explanationText.textContent = data.explanation;

    keyPointsList.innerHTML = "";
    data.key_points.forEach((point) => {
        const li = document.createElement("li");
        li.textContent = point;
        keyPointsList.appendChild(li);
    });

    studyCard.classList.remove("hidden");
}


// ===== STEP B: Start the quiz-taking flow =====
function startQuiz() {
    if (!currentQuizData || !currentQuizData.quiz || currentQuizData.quiz.length === 0) {
        showError("No quiz questions available. Please generate a quiz first.");
        return;
    }

    userAnswers = new Array(currentQuizData.quiz.length).fill(null);
    currentQuestionIndex = 0;
    quizStartTime = Date.now();

    studyCard.classList.add("hidden");
    quizSetup.classList.add("hidden");
    quizTaking.classList.remove("hidden");

    renderActiveQuestion();
    setupTimer();
}


function setupTimer() {
    clearInterval(timerInterval);
    timerInterval = null;

    if (!currentSettings || currentSettings.timer_minutes <= 0) {
        timerDisplay.classList.add("hidden");
        return;
    }

    timeRemainingSeconds = currentSettings.timer_minutes * 60;
    timerDisplay.classList.remove("hidden");
    updateTimerText();

    timerInterval = setInterval(() => {
        timeRemainingSeconds -= 1;
        updateTimerText();

        if (timeRemainingSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            submitQuiz(true); // auto-submit when time runs out
        }
    }, 1000);
}


function updateTimerText() {
    const mins = Math.max(0, Math.floor(timeRemainingSeconds / 60));
    const secs = Math.max(0, timeRemainingSeconds % 60);
    timerText.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    // Visual warning under 30 seconds
    if (timeRemainingSeconds <= 30) {
        timerDisplay.classList.add("timer-urgent");
    } else {
        timerDisplay.classList.remove("timer-urgent");
    }
}


// ===== Render the currently active question =====
function renderActiveQuestion() {
    const total = currentQuizData.quiz.length;
    const q = currentQuizData.quiz[currentQuestionIndex];

    // Progress bar + text
    progressText.textContent = `Question ${currentQuestionIndex + 1} of ${total}`;
    const percent = Math.round(((currentQuestionIndex + 1) / total) * 100);
    progressBarFill.style.width = `${percent}%`;

    // Question + options
    activeQuestionText.textContent = q.question;
    activeOptionsList.innerHTML = "";

    Object.entries(q.options).forEach(([letter, text]) => {
        const li = document.createElement("li");
        li.textContent = `${letter}. ${text}`;
        li.className = "quiz-option";

        if (userAnswers[currentQuestionIndex] === letter) {
            li.classList.add("selected");
        }

        li.addEventListener("click", () => {
            userAnswers[currentQuestionIndex] = letter;
            renderActiveQuestion(); // re-render to update selected highlight
        });

        activeOptionsList.appendChild(li);
    });

    // Nav button states
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.textContent = currentQuestionIndex === total - 1 ? "Next →" : "Next →";
    nextBtn.disabled = currentQuestionIndex === total - 1;
    skipBtn.disabled = currentQuestionIndex === total - 1;

    regenerateError.classList.add("hidden");
    regenerateBtn.disabled = false;
    regenerateBtn.textContent = "🔄 Generate Another Question";
}


// ===== Regenerate the current question (Step 6) =====
async function regenerateCurrentQuestion() {
    const q = currentQuizData.quiz[currentQuestionIndex];

    regenerateBtn.disabled = true;
    regenerateBtn.textContent = "Generating replacement...";
    regenerateError.classList.add("hidden");

    // Build a short list of existing question texts so the AI avoids repeats
    const existingQuestions = currentQuizData.quiz.map((item) => item.question);

    try {
        const response = await fetch("/regenerate-question", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                topic: currentSettings.topic,
                difficulty: currentSettings.difficulty,
                question_type: q.type === "true_false" ? "true_false" : "multiple_choice",
                existing_questions: existingQuestions
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not generate a replacement question.");
        }

        // Keep the same id/position, swap in the new question content
        data.id = q.id;
        currentQuizData.quiz[currentQuestionIndex] = data;
        userAnswers[currentQuestionIndex] = null; // reset answer since it's a new question

        renderActiveQuestion();

    } catch (err) {
        console.error(err);
        regenerateBtn.disabled = false;
        regenerateBtn.textContent = "🔄 Generate Another Question";
        regenerateError.textContent = "Could not generate a replacement question. Please try again.";
        regenerateError.classList.remove("hidden");
    }
}


function goToPrevious() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex -= 1;
        renderActiveQuestion();
    }
}

function goToNext() {
    const total = currentQuizData.quiz.length;
    if (currentQuestionIndex < total - 1) {
        currentQuestionIndex += 1;
        renderActiveQuestion();
    }
}

function skipQuestion() {
    // Skipping clears any selected answer for this question, then moves on
    userAnswers[currentQuestionIndex] = null;
    goToNext();
}


// ===== STEP C: Submit + score =====
function submitQuiz(isAutoSubmit) {
    clearInterval(timerInterval);
    timerInterval = null;

    const quiz = currentQuizData.quiz;
    let correctCount = 0;

    quiz.forEach((q, index) => {
        if (userAnswers[index] === q.correct_answer) {
            correctCount += 1;
        }
    });

    const total = quiz.length;
    const incorrectCount = total - correctCount;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const timeTakenSeconds = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 0;
    const mins = Math.floor(timeTakenSeconds / 60);
    const secs = timeTakenSeconds % 60;

    quizTaking.classList.add("hidden");
    timerDisplay.classList.add("hidden");

    const autoNote = isAutoSubmit ? "⏱ Time's up! Your quiz was submitted automatically.<br>" : "";

    resultsSummaryText.innerHTML =
        `${autoNote}` +
        `Score: <strong>${correctCount} / ${total}</strong><br>` +
        `Correct Answers: <strong>${correctCount}</strong><br>` +
        `Incorrect Answers: <strong>${incorrectCount}</strong><br>` +
        `Accuracy: <strong>${accuracy}%</strong><br>` +
        `Time Taken: <strong>${mins}m ${secs}s</strong>`;

    renderReviewList(quiz, userAnswers);

    saveQuizToHistory(currentSettings.topic, currentSettings.difficulty, correctCount, total, accuracy);

    results.classList.remove("hidden");

    analyzeWeakTopics(quiz, userAnswers);
}


// ===== Quiz History via localStorage (Step 7) =====
function loadHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (err) {
        console.error("Could not read quiz history:", err);
        return [];
    }
}

function saveQuizToHistory(topic, difficulty, correctCount, total, accuracy) {
    try {
        const history = loadHistory();
        history.unshift({
            topic: topic,
            difficulty: difficulty,
            score: `${correctCount}/${total}`,
            accuracy: `${accuracy}%`,
            date: new Date().toLocaleDateString()
        });
        // Keep only the most recent 20 entries so localStorage doesn't grow unbounded
        const trimmed = history.slice(0, 20);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
        renderHistory();
    } catch (err) {
        console.error("Could not save quiz history:", err);
        // Non-critical — quiz results still display fine even if history fails to save
    }
}

function renderHistory() {
    const history = loadHistory();

    if (history.length === 0) {
        historyEmpty.classList.remove("hidden");
        historyTable.classList.add("hidden");
        return;
    }

    historyEmpty.classList.add("hidden");
    historyTable.classList.remove("hidden");

    historyBody.innerHTML = "";
    history.forEach((entry) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${entry.topic}</td>
            <td>${entry.difficulty}</td>
            <td>${entry.score}</td>
            <td>${entry.accuracy}</td>
            <td>${entry.date}</td>
        `;
        historyBody.appendChild(row);
    });
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
}


// ===== AI Weak-Topic Analysis (Step 5) =====
async function analyzeWeakTopics(quiz, answers) {
    analysisCard.classList.remove("hidden");
    analysisContent.classList.add("hidden");
    analysisError.classList.add("hidden");
    analysisLoader.classList.remove("hidden");

    const wrongQuestions = quiz
        .map((q, index) => ({ q, index }))
        .filter(({ q, index }) => answers[index] !== q.correct_answer)
        .map(({ q }) => ({
            topic_tag: q.topic_tag || "General",
            question: q.question
        }));

    // Nothing wrong -> skip the API call, just show a congratulatory message.
    if (wrongQuestions.length === 0) {
        analysisLoader.classList.add("hidden");
        analysisContent.classList.remove("hidden");
        weakAreasList.innerHTML = "<li>None — great job!</li>";
        recommendationText.textContent = "You answered everything correctly. Consider trying a harder difficulty next time!";
        return;
    }

    try {
        const response = await fetch("/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                topic: currentSettings.topic,
                wrong_questions: wrongQuestions
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Analysis failed.");
        }

        analysisLoader.classList.add("hidden");
        analysisContent.classList.remove("hidden");

        weakAreasList.innerHTML = "";
        if (data.weak_areas && data.weak_areas.length > 0) {
            data.weak_areas.forEach((area) => {
                const li = document.createElement("li");
                li.textContent = area;
                weakAreasList.appendChild(li);
            });
        } else {
            weakAreasList.innerHTML = "<li>No specific weak areas identified.</li>";
        }

        recommendationText.textContent = data.recommendation || "";

    } catch (err) {
        console.error(err);
        analysisLoader.classList.add("hidden");
        analysisError.textContent = "Could not analyze weak areas right now. Your score and review are still valid above.";
        analysisError.classList.remove("hidden");
    }
}


// ===== Detailed per-question review (Step 4) =====
function renderReviewList(quiz, answers) {
    reviewList.innerHTML = "";

    quiz.forEach((q, index) => {
        const userLetter = answers[index]; // may be null if skipped/unanswered
        const isCorrect = userLetter === q.correct_answer;

        const block = document.createElement("div");
        block.className = "review-item " + (isCorrect ? "review-correct" : "review-incorrect");

        const title = document.createElement("p");
        title.className = "q-title";
        title.textContent = `${index + 1}. ${q.question}`;
        block.appendChild(title);

        const userAnswerText = userLetter
            ? `${userLetter}. ${q.options[userLetter] || ""}`
            : "No answer given";
        const correctAnswerText = `${q.correct_answer}. ${q.options[q.correct_answer] || ""}`;

        const badge = document.createElement("p");
        badge.className = "review-badge";
        badge.textContent = isCorrect ? "✅ Correct" : "❌ Incorrect";
        block.appendChild(badge);

        const userLine = document.createElement("p");
        userLine.className = "review-line";
        userLine.innerHTML = `<strong>Your answer:</strong> ${userAnswerText}`;
        block.appendChild(userLine);

        if (!isCorrect) {
            const correctLine = document.createElement("p");
            correctLine.className = "review-line";
            correctLine.innerHTML = `<strong>Correct answer:</strong> ${correctAnswerText}`;
            block.appendChild(correctLine);
        }

        if (q.explanation) {
            const explanationLine = document.createElement("p");
            explanationLine.className = "review-explanation";
            explanationLine.innerHTML = `<strong>Explanation:</strong> ${q.explanation}`;
            block.appendChild(explanationLine);
        }

        reviewList.appendChild(block);
    });
}


function restartFlow() {
    results.classList.add("hidden");
    quizSetup.classList.remove("hidden");
    studyCard.classList.add("hidden");
    quizTaking.classList.add("hidden");
    hideError();
}


// ===== Event listeners =====
generateBtn.addEventListener("click", generateStudyMaterial);

topicInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        generateStudyMaterial();
    }
});

startQuizBtn.addEventListener("click", startQuiz);
prevBtn.addEventListener("click", goToPrevious);
nextBtn.addEventListener("click", goToNext);
skipBtn.addEventListener("click", skipQuestion);
submitQuizBtn.addEventListener("click", () => submitQuiz(false));
regenerateBtn.addEventListener("click", regenerateCurrentQuestion);
restartBtn.addEventListener("click", restartFlow);
clearHistoryBtn.addEventListener("click", clearHistory);

// Show any saved quiz history as soon as the page loads
renderHistory();