import os
import json
from utils.quiz_generator import build_prompt, call_ai_model, validate_response

def main():
    print("Testing OpenAI Quiz Generation")
    print("="*50)
    
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("OpenAI API key not found!")
        print("Set it with: $env:OPENAI_API_KEY = 'sk-your-key-here'")
        return
    
    print(f"API key found: {api_key[:10]}...{api_key[-4:]}")
    
    sample_summary = """
    Python is a high-level programming language known for its simplicity and readability. 
    It supports multiple programming paradigms including procedural, object-oriented, and 
    functional programming. Python's extensive standard library and third-party packages 
    make it popular for web development, data science, artificial intelligence, and automation.
    Key features include dynamic typing, automatic memory management, and an interactive shell.
    """
    
    print("\nTesting with Python programming summary...")
    
    try:
        prompt = build_prompt(sample_summary)
        print("Prompt built successfully")
        
        print("Calling OpenAI API...")
        result = call_ai_model(prompt)
        
        is_valid = validate_response(result)
        print(f"Response received and validated: {'PASSED' if is_valid else 'FALLBACK'}")
        
        if result:
            print(f"\nResults:")
            print(f"   MCQs generated: {len(result.get('mcqs', []))}")
            print(f"   Flashcards generated: {len(result.get('flashcards', []))}")
            
            if result.get('mcqs'):
                mcq = result['mcqs'][0]
                print(f"\nSample MCQ:")
                print(f"   Question: {mcq.get('question', 'N/A')}")
                print(f"   Correct: {mcq.get('correct_answer', 'N/A')}")
            
            with open('test_output.json', 'w') as f:
                json.dump(result, f, indent=2)
            print(f"\nFull results saved to: test_output.json")
            
            print(f"\nTest completed successfully!")
        
    except Exception as e:
        print(f"Test failed: {str(e)}")

if __name__ == "__main__":
    main()
