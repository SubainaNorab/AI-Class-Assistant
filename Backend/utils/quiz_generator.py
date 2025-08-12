import together
import json
import re

# === TOGETHER AI SETUP ===
together.api_key = ""
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
    json_str = json_str.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    json_str = re.sub(r",\s*([\\]}])", r"\1", json_str)
    json_str = json_str.replace("\n", " ").replace("\t", " ")
    json_str = re.sub(r"\s+", " ", json_str)  # Collapse multiple spaces into one
    json_str = json_str.strip()
    return json_str




def extract_section(label, output):
    pattern = rf"{label}:\s*(.*?)(?=Quiz:|Flashcards:|$)"
    match = re.search(pattern, output, re.IGNORECASE | re.DOTALL)
    if match:
        section = match.group(1)
        print(f"Extracted section for {label}:", repr(section))
        section = re.sub(r"^```json\s*|\s*```$", "", section, flags=re.IGNORECASE).strip()
        print(f"Cleaned extracted section for {label}:", repr(section))
        return section
    return None


def parse_json_array(json_str):
    """
    Parse a JSON array string after cleaning. Return None if parsing fails.
    """
    try:
        cleaned = clean_json_string(json_str)
        return json.loads(cleaned)
    except Exception:
        return None

def extract_quiz_and_flashcards(output):
    try:
        quiz_section = extract_section("Quiz", output)
        flashcards_section = extract_section("Flashcards", output)

        if not quiz_section or not flashcards_section:
            raise ValueError("Could not find Quiz or Flashcards sections in output")

        quiz = parse_json_array(quiz_section)
        flashcards = parse_json_array(flashcards_section)

        if quiz is None or flashcards is None:
            raise ValueError("Failed to parse Quiz or Flashcards JSON")

        return {"quiz": quiz, "flashcards": flashcards}

    except Exception as e:
        print(f"❌ JSON extraction/parsing error: {e}")
        print("Raw output was:", output)
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
        print("Response type:", type(response))
        print("Response content:", repr(response))

        if isinstance(response, dict):
            if "output" in response:
                raw_output = response["output"]
            elif "choices" in response and len(response["choices"]) > 0:
                first_choice = response["choices"][0]
                if isinstance(first_choice, dict):
                    raw_output = first_choice.get("text", "")
                else:
                    raw_output = str(first_choice)
            else:
                raw_output = ""
        elif isinstance(response, str):
            raw_output = response
        else:
            raw_output = str(response)

        print("🔹 Raw LLM Output:\n", raw_output)

        parsed_result = extract_quiz_and_flashcards(raw_output)
        return parsed_result

    except Exception as e:
        print("❌ Model call error:", e)
        import traceback
        traceback.print_exc()
        return {"error": f"Unexpected error: {str(e)}"}







# === Final Exported Function ===
def generate_quiz_and_flashcards(summary):
    result = call_ai_model(build_prompt(summary))

    if result and "quiz" in result and "flashcards" in result:
        return result["quiz"], result["flashcards"]
    else:
        print("⚠️ Quiz or flashcards generation failed:", result)
        return [], []
