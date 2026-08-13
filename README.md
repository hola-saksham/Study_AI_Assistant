# 🎓 AI Study Assistant

A beginner-friendly web application that uses **Google's Gemini API** to help students study any topic — instantly generating a simple explanation, key points, a 5-question quiz, and answers.

---

## 📄 Abstract

AI Study Assistant is a lightweight web application designed to help students revise topics quickly using generative AI. A student types in any topic or question, and the app calls Google's Gemini API to generate a simplified explanation, a list of key points, a 5-question multiple-choice quiz, and the correct answers — all displayed in a clean, card-based interface. The project demonstrates how a Python Flask backend can securely integrate a third-party AI API and serve structured, AI-generated educational content to a simple HTML/CSS/JavaScript frontend.

---

## 🎯 Objectives

- Build a working web application that integrates a real-world AI API.
- Help students quickly understand and revise any topic.
- Demonstrate frontend-backend communication using Flask and JavaScript `fetch()`.
- Practice secure API key handling using environment variables.
- Generate structured, exam-ready study material (explanation, key points, quiz, answers).

---

## ✨ Features

- Enter **any topic or question** in plain text.
- AI-generated **simple explanation** (beginner-friendly language).
- **5 key points** for quick revision.
- **5 multiple-choice quiz questions** to self-test.
- **Answer key** hidden behind a "Reveal Answers" button.
- Clean, modern, card-based UI.
- Fully **responsive** — works on desktop and mobile.
- Friendly **error handling** (empty input, API failure, network issues).
- Loading indicator while AI generates content.
- Repeatable — generate material for as many topics as you like, one after another.

---

## 🛠️ Technologies Used

| Layer      | Technology |
|------------|------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript |
| Backend    | Python, Flask |
| AI API     | Google Gemini API (`google-genai` SDK) |
| Config     | `python-dotenv` (`.env` file) |

---

## 📁 Project Structure

```
AI-Study-Assistant/
│
├── app.py                 # Flask backend + Gemini API integration
├── requirements.txt        # Python dependencies
├── .env                     # Stores GEMINI_API_KEY (not committed to GitHub)
├── .gitignore
├── README.md
├── templates/
│   └── index.html          # Main webpage
└── static/
    ├── style.css            # Styling
    └── script.js            # Frontend logic (fetch calls, DOM updates)
```

---

## 🚀 Setup & Run Instructions

### 1. Install Python requirements

Make sure you have **Python 3.9+** installed. Then, inside the project folder, run:

```bash
pip install -r requirements.txt
```

This installs Flask (the web server), `python-dotenv` (to read the `.env` file), and `google-genai` (the official Gemini API SDK).

*(Optional but recommended)* Use a virtual environment first:

```bash
python -m venv venv
venv\Scripts\activate      # Windows
source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

### 2. Create and configure your Gemini API key

1. Go to **[Google AI Studio](https://aistudio.google.com/apikey)**.
2. Sign in with your Google account.
3. Click **"Create API Key"** and copy the generated key.

### 3. Create the `.env` file

In the root of the project, create a file named exactly `.env` (already included as a template) and paste your key:

```
GEMINI_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

⚠️ Never share this file or commit it to GitHub — it's already listed in `.gitignore`.

### 4. Run the Flask application

```bash
python app.py
```

You should see output like:

```
 * Running on http://127.0.0.1:5000
```

### 5. Open it in the browser

Open your browser and go to:

```
http://127.0.0.1:5000
```

Type a topic (e.g. "Photosynthesis" or "What is a linked list?") and click **Generate Study Material**.

---

## 🔍 How It Works

### 6. Frontend ↔ Flask backend communication

- `templates/index.html` renders the page and loads `static/script.js`.
- When the user clicks **Generate Study Material**, `script.js` calls:
  ```js
  fetch("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic })
  })
  ```
- This sends the topic as JSON to the Flask route `/generate`.
- Flask processes it and sends back a JSON response, which JavaScript reads and injects into the page's HTML — no page reload needed.

### 7. Flask backend ↔ Gemini API communication

