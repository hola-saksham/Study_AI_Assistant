const topicInput = document.getElementById("topicInput");
const generateBtn = document.getElementById("generateBtn");
const errorBox = document.getElementById("errorBox");
const loader = document.getElementById("loader");
const results = document.getElementById("results");

const explanationText = document.getElementById("explanationText");
const keyPointsList = document.getElementById("keyPointsList");
const quizContainer = document.getElementById("quizContainer");
const answersList = document.getElementById("answersList");
const revealBtn = document.getElementById("revealBtn");


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
    generateBtn.textContent = isLoading
        ? "Generating..."
        : "Generate Study Material";
}


function renderResults(data) {

    // Explanation
    explanationText.textContent = data.explanation;

    // Key points
    keyPointsList.innerHTML = "";

    data.key_points.forEach((point) => {
        const li = document.createElement("li");
        li.textContent = point;
        keyPointsList.appendChild(li);
    });

    // Quiz
    quizContainer.innerHTML = "";

    data.quiz.forEach((q, index) => {

        const qBlock = document.createElement("div");
        qBlock.className = "quiz-question";

        const qTitle = document.createElement("p");
        qTitle.className = "q-title";
        qTitle.textContent = `${index + 1}. ${q.question}`;

        qBlock.appendChild(qTitle);

        const optionsList = document.createElement("ul");
        optionsList.className = "quiz-options";

        Object.entries(q.options).forEach(([letter, text]) => {

    const li = document.createElement("li");
    li.textContent = `${letter}. ${text}`;
    li.className = "quiz-option";

    li.addEventListener("click", () => {

        // Prevent clicking again after answering
        if (optionsList.classList.contains("answered")) {
            return;
        }

        optionsList.classList.add("answered");

        // Get correct answer for this question
        const correctAnswer = data.answers[String(index + 1)];

        if (letter === correctAnswer) {
            li.classList.add("correct");
        } else {
            li.classList.add("wrong");

            // Highlight the correct answer
            const allOptions = optionsList.querySelectorAll(".quiz-option");

            allOptions.forEach((option) => {
                if (option.textContent.startsWith(correctAnswer + ".")) {
                    option.classList.add("correct");
                }
            });
        }
    });

    optionsList.appendChild(li);
});

        qBlock.appendChild(optionsList);
        quizContainer.appendChild(qBlock);
    });

    // Answers
    answersList.innerHTML = "";

    Object.entries(data.answers).forEach(([qNumber, letter]) => {

        const li = document.createElement("li");
        li.textContent = `Question ${qNumber}: ${letter}`;

        answersList.appendChild(li);
    });

    answersList.classList.add("hidden");
    revealBtn.textContent = "Reveal Answers";

    results.classList.remove("hidden");
}


async function generateStudyMaterial() {

    const topic = topicInput.value.trim();

    hideError();
    results.classList.add("hidden");

    if (!topic) {
        showError("Please enter a topic or question before generating.");
        return;
    }

    setButtonLoading(true);
    showLoader();

    try {

        const response = await fetch("/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                topic: topic
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(
                data.error || "Something went wrong. Please try again."
            );
            return;
        }

        renderResults(data);

    } catch (err) {

        console.error(err);

        showError(
            "Could not reach the server. Please check your connection and try again."
        );

    } finally {

        hideLoader();
        setButtonLoading(false);
    }
}


generateBtn.addEventListener(
    "click",
    generateStudyMaterial
);


topicInput.addEventListener("keydown", (e) => {

    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        generateStudyMaterial();
    }

});


revealBtn.addEventListener("click", () => {

    const isHidden =
        answersList.classList.contains("hidden");

    answersList.classList.toggle("hidden");

    revealBtn.textContent =
        isHidden ? "Hide Answers" : "Reveal Answers";
});