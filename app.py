"""
AI Study Assistant - Flask Backend
-----------------------------------
This file is the "brain" of the web app. It does 3 things:
1. Serves the HTML page (frontend) to the browser.
2. Receives the topic/question typed by the student (via a POST request).
3. Sends that topic to the Google Gemini API with a carefully written prompt,
   asks Gemini to reply in JSON, and sends that JSON back to the frontend.

IPO structure used in this file:
   INPUT   -> topic/question typed by the user (from the browser)
   PROCESS -> build prompt, call Gemini API, parse JSON response
   OUTPUT  -> structured JSON (explanation, key_points, quiz, answers)
"""

import os
import json
import re

from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# 1. LOAD ENVIRONMENT VARIABLES
# ---------------------------------------------------------------------------
# load_dotenv() reads the .env file and makes GEMINI_API_KEY available
# through os.environ / os.getenv(). This keeps the secret key OUT of the code.
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

if not GEMINI_API_KEY:
    # We don't crash immediately so the app can still start and show a
    # friendly error in the browser, but we print a clear warning.
    print("WARNING: GEMINI_API_KEY not found. Create a .env file (see README).")

# ---------------------------------------------------------------------------
# 2. CREATE THE GEMINI CLIENT
# ---------------------------------------------------------------------------
# The client object is what we use to talk to Google's servers.
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# ---------------------------------------------------------------------------
# 3. CREATE THE FLASK APP
# ---------------------------------------------------------------------------
app = Flask(__name__)


# ---------------------------------------------------------------------------
# 4. THE SYSTEM/USER PROMPT SENT TO GEMINI
# ---------------------------------------------------------------------------
# This prompt tells Gemini EXACTLY what shape of JSON we want back, so that
# the frontend JavaScript can reliably read it and build the cards.
def build_prompt(topic: str) -> str:
    return f"""
You are an expert, friendly teacher creating study material for a college student.

The student's topic or question is:
\"\"\"{topic}\"\"\"

Create study material and return ONLY valid JSON (no markdown, no code fences,
no extra commentary before or after) with EXACTLY this structure:

{{
  "explanation": "A clear, simple explanation of the topic in 4-6 sentences, written for a beginner student.",
  "key_points": ["Key point 1", "Key point 2", "Key point 3", "Key point 4", "Key point 5"],
  "quiz": [
    {{
      "question": "Question text here",
      "options": {{"A": "option text", "B": "option text", "C": "option text", "D": "option text"}}
    }}
  ],
  "answers": {{"1": "A", "2": "B", "3": "C", "4": "D", "5": "A"}}
}}

Rules:
- "quiz" must contain EXACTLY 5 multiple-choice questions, each with 4 options (A, B, C, D).
- "answers" must map question number ("1" to "5") to the correct option letter.
- Keep language simple and educational, suitable for exam revision.
- Do not wrap the JSON in ```json or any other formatting. Return raw JSON only.
"""


# ---------------------------------------------------------------------------
# 5. HELPER: SAFELY EXTRACT JSON FROM THE MODEL'S REPLY
# ---------------------------------------------------------------------------
def extract_json(raw_text: str) -> dict:
    """
    Gemini is asked to return pure JSON, but sometimes models still wrap
    output in ```json ... ``` code fences. This function strips that out
    and safely parses the JSON so the app doesn't crash.
    """
    text = raw_text.strip()

    # Remove markdown code fences if present
    text = re.sub(r"^```(json)?", "", text.strip(), flags=re.IGNORECASE).strip()
    text = re.sub(r"```$", "", text.strip()).strip()

    return json.loads(text)


# ---------------------------------------------------------------------------
# 6. ROUTES
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    """Serves the main HTML page (the frontend)."""
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate():
    print("🔥 /generate endpoint was called!")
    """
    This is the API endpoint the frontend JavaScript calls (via fetch())
    when the user clicks "Generate Study Material".

    INPUT  (JSON body): {"topic": "Photosynthesis"}
    OUTPUT (JSON body): {"explanation": ..., "key_points": [...], "quiz": [...], "answers": {...}}
    """
    if client is None:
        return jsonify({"error": "Server is missing GEMINI_API_KEY. Check your .env file."}), 500

    data = request.get_json(silent=True) or {}
    topic = (data.get("topic") or "").strip()

    # --- Basic input validation ---
    if not topic:
        return jsonify({"error": "Please enter a topic or question."}), 400

    if len(topic) > 500:
        return jsonify({"error": "Topic is too long. Please keep it under 500 characters."}), 400

    try:
        prompt = build_prompt(topic)

        # Call the Gemini API. response_mime_type="application/json" nudges
        # the model to return valid JSON instead of prose.
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )

        result = extract_json(response.text)

        # --- Validate the shape of the result before sending to frontend ---
        required_keys = {"explanation", "key_points", "quiz", "answers"}
        if not required_keys.issubset(result.keys()):
            raise ValueError("AI response is missing required fields.")

        return jsonify(result), 200

    except json.JSONDecodeError:
        return jsonify({"error": "AI returned an unexpected format. Please try again."}), 502
    except Exception as exc:  # noqa: BLE001 - beginner-friendly catch-all
        print(f"ERROR while calling Gemini API: {exc}")
        return jsonify({"error": "Something went wrong while generating study material. Please try again."}), 500


# ---------------------------------------------------------------------------
# 7. RUN THE APP
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # debug=True gives helpful error pages during development.
    # Turn this off (debug=False) before showing/submitting the final project.
    app.run(debug=True, port=5000)
