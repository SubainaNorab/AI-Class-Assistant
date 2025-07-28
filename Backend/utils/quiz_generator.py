import together
import logging
import json

# Configuration
TOGETHER_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"
TOGETHER_API_KEY = "9b5fdbfe6e161ca597bbdcda5d7892b41dce8932d1ce02a2504b0cbd5f9bd400"
together.api_key = TOGETHER_API_KEY

def build_prompt(text, num_questions=5):
    return f"""You are an expert teacher. Read the lecture below and create {num_questions} MCQ questions and flashcards for student self-assessment.

Lecture:
{text}

Return the result in JSON with this format:
{{
  "quiz": [
    {{
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "B"
    }}
  ],
  "flashcards": [
    {{
      "question": "...",
      "answer": "..."
    }}
  ]
}}"""

def call_ai_model(prompt):
    try:
        response = together.Complete.create(
            prompt=prompt,
            model=TOGETHER_MODEL,
            max_tokens=1024,
            temperature=0.7,
            top_p=0.7,
            stop=["</s>"]
        )
        output_text = response['choices'][0]['text'].strip()
        print("🧠 AI Output:", output_text)

        try:
            return json.loads(output_text)
        except json.JSONDecodeError:
            return {"raw_output": output_text, "error": "Invalid JSON format"}

    except Exception as e:
        logging.error(f"Error generating quiz: {e}")
        return {"error": str(e)}
