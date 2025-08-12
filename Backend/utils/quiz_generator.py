import together
import json
import re

# === TOGETHER AI SETUP ===
together.api_key = "9b5fdbfe6e161ca597bbdcda5d7892b41dce8932d1ce02a2504b0cbd5f9bd400"
LLM_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"

# === Prompt Builder ===
def build_prompt(summary):
    return f"""
Generate a quiz and flashcards from the following summary:

Summary:
{summary}

Format:
{{
  "quiz": [
    {{
      "question": "What is ...?",
      "options": ["A", "B", "C", "D"],
      "answer": "Correct option"
    }}
  ],
  "flashcards": [
    {{
      "question": "...?",
      "answer": "..."
    }}
  ]
}}
Only return the JSON content.
"""
def clean_json_string(json_str):
    # Replace fancy quotes with normal quotes
    json_str = json_str.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    # Remove trailing commas before closing braces/brackets
    json_str = re.sub(r",\s*([\]}])", r"\1", json_str)
    # Remove newlines/tabs that might break parsing
    json_str = re.sub(r"[\n\t]", " ", json_str)
    # Optional: strip extra spaces
    json_str = json_str.strip()
    return json_str

# === Extract JSON String from Output ===
def extract_quiz_and_flashcards(output):
    try:
        quiz_match = re.search(r"Quiz:\s*(\[[\s\S]*?\])", output, re.IGNORECASE)
        flashcards_match = re.search(r"Flashcards:\s*(\[[\s\S]*?\])", output, re.IGNORECASE)

        if not quiz_match or not flashcards_match:
            raise ValueError("Could not parse Quiz or Flashcards arrays")

        quiz_json = clean_json_string(quiz_match.group(1))
        flashcards_json = clean_json_string(flashcards_match.group(1))

        quiz = json.loads(quiz_json)
        flashcards = json.loads(flashcards_json)

        return {"quiz": quiz, "flashcards": flashcards}

    except Exception as e:
        print(f"❌ JSON extraction/parsing error: {e}")
        return {"error": "Unexpected AI response format"}




# === Call LLM and Return Parsed JSON ===
def call_ai_model(prompt):
    try:
        response = together.Complete.create(
            prompt=prompt,
            model=LLM_MODEL,
            max_tokens=1024,
            temperature=0.7,
            stop=["</s>"]
        )

        raw_output = response.get("output") or response.get("choices", [{}])[0].get("text", "")
        print("🔹 Raw LLM Output:\n", raw_output)

        # Use new extractor function
        parsed_result = extract_quiz_and_flashcards(raw_output)
        return parsed_result

    except Exception as e:
        print("❌ Model call error:", e)
        return {"error": f"Unexpected error: {str(e)}"}


# === Final Exported Function ===
def generate_quiz_and_flashcards(summary):
    result = call_ai_model(build_prompt(summary))

    if result and "quiz" in result and "flashcards" in result:
        return result["quiz"], result["flashcards"]
    else:
        print("⚠️ Quiz or flashcards generation failed:", result)
        return [], []
