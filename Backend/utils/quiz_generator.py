# Backend/utils/quiz_generator.py

import together
import json
import re
import os
from datetime import datetime

# === TOGETHER AI SETUP ===

together.api_key = "59deebef8362036e839d3829a79c1c8da6bbc168157d2c8c8dfae5d539e8bd60"  
LLM_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"

# === Fallback Quiz Generation ===
def generate_fallback_quiz(summary):
    """Generate quiz using content analysis when AI model fails"""
    print("🔄 Using fallback quiz generation...")
    
    sentences = re.split(r'[.!?]+', summary)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    
    quiz = []
    flashcards = []
    
    # Generate basic questions from content
    for i, sentence in enumerate(sentences[:3]):
        if len(sentence) > 20:
            words = sentence.split()
            if len(words) > 5:
                # Create a multiple choice question
                question = f"According to the content, what is mentioned about {words[0].lower()}?"
                options = [
                    sentence[:50] + "...",
                    "This is not mentioned in the content",
                    "The content discusses something else",
                    "This topic is not covered"
                ]
                answer = options[0]
                
                quiz.append({
                    "question": question,
                    "options": options,
                    "answer": answer
                })
                
                # Create corresponding flashcard
                flashcards.append({
                    "question": f"What does the content say about {words[0].lower()}?",
                    "answer": sentence
                })
    
    # Ensure we have at least 3 questions
    while len(quiz) < 3:
        quiz.append({
            "question": f"What is a key point from the provided content?",
            "options": [
                "The content covers important topics",
                "This is not mentioned",
                "The content is irrelevant", 
                "No information is provided"
            ],
            "answer": "The content covers important topics"
        })
    
    # Ensure we have at least 3 flashcards
    while len(flashcards) < 3:
        flashcards.append({
            "question": f"What should you remember from this content?",
            "answer": "Key concepts and important information from the provided material."
        })
    
    return quiz[:3], flashcards[:3]

# === Prompt Builder ===
def create_quiz_prompt(summary):
    """Build prompt for AI model"""
    return f"""
You are an expert quiz generator. Based on the following content, create EXACTLY 3 multiple-choice quiz questions and EXACTLY 3 flashcards.

Content:
{summary}

Instructions:
1. Create questions that test understanding of key concepts
2. Make sure each multiple choice question has 4 options
3. Ensure one option is clearly correct
4. Create flashcards that help memorize important information
5. Be specific and accurate to the content provided

Return ONLY valid JSON in this exact format:
{{
  "quiz": [
    {{
      "question": "What is the main concept discussed in the content?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A"
    }},
    {{
      "question": "Which statement is true according to the content?",
      "options": ["Statement 1", "Statement 2", "Statement 3", "Statement 4"],
      "answer": "Statement 1"
    }},
    {{
      "question": "What can be concluded from the content?",
      "options": ["Conclusion A", "Conclusion B", "Conclusion C", "Conclusion D"],
      "answer": "Conclusion A"
    }}
  ],
  "flashcards": [
    {{
      "question": "What is the key definition?",
      "answer": "Clear and concise definition from the content."
    }},
    {{
      "question": "What is the main principle?",
      "answer": "Explanation of the main principle discussed."
    }},
    {{
      "question": "What should you remember?",
      "answer": "Important takeaway from the content."
    }}
  ]
}}

Do not add any text before or after the JSON. Ensure the JSON is valid and properly formatted.
"""

# === JSON Cleaner ===
def clean_json_string(json_str):
    """Clean and fix common JSON formatting issues"""
    # Replace smart quotes with regular quotes
    json_str = json_str.replace(""", '"').replace(""", '"').replace("'", "'").replace("'", "'")
    
    # Remove trailing commas
    json_str = re.sub(r",\s*([\]}])", r"\1", json_str)
    
    # Remove any text before the first {
    match = re.search(r'\{', json_str)
    if match:
        json_str = json_str[match.start():]
    
    # Remove any text after the last }
    last_brace = json_str.rfind('}')
    if last_brace != -1:
        json_str = json_str[:last_brace + 1]
    
    return json_str.strip()

# === Model Call ===
def call_together_ai(prompt):
    """Call Together AI model with error handling"""
    try:
        # Check if API key is set
        if not together.api_key or together.api_key == "YOUR_TOGETHER_AI_API_KEY_HERE":
            print("⚠️ Together AI API key not set. Using fallback generation.")
            return None
        
        print("🤖 Calling Together AI model...")
        
        response = together.Complete.create(
            prompt=prompt,
            model=LLM_MODEL,
            max_tokens=1024,
            temperature=0.7,
            stop=["</s>", "\n\n\n"]
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
        print(f"❌ Model call error: {e}")
        return None

# === Main Extraction ===
def extract_quiz_and_flashcards(output):
    """Extract and validate quiz and flashcards from AI output"""
    try:
        if not output:
            print("⚠️ No output from AI model")
            return {"quiz": [], "flashcards": []}
        
        cleaned = clean_json_string(output)
        print(f"🧹 Cleaned JSON: {cleaned[:300]}...")
        
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
        
        # Validate quiz structure
        valid_quiz = []
        for q in quiz:
            if (isinstance(q, dict) and 
                q.get('question') and 
                q.get('options') and 
                isinstance(q.get('options'), list) and 
                len(q.get('options')) >= 3 and
                q.get('answer')):
                valid_quiz.append(q)
        
        # Validate flashcard structure
        valid_flashcards = []
        for fc in flashcards:
            if (isinstance(fc, dict) and 
                fc.get('question') and 
                fc.get('answer')):
                valid_flashcards.append(fc)

        print(f"✅ Validated: {len(valid_quiz)} quiz questions, {len(valid_flashcards)} flashcards")
        return {"quiz": valid_quiz, "flashcards": valid_flashcards}

    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error: {e}")
        print(f"🔍 Problematic JSON: {cleaned[:500] if 'cleaned' in locals() else output[:500]}")
        return {"quiz": [], "flashcards": []}
    except Exception as e:
        print(f"❌ Extraction error: {e}")
        return {"quiz": [], "flashcards": []}

# === Main Function ===
def generate_quiz_and_flashcards(summary):
    """Main function to generate quiz and flashcards"""
    print("📜 Summary received for quiz generation:", repr(summary[:100]) + "..." if len(summary) > 100 else repr(summary))
    
    if not summary or not summary.strip():
        print("⚠️ Empty summary provided, cannot generate quiz.")
        return [], []

    # Try AI model first
    prompt = create_quiz_prompt(summary)
    raw_output = call_together_ai(prompt)
    
    if raw_output:
        result = extract_quiz_and_flashcards(raw_output)
        quiz = result.get("quiz", [])
        flashcards = result.get("flashcards", [])
        
        # Check if we got valid results
        if len(quiz) >= 3 and len(flashcards) >= 3:
            print(f"🎉 AI generated {len(quiz)} quiz questions and {len(flashcards)} flashcards.")
            return quiz, flashcards
        else:
            print(f"⚠️ AI generated insufficient content: {len(quiz)} quiz, {len(flashcards)} flashcards")
    
    # Fallback to content-based generation
    print("🔄 Falling back to content-based generation...")
    quiz, flashcards = generate_fallback_quiz(summary)
    
    print(f"📊 Generated {len(quiz)} quiz questions and {len(flashcards)} flashcards using fallback method.")
    return quiz, flashcards

# === Legacy support functions for backward compatibility ===
def build_prompt(summary):
    """Legacy function name - redirects to new function"""
    return create_quiz_prompt(summary)

def call_ai_model(prompt):
    """Legacy function name - redirects to new function"""
    return call_together_ai(prompt)