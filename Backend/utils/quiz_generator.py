import together
import json
import re
import os
from datetime import datetime

# === TOGETHER AI SETUP ===
together.api_key = ""
LLM_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"

# === Prompt Builder ===
def build_prompt(summary):
    return f"""
You are a quiz generator. Based on the following summary, create EXACTLY 3 quiz questions and EXACTLY 3 flashcards.

Summary:
{summary}

Return ONLY JSON in this format:
{{
  "quiz": [
    {{
      "question": "What is ...?",
      "options": ["A", "B", "C", "D"],
      "answer": "Correct option"
    }},
    {{
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "Correct option"
    }},
    {{
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "Correct option"
    }}
  ],
  "flashcards": [
    {{
      "question": "...?",
      "answer": "..."
    }},
    {{
      "question": "...?",
      "answer": "..."
    }},
    {{
      "question": "...?",
      "answer": "..."
    }}
  ]
}}
Do not add any text before or after the JSON.
"""

# === JSON Cleaner ===
def clean_json_string(json_str):
    json_str = json_str.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    json_str = re.sub(r",\s*([\]}])", r"\1", json_str)  # remove trailing commas
    return json_str.strip()

# === Model Call ===
def call_ai_model(prompt):
    try:
        response = together.Complete.create(
            prompt=prompt,
            model=LLM_MODEL,
            max_tokens=1024,
            temperature=0.7,
            stop=["</s>"]
        )

        # Extract text from API response
        if isinstance(response, dict) and "choices" in response and len(response["choices"]) > 0:
            raw_output = response["choices"][0].get("text", "").strip()
        else:
            raw_output = str(response)

        # Save raw output for debugging
        os.makedirs("debug_outputs", exist_ok=True)
        filename = f"debug_outputs/raw_output_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(raw_output)

        print(f"✅ Raw model output saved to {filename}")
        print("🔹 Raw output preview:", raw_output[:200], "..." if len(raw_output) > 200 else "")
        return raw_output

    except Exception as e:
        print("❌ Model call error:", e)
        return ""

# === Main Extraction ===
def extract_quiz_and_flashcards(output):
    try:
        cleaned = clean_json_string(output)
        parsed = json.loads(cleaned)

        quiz = parsed.get("quiz", [])
        flashcards = parsed.get("flashcards", [])

        # Ensure they are lists, not strings
        if isinstance(quiz, str):
            try:
                quiz = json.loads(quiz)
            except json.JSONDecodeError:
                quiz = []
        if isinstance(flashcards, str):
            try:
                flashcards = json.loads(flashcards)
            except json.JSONDecodeError:
                flashcards = []

        # Final validation
        if not isinstance(quiz, list):
            quiz = []
        if not isinstance(flashcards, list):
            flashcards = []

        return {"quiz": quiz, "flashcards": flashcards}

    except Exception as e:
        print(f"❌ JSON parsing error: {e}")
        return {"quiz": [], "flashcards": []}

# === Final Function ===
def generate_quiz_and_flashcards(summary):
    print("📜 Summary received for quiz generation:", repr(summary))
    if not summary or not summary.strip():
        print("⚠️ Empty summary provided, cannot generate quiz.")
        return [], []

    prompt = build_prompt(summary)
    raw_output = call_ai_model(prompt)
    result = extract_quiz_and_flashcards(raw_output)

    quiz = result.get("quiz", [])
    flashcards = result.get("flashcards", [])

    print(f"📊 Generated {len(quiz)} quiz questions and {len(flashcards)} flashcards.")
    return quiz, flashcards
