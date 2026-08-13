"""
AI Study Assistant / Quiz Platform - Flask Backend
----------------------------------------------------
INPUT   -> topic, difficulty, number of questions, question type (from the browser)
PROCESS -> build prompt, call Gemini API, parse + validate JSON response
OUTPUT  -> structured JSON: explanation, key_points, and a quiz array where
           EACH question carries its own type, correct_answer, and explanation.
"""

import os
import json
import re
import webbrowser

from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# 1. LOAD ENVIRONMENT VARIABLES
# ---------------------------------------------------------------------------
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not found. Create a .env file (see README).")

# ---------------------------------------------------------------------------
# 2. CREATE THE GEMINI CLIENT
# ---------------------------------------------------------------------------
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# ---------------------------------------------------------------------------
# 3. CREATE THE FLASK APP
# ---------------------------------------------------------------------------
app = Flask(__name__)

# Allowed values for the new quiz settings. We validate against these lists
# so a bad/tampered request from the browser can never reach the AI prompt.
ALLOWED_DIFFICULTIES = {"easy", "medium", "hard", "mixed"}
ALLOWED_COUNTS = {5, 10, 15, 20}
ALLOWED_TYPES = {"multiple_choice", "true_false", "mixed"}


# ---------------------------------------------------------------------------
# 4. PROMPT BUILDER (now difficulty / count / type aware)
# ---------------------------------------------------------------------------
def build_prompt(topic: str, difficulty: str, num_questions: int, question_type: str) -> str:
    if question_type == "multiple_choice":
        type_instruction = 'Every question must have "type": "multiple_choice" with 4 options (A, B, C, D).'
    elif question_type == "true_false":
        type_instruction = (
            'Every question must have "type": "true_false" with exactly 2 options: '
            '{"A": "True", "B": "False"}.'
        )
    else:  # mixed
        type_instruction = (
            'Mix "type": "multiple_choice" (4 options A-D) and "type": "true_false" '
            '(options {"A": "True", "B": "False"}) questions roughly evenly.'
        )

    return f"""
You are an expert, friendly teacher creating a quiz for a college student.

Topic: \"\"\"{topic}\"\"\"
Difficulty: {difficulty} (if "mixed", vary difficulty across questions)
Number of questions required: {num_questions}

Return ONLY valid JSON (no markdown, no code fences, no commentary) with EXACTLY
this structure:

{{
  "explanation": "A clear, simple 4-6 sentence explanation of the topic for a beginner student.",
  "key_points": ["Key point 1", "Key point 2", "Key point 3", "Key point 4", "Key point 5"],
  "quiz": [
    {{
      "id": 1,
      "type": "multiple_choice",
      "topic_tag": "short sub-topic name this question tests, e.g. 'Python Functions'",
      "question": "Question text here",
      "options": {{"A": "option text", "B": "option text", "C": "option text", "D": "option text"}},
      "correct_answer": "A",
      "explanation": "1-2 sentence explanation of why this answer is correct."
    }}
  ]
}}

Rules:
- "quiz" must contain EXACTLY {num_questions} questions. This is mandatory.
- {type_instruction}
- "correct_answer" must be the exact letter key (e.g. "A") from that question's "options".
- "topic_tag" should be a short 2-4 word sub-topic label (used later for weak-area analysis).
- Number "id" fields starting at 1, in order.
- Keep language simple, exam-focused, and appropriate for the requested difficulty.
- Do not wrap the JSON in ```json or any other formatting. Return raw JSON only.
"""


