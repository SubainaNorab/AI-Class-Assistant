import json
import os
from typing import Dict, Any
import openai

# Set your OpenAI API key from environment variable
openai.api_key = os.getenv('OPENAI_API_KEY')

def build_prompt(summary_text: str) -> str:
    prompt = f"""
You are an educational content generator. Based on the following lecture summary, create exactly 3 multiple choice questions (MCQs) and 3 flashcards.

LECTURE SUMMARY:
{summary_text}

INSTRUCTIONS:
1. Generate exactly 3 MCQs with 4 options each (A, B, C, D)
2. Generate exactly 3 flashcards with clear question-answer pairs
3. Focus on key concepts, important facts, and main ideas
4. Make questions challenging but fair
5. Ensure answers are clearly stated in the summary

REQUIRED OUTPUT FORMAT (JSON):
{{
    "mcqs": [
        {{
            "question": "Your question here?",
            "options": {{
                "A": "Option A text",
                "B": "Option B text", 
                "C": "Option C text",
                "D": "Option D text"
            }},
            "correct_answer": "A",
            "explanation": "Brief explanation why this is correct"
        }},
        {{
            "question": "Second question?",
            "options": {{
                "A": "Option A text",
                "B": "Option B text",
                "C": "Option C text", 
                "D": "Option D text"
            }},
            "correct_answer": "B",
            "explanation": "Brief explanation why this is correct"
        }},
        {{
            "question": "Third question?",
            "options": {{
                "A": "Option A text",
                "B": "Option B text",
                "C": "Option C text",
                "D": "Option D text"  
            }},
            "correct_answer": "C",
            "explanation": "Brief explanation why this is correct"
        }}
    ],
    "flashcards": [
        {{
            "question": "What is the main concept of...?",
            "answer": "Clear, concise answer based on the summary"
        }},
        {{
            "question": "Define or explain...",
            "answer": "Clear, concise answer based on the summary"
        }},
        {{
            "question": "How does... work?",
            "answer": "Clear, concise answer based on the summary"
        }}
    ]
}}

Return ONLY the JSON object, no additional text or formatting.
"""
    return prompt.strip()

def call_ai_model(prompt: str) -> Dict[str, Any]:
    if not openai.api_key:
        raise Exception("OpenAI API key not found. Please set OPENAI_API_KEY environment variable.")
    
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system", 
                    "content": "You are an educational content generator that creates MCQs and flashcards. Always respond with valid JSON only, no markdown formatting."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            max_tokens=1500,
            temperature=0.7,
            top_p=1.0
        )
        
        content = response.choices[0].message.content.strip()
        
        if content.startswith('`json'):
            content = content.replace('`json', '').replace('`', '').strip()
        elif content.startswith('`'):
            content = content.replace('`', '').strip()
        
        result = json.loads(content)
        
        if validate_response(result):
            return result
        else:
            print("Warning: AI response validation failed, using fallback")
            return get_fallback_response()
            
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {str(e)}")
        return get_fallback_response()
    except Exception as e:
        print(f"OpenAI API error: {str(e)}")
        return get_fallback_response()

def validate_response(response: Dict[str, Any]) -> bool:
    try:
        if not isinstance(response, dict):
            return False
            
        if 'mcqs' not in response or 'flashcards' not in response:
            return False
        
        mcqs = response['mcqs']
        if not isinstance(mcqs, list) or len(mcqs) != 3:
            return False
            
        for mcq in mcqs:
            required_keys = ['question', 'options', 'correct_answer']
            if not all(key in mcq for key in required_keys):
                return False
                
            options = mcq['options']
            if not isinstance(options, dict) or len(options) != 4:
                return False
                
            if not all(key in options for key in ['A', 'B', 'C', 'D']):
                return False
                
            if mcq['correct_answer'] not in ['A', 'B', 'C', 'D']:
                return False
        
        flashcards = response['flashcards']
        if not isinstance(flashcards, list) or len(flashcards) != 3:
            return False
            
        for card in flashcards:
            if not isinstance(card, dict):
                return False
            if 'question' not in card or 'answer' not in card:
                return False
            if not card['question'].strip() or not card['answer'].strip():
                return False
        
        return True
        
    except Exception as e:
        print(f"Validation error: {str(e)}")
        return False

def get_fallback_response() -> Dict[str, Any]:
    return {
        "mcqs": [
            {
                "question": "What was the main topic discussed in this content?",
                "options": {
                    "A": "Please review the original content for details",
                    "B": "AI service temporarily unavailable",
                    "C": "Try again in a few moments",
                    "D": "Check your API key configuration"
                },
                "correct_answer": "A",
                "explanation": "AI service temporarily unavailable. Please try again."
            },
            {
                "question": "Which key concept should be remembered?",
                "options": {
                    "A": "Concept A - Review needed",
                    "B": "Concept B - Review needed", 
                    "C": "Concept C - Review needed",
                    "D": "Concept D - Review needed"
                },
                "correct_answer": "B",
                "explanation": "AI service temporarily unavailable. Please try again."
            },
            {
                "question": "What is the most important takeaway?",
                "options": {
                    "A": "Important point A",
                    "B": "Important point B",
                    "C": "Important point C", 
                    "D": "Important point D"
                },
                "correct_answer": "C",
                "explanation": "AI service temporarily unavailable. Please try again."
            }
        ],
        "flashcards": [
            {
                "question": "What is the main concept covered?",
                "answer": "AI service temporarily unavailable. Please review your notes and try again."
            },
            {
                "question": "Key definition to remember?",
                "answer": "AI service temporarily unavailable. Please review your notes and try again."
            },
            {
                "question": "Important process or method discussed?",
                "answer": "AI service temporarily unavailable. Please review your notes and try again."
            }
        ]
    }

if __name__ == "__main__":
    print("Quiz generator module loaded successfully!")