- `app.py` loads the `GEMINI_API_KEY` from `.env` using `python-dotenv`.
- It creates a Gemini client: `genai.Client(api_key=GEMINI_API_KEY)`.
- For each request, it builds a detailed prompt (see `build_prompt()` in `app.py`) that instructs Gemini to return **only JSON** with `explanation`, `key_points`, `quiz`, and `answers`.
- It calls `client.models.generate_content(model=..., contents=prompt, config=...)` with `response_mime_type="application/json"` to encourage a clean JSON reply.
- The JSON text is parsed with `json.loads()` and validated before being sent back to the frontend.

### 8. How the AI response is displayed

- `script.js` receives the JSON (`explanation`, `key_points`, `quiz`, `answers`).
- It dynamically creates HTML elements (paragraphs, list items, quiz option lists) and inserts them into the four cards: **📚 Explanation**, **📝 Key Points**, **🧠 Quiz**, **✅ Answers**.
- Answers stay hidden until the student clicks **Reveal Answers**, encouraging self-testing first.

### 9. Uploading to GitHub

```bash
cd AI-Study-Assistant
git init
git add .
git commit -m "Initial commit: AI Study Assistant"
git branch -M main
git remote add origin https://github.com/<your-username>/AI-Study-Assistant.git
git push -u origin main
```

✅ Because `.env` is listed in `.gitignore`, your API key will **not** be uploaded to GitHub. Double-check with `git status` before your first commit that `.env` is not staged.

---

## 🔮 Future Improvements

- Save quiz history / scores using a lightweight database (e.g. SQLite).
- Add difficulty levels (Beginner / Intermediate / Advanced).
- Support file/PDF upload so the AI can generate material from notes.
- Add a "download as PDF" option for offline revision.
- Add user accounts to track study progress over time.
- Support multiple languages.

---

## ✅ Advantages

- Saves time creating revision material manually.
- Simple, beginner-friendly tech stack (no database, no complex frameworks).
- Works for any subject or topic instantly.
- Encourages active recall through self-testing (quiz + hidden answers).
- Easy to extend and customize.

---

## ⚠️ Limitations

- Requires an active internet connection and a valid Gemini API key.
- AI-generated content may occasionally contain inaccuracies — always cross-check important facts.
- No persistent storage; generated material is not saved between sessions.
- Free-tier API keys have rate limits, so heavy use may hit quota limits.

---

## 🎤 Viva Questions & Answers

**1. What does this project do?**
It takes a topic or question from the user and uses the Gemini AI API to generate a simple explanation, key points, a 5-question quiz, and answers for studying.

**2. What is Flask, and why did you use it?**
Flask is a lightweight Python web framework. It was used because it's simple, beginner-friendly, and doesn't require complex setup, making it ideal for a small student project.

**3. Why do you store the API key in a `.env` file instead of directly in the code?**
Storing it in `.env` keeps the secret key out of the source code, so it isn't accidentally exposed or uploaded to GitHub. `python-dotenv` loads it securely at runtime.

**4. How does the frontend send data to the backend?**
The JavaScript `fetch()` function sends a POST request with the topic as JSON to the Flask route `/generate`, without reloading the page.

**5. Why did you ask Gemini to return JSON instead of plain text?**
JSON is structured and predictable, so the JavaScript frontend can reliably extract specific fields (`explanation`, `key_points`, `quiz`, `answers`) and display them in the right sections.

**6. What happens if the API call fails?**
The Flask backend catches the error, logs it, and returns a JSON error message. The frontend displays this as a friendly error message to the user instead of crashing.

**7. What is the purpose of `requirements.txt`?**
It lists all Python packages the project depends on (Flask, python-dotenv, google-genai), so anyone can install them with one command: `pip install -r requirements.txt`.

**8. Is this project using any database?**
No. The project intentionally avoids a database to keep things simple — study material is generated fresh each time and not stored.

**9. How is the project responsive on mobile devices?**
CSS media queries adjust padding, font sizes, and layout spacing for smaller screens, and the layout uses flexible widths (`max-width`, `%`) instead of fixed pixel sizes.

**10. What AI model does this project use?**
It uses Google's Gemini API (default model: `gemini-2.5-flash`), accessed through the official `google-genai` Python SDK.

---

## 📜 License

This project is created for academic/educational purposes.
