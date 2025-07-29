import together
import json
import re

together.api_key = "65d08a48d954158c6d322b2e3b85596627eac64ec4e61e218ad4b3e8e87cff81"
LLM_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"

def build_prompt(summary):
    return f"""
Generate a quiz and flashcards from the following summary:

Summary:
{summary}

Format:
{{
  "quiz": [
    {{
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "Correct option"
    }}
  ],
  "flashcards": [
    {{
      "question": "...",
      "answer": "..."
    }}
  ]
}}
"""

def call_ai_model(prompt):
    try:
        response = together.Complete.create(
            prompt=prompt,
            model=LLM_MODEL,
            max_tokens=1024,
            temperature=0.7,
            stop=["</s>"]
        )
        
        raw_text = response["choices"][0]["text"]
        print("🔹Raw LLM Output:\n", raw_text)

        # Try to find and clean the JSON part
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON content found in output.")
        
        json_text = json_match.group(0)
        json_text = json_text.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
        json_text = re.sub(r",\s*([\]}])", r"\1", json_text).strip()

        return json.loads(json_text)

    except Exception as e:
        print("Model call error:", e)
        return None

def generate_quiz_and_flashcards(summary):
    result = call_ai_model(build_prompt(summary))
    if result and "quiz" in result and "flashcards" in result:
        return result["quiz"], result["flashcards"]
    else:
        print("Quiz or flashcards generation failed")
        return [], []
