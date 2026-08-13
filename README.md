# 🎓 AI Study Assistant & Quiz Platform

An AI-powered web application that turns any topic into a personalized, adaptive quiz — built with **Python Flask** and **Google's Gemini API**. Students enter a topic, choose their quiz settings, and get an instant explanation, key points, an interactive quiz with a timer and progress tracking, a full score dashboard, AI-generated explanations, and weak-topic study recommendations.

---

## 📄 Abstract

AI Study Assistant is a web application that helps students revise and self-test on any topic using generative AI. A student enters a topic, selects a difficulty, question count, question type, and optional timer, and the app calls Google's Gemini API to generate a simplified explanation, key points, and a structured quiz. The student takes the quiz question-by-question with a live progress bar and optional countdown timer, then receives a detailed score dashboard with per-question explanations and an AI-generated analysis of their weak topics with study recommendations. The project demonstrates a full AI-integrated web application: prompt engineering for structured JSON output, stateful frontend quiz logic, and browser-based persistence — all without requiring a database.

---

## 🎯 Objectives

- Build a working, AI-powered personalized quiz platform from an existing AI integration.
- Demonstrate structured prompt engineering (forcing reliable JSON output from an LLM).
- Practice secure API key handling using environment variables.
- Implement client-side state management for a multi-screen quiz flow (setup → study → quiz → results).
- Use AI not just to generate content, but to *analyze* a student's performance and recommend next steps.

---

## ✨ Features

- **Personalized quiz setup** — topic (with clickable topic suggestions), difficulty (Easy/Medium/Hard/Mixed), number of questions (5/10/15/20), question type (Multiple Choice / True-False / Mixed), and an optional timer (5/10/15 min or none).
- **AI-generated study material** — a beginner-friendly explanation and 5 key points before the quiz starts.
- **Question-by-question quiz screen** — live progress bar (`Question 4 of 10`), Previous / Next / Skip / Submit navigation.
- **Countdown timer with auto-submit** — if you run out of time, the quiz submits itself and scores whatever was answered.
- **Full score dashboard** — score, correct/incorrect counts, accuracy %, and time taken.
- **Per-question review** — your answer vs. the correct answer, clearly marked ✅/❌, with an AI-written explanation for every question.
- **AI weak-topic analysis** — after submitting, a second AI call analyzes your incorrect answers' sub-topics and gives a short, encouraging study recommendation.
- **Regenerate question** — don't like a question? Swap it out for a fresh AI-generated one without losing quiz progress.
- **Quiz history** — every completed quiz (topic, difficulty, score, accuracy, date) is saved locally in the browser via `localStorage` — no database required.
- **Robust error handling** — empty input, invalid AI output, missing API key, timeouts, rate limits/quota errors, and network failures are all caught and shown as friendly messages instead of crashing the app.
- Clean, card-based, fully **responsive** UI (desktop, tablet, mobile).

---

## 🛠️ Technologies Used

| Layer      | Technology |
|------------|------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript (no frameworks) |
| Backend    | Python, Flask |
| AI API     | Google Gemini API (`google-genai` SDK) |
| Persistence| Browser `localStorage` (quiz history) — no database |
| Config     | `python-dotenv` (`.env` file) |

---

## 📁 Project Structure

```
AI-Study-Assistant/
│
├── app.py                  # Flask backend + Gemini API integration (3 routes)
├── requirements.txt        # Python dependencies
├── .env                     # Stores GEMINI_API_KEY (never committed)
├── .gitignore
├── README.md
├── templates/
│   └── index.html          # Setup panel, study card, quiz screen, results dashboard
└── static/
    ├── style.css            # All styling (setup panel, quiz UI, dashboard, history table)
    └── script.js            # Frontend state machine: setup -> study -> quiz -> results
```

---

## 🚀 Setup & Run Instructions

### 1. Install Python requirements

Requires **Python 3.9+**.

```bash
pip install -r requirements.txt
```

*(Optional but recommended)* Use a virtual environment first:

```bash
python -m venv venv
venv\Scripts\activate      # Windows
source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

### 2. Get a Gemini API key

1. Go to **[Google AI Studio](https://aistudio.google.com/apikey)**.
2. Sign in and click **"Create API Key"**.

### 3. Create your `.env` file

In the project root, create a file named `.env`:

```
GEMINI_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

⚠️ Never share this file or commit it — it's already listed in `.gitignore`.

### 4. Run the app

```bash
python app.py
```

Then open **http://127.0.0.1:5000** in your browser.

---

## 🔍 How It Works

### Application flow

1. **Setup** — student enters a topic (or clicks a suggestion chip) and picks difficulty/count/type/timer, then clicks **Generate Quiz**.
2. **Study Card** — the AI-generated explanation and key points display; clicking **Start Quiz** begins the quiz.
3. **Quiz Screen** — one question at a time, with a progress bar and (if selected) a live countdown timer. Students can go Previous/Next/Skip, or regenerate a question they don't like.
4. **Submit** — either manually or automatically (timer expiry). The frontend scores the quiz against each question's `correct_answer`.
5. **Results Dashboard** — score summary, then a full per-question review with explanations, followed by an AI-generated weak-topic analysis and study recommendation.
6. **History** — the completed quiz is saved to `localStorage` and shown in the Quiz History table.