def build_regenerate_prompt(topic: str, difficulty: str, question_type: str, avoid_questions: list) -> str:
    avoid_text = "\n".join(f"- {q}" for q in avoid_questions) if avoid_questions else "None"
    type_instruction = (
        'The question must have "type": "multiple_choice" with 4 options (A-D).'
        if question_type == "multiple_choice"
        else 'The question must have "type": "true_false" with options {"A": "True", "B": "False"}.'
    )
    return f"""
You are an expert teacher. Create ONE replacement quiz question.

Topic: \"\"\"{topic}\"\"\"
Difficulty: {difficulty}

Do NOT repeat or closely resemble any of these existing questions:
{avoid_text}

Return ONLY valid JSON (no markdown, no commentary) with EXACTLY this structure:

{{
  "id": 1,
  "type": "multiple_choice",
  "topic_tag": "short sub-topic name",
  "question": "Question text here",
  "options": {{"A": "option text", "B": "option text", "C": "option text", "D": "option text"}},
  "correct_answer": "A",
  "explanation": "1-2 sentence explanation."
}}

Rules:
- {type_instruction}
- Return raw JSON only, no code fences.
"""


def build_analysis_prompt(topic: str, wrong_questions: list) -> str:
    lines = []
    for q in wrong_questions:
        lines.append(
            f'- Sub-topic: "{q.get("topic_tag", "General")}" | Question: "{q.get("question", "")}"'
        )
    wrong_text = "\n".join(lines) if lines else "None (all correct)"

    return f"""
You are an expert tutor reviewing a student's quiz performance on the topic "{topic}".

The student got these questions WRONG:
{wrong_text}

Return ONLY valid JSON (no markdown, no commentary) with EXACTLY this structure:

{{
  "weak_areas": ["Sub-topic 1", "Sub-topic 2"],
  "recommendation": "2-3 sentence, encouraging, educational recommendation on what to study next."
}}

Rules:
- "weak_areas" should be a de-duplicated, short list of the sub-topics the student struggled with.
- If the student got everything right, return an empty "weak_areas" list and a congratulatory recommendation.
- Return raw JSON only, no code fences.
"""


# ---------------------------------------------------------------------------
# 5. HELPER: SAFELY EXTRACT JSON FROM THE MODEL'S REPLY
# ---------------------------------------------------------------------------
def extract_json(raw_text: str) -> dict:
    text = raw_text.strip()
    text = re.sub(r"^```(json)?", "", text.strip(), flags=re.IGNORECASE).strip()
    text = re.sub(r"```$", "", text.strip()).strip()
    return json.loads(text)


def call_gemini(prompt: str, temperature: float = 0.7):
    """Small wrapper so every route calls Gemini the same way."""
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=temperature,
        ),
    )
    return extract_json(response.text)


def friendly_error_for(exc: Exception) -> tuple:
    """
    Inspects an exception raised by the Gemini SDK/network layer and returns
    (message, http_status) so the frontend can show something more useful
    than a generic 'something went wrong'.
    """
    text = str(exc).lower()

    if "429" in text or "quota" in text or "rate limit" in text or "resource_exhausted" in text:
        return "The AI service is receiving too many requests right now (quota/rate limit). Please wait a moment and try again.", 429
    if "timeout" in text or "timed out" in text or "deadline" in text:
        return "The AI took too long to respond. Please try again.", 504
    if "connection" in text or "network" in text or "dns" in text:
        return "Could not reach the AI service. Please check your internet connection and try again.", 503
    if "api key" in text or "unauthorized" in text or "permission" in text or "401" in text or "403" in text:
        return "The server's AI API key appears to be invalid or missing permissions.", 500

    return None, None


