import os
import together
import logging
import json
from openai import OpenAI, OpenAIError

# ========== CONFIGURATION ==========
USE_TOGETHER = True  # 🔁 Set to False to use OpenAI

# Added as open ai was causing issue

# # === TOGETHER ===
TOGETHER_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"
TOGETHER_API_KEY = "0b801f5e89d3d2ed5f86f33feb8b2602b2a01212cbf7ee20733f479ae67c27f4"  # 🔁 Set your actual Together key here
together.api_key = TOGETHER_API_KEY

# === OPENAI ===
OPENAI_MODEL = "gpt-3.5-turbo"
OPENAI_API_KEY = "your-openai-key"  # 🔁 Optional; use env if available

client = OpenAI(api_key=OPENAI_API_KEY)


def generate_quiz_and_flashcards(text, num_questions=5):
    try:
        prompt = f"""You are an expert teacher. Read the lecture below and create {num_questions} MCQ questions and flashcards for student self-assessment.

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

        if USE_TOGETHER:
            # ====== TOGETHER ======
            response = together.Complete.create(
                prompt=prompt,
                model=TOGETHER_MODEL,
                max_tokens=1024,
                temperature=0.7,
                top_p=0.7,
                stop=["</s>"]
            )
            output_text = response['choices'][0]['text'].strip()
        else:
            # ====== OPENAI ======
            chat_response = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1024
            )
            output_text = chat_response.choices[0].message.content.strip()

        print("📝 OUTPUT TEXT:", output_text)

        try:
            return json.loads(output_text)
        except json.JSONDecodeError:
            return {"raw_output": output_text, "error": "Invalid JSON format"}

    except Exception as e:
        logging.error(f"Error generating quiz: {e}")
        return {"error": str(e)}
