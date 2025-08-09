import together
import json
import re

# === TOGETHER AI SETUP ===
together.api_key = "api"
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

# === Extract JSON String from Output ===
def extract_json_string(output):
    try:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", output)
        if match:
            return match.group(1)
        return output.strip()
    except Exception:
        return output.strip()

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

        json_string = extract_json_string(raw_output)
        json_string = json_string.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
        json_string = re.sub(r",\s*([\]}])", r"\1", json_string).strip()

        return json.loads(json_string)

    except json.JSONDecodeError as e:
        print("❌ JSON Decode Error:", e)
        print("✂️ Raw extracted string:", json_string)
        return {"error": "Unexpected AI response format"}

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