# ---------------------------------------------------------------------------
# 6. ROUTES
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate():
    if client is None:
        return jsonify({"error": "Server is missing GEMINI_API_KEY. Check your .env file."}), 500

    data = request.get_json(silent=True) or {}
    topic = (data.get("topic") or "").strip()
    difficulty = (data.get("difficulty") or "medium").strip().lower()
    question_type = (data.get("question_type") or "multiple_choice").strip().lower()

    try:
        num_questions = int(data.get("num_questions", 5))
    except (TypeError, ValueError):
        num_questions = 5

    # --- Validation (never trust the browser) ---
    if not topic:
        return jsonify({"error": "Please enter a topic or question."}), 400
    if len(topic) > 500:
        return jsonify({"error": "Topic is too long. Please keep it under 500 characters."}), 400
    if difficulty not in ALLOWED_DIFFICULTIES:
        difficulty = "medium"
    if num_questions not in ALLOWED_COUNTS:
        num_questions = 5
    if question_type not in ALLOWED_TYPES:
        question_type = "multiple_choice"

    try:
        prompt = build_prompt(topic, difficulty, num_questions, question_type)
        result = call_gemini(prompt)

        required_keys = {"explanation", "key_points", "quiz"}
        if not required_keys.issubset(result.keys()):
            raise ValueError("AI response is missing required fields.")

        quiz = result.get("quiz") or []
        if not isinstance(quiz, list) or len(quiz) == 0:
            raise ValueError("AI did not return any questions.")

        # Handle "fewer questions than requested" gracefully instead of crashing.
        if len(quiz) < num_questions:
            result["warning"] = (
                f"AI generated {len(quiz)} of {num_questions} requested questions."
            )

        return jsonify(result), 200

    except json.JSONDecodeError:
        return jsonify({"error": "AI returned an unexpected format. Please try again."}), 502
    except Exception as exc:  # noqa: BLE001 - beginner-friendly catch-all
        print(f"ERROR while calling Gemini API (/generate): {exc}")
        message, status = friendly_error_for(exc)
        if message:
            return jsonify({"error": message}), status
        return jsonify({"error": "Something went wrong while generating the quiz. Please try again."}), 500


@app.route("/regenerate-question", methods=["POST"])
def regenerate_question():
    if client is None:
        return jsonify({"error": "Server is missing GEMINI_API_KEY. Check your .env file."}), 500

    data = request.get_json(silent=True) or {}
    topic = (data.get("topic") or "").strip()
    difficulty = (data.get("difficulty") or "medium").strip().lower()
    question_type = (data.get("question_type") or "multiple_choice").strip().lower()
    existing_questions = data.get("existing_questions") or []

    if not topic:
        return jsonify({"error": "Missing topic."}), 400
    if difficulty not in ALLOWED_DIFFICULTIES:
        difficulty = "medium"
    if question_type not in {"multiple_choice", "true_false"}:
        question_type = "multiple_choice"

    try:
        prompt = build_regenerate_prompt(topic, difficulty, question_type, existing_questions)
        result = call_gemini(prompt, temperature=0.9)

        required_keys = {"type", "question", "options", "correct_answer", "explanation"}
        if not required_keys.issubset(result.keys()):
            raise ValueError("AI response is missing required fields.")

        return jsonify(result), 200

    except json.JSONDecodeError:
        return jsonify({"error": "AI returned an unexpected format. Please try again."}), 502
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR while calling Gemini API (/regenerate-question): {exc}")
        message, status = friendly_error_for(exc)
        if message:
            return jsonify({"error": message}), status
        return jsonify({"error": "Could not generate a replacement question. Please try again."}), 500


@app.route("/analyze", methods=["POST"])
def analyze():
    if client is None:
        return jsonify({"error": "Server is missing GEMINI_API_KEY. Check your .env file."}), 500

    data = request.get_json(silent=True) or {}
    topic = (data.get("topic") or "").strip()
    wrong_questions = data.get("wrong_questions") or []

    if not topic:
        return jsonify({"error": "Missing topic."}), 400

    try:
        prompt = build_analysis_prompt(topic, wrong_questions)
        result = call_gemini(prompt, temperature=0.5)

        required_keys = {"weak_areas", "recommendation"}
        if not required_keys.issubset(result.keys()):
            raise ValueError("AI response is missing required fields.")

        return jsonify(result), 200

    except json.JSONDecodeError:
        return jsonify({"error": "AI returned an unexpected format. Please try again."}), 502
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR while calling Gemini API (/analyze): {exc}")
        message, status = friendly_error_for(exc)
        if message:
            return jsonify({"error": message}), status
        return jsonify({"error": "Could not analyze your results right now. Please try again."}), 500


# ---------------------------------------------------------------------------
# 7. RUN THE APP
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import webbrowser
    from threading import Timer

    Timer(1, lambda: webbrowser.open("http://127.0.0.1:5000")).start()

    app.run(debug=True, port=5000, use_reloader=False)