### Backend routes (`app.py`)

| Route | Purpose |
|---|---|
| `POST /generate` | Builds a difficulty/count/type-aware prompt, calls Gemini, returns `explanation`, `key_points`, and a `quiz` array where each question carries its own `type`, `options`, `correct_answer`, `explanation`, and `topic_tag`. |
| `POST /regenerate-question` | Generates one replacement question, avoiding repeats of the existing quiz. |
| `POST /analyze` | Takes the student's incorrect answers' sub-topics and returns `weak_areas` + a `recommendation`. |

All three routes validate their inputs server-side, request JSON output from Gemini (`response_mime_type="application/json"`), strip any accidental markdown fences, and catch quota/timeout/network/malformed-JSON errors with specific, friendly messages instead of crashing.

### Why no database?

Quiz history only needs to persist per-browser, and the data (topic, score, accuracy, date) is simple and small. `localStorage` avoids the extra complexity of SQLAlchemy/SQLite setup for what's fundamentally a lightweight academic project — but see *Future Improvements* below for how this could be upgraded.

---

## 📤 Uploading to GitHub

```bash
cd AI-Study-Assistant
git init
git add .
git commit -m "Initial commit: AI Study Assistant & Quiz Platform"
git branch -M main
git remote add origin https://github.com/<your-username>/AI-Study-Assistant.git
git push -u origin main
```

Before your first commit, run `git status` and confirm `.env` is **not** in the list of staged files.

### ⚠️ Never upload these to GitHub:
- `.env` (contains your real `GEMINI_API_KEY`)
- Any file containing an actual API key, hardcoded or otherwise
- `venv/` or `__pycache__/` (already in `.gitignore`)
- Any personal data exported from testing (not applicable here, since history is client-side only)

---

## 🔮 Future Improvements

- Move quiz history from `localStorage` to a proper SQLite database with a `sqlite3`/`Flask-SQLAlchemy` backend, enabling cross-device history and user accounts.
- Add Fill-in-the-Blank as a third question type (currently Multiple Choice + True/False).
- Support PDF/notes upload so the AI generates quizzes from a student's own material.
- Add a "download results as PDF" option.
- Add user authentication so history is tied to an account rather than a browser.
- Support multiple languages.

---

## ✅ Advantages

- Fully personalized quizzes — difficulty, length, and type are all student-controlled.
- No database required, so setup stays simple for an academic project.
- Encourages active recall and self-correction via immediate, explained feedback.
- The weak-topic analysis turns a static quiz into an actual study *tool*, not just a test.

## ⚠️ Limitations

- Requires an active internet connection and a valid Gemini API key.
- AI-generated content may occasionally contain inaccuracies — always cross-check important facts.
- Quiz history is stored per-browser (`localStorage`), not synced across devices.
- Free-tier API keys have rate limits; heavy use may hit quota (the app now shows a specific message when this happens).

---

## 🎤 Viva Questions & Answers

**1. What does this project do?**
It generates a personalized quiz from any topic using the Gemini AI API — with configurable difficulty, length, and question type — then scores the student, explains every answer, and analyzes their weak topics.

**2. Why did you redesign the JSON schema between versions?**
Originally, answers lived in a separate object keyed by question number. To support mixed question types, per-question explanations, and topic tagging for weak-area analysis, each question now carries its own `type`, `correct_answer`, `explanation`, and `topic_tag` — a single self-contained object per question.

**3. How does the timer's auto-submit work?**
`setInterval` in `script.js` decrements a `timeRemainingSeconds` counter every second; when it hits zero, it calls the same `submitQuiz()` function the Submit button uses, passing a flag that shows a "time's up" note.

**4. How does weak-topic analysis work?**
After scoring, the frontend collects the `topic_tag` and question text of every question answered incorrectly and sends them to the `/analyze` route, which asks Gemini to identify recurring weak sub-topics and generate a study recommendation.

**5. Why use `localStorage` instead of a database for quiz history?**
The history data is simple, small, and only needs to persist in the same browser — a full database would add setup complexity (SQLAlchemy models, migrations) without meaningful benefit at this scale.

**6. How does "Regenerate Question" avoid duplicate questions?**
The frontend sends the text of all current quiz questions to `/regenerate-question`; the prompt explicitly instructs the AI not to repeat or closely resemble any of them.

**7. What happens if the Gemini API hits a rate limit?**
The backend inspects the exception message for quota/rate-limit indicators and returns a specific 429 response with a friendly message, instead of a generic error — the frontend displays this directly to the student.

**8. What happens if the AI returns fewer questions than requested?**
The backend detects this and adds a `warning` field to the response instead of failing; the frontend shows it as a non-blocking notice.

**9. How is the project responsive on mobile?**
CSS media queries adjust the settings grid, navigation buttons, history table, and timer layout at `600px` and `480px` breakpoints, using flexible widths instead of fixed pixel sizing.

**10. What AI model does this project use?**
Google's Gemini API (default: `gemini-2.5-flash`), accessed via the official `google-genai` Python SDK, with `response_mime_type="application/json"` to encourage structured output.

---

## 📜 License

This project is created for academic/educational purposes.