import os
from openai import OpenAI
import json

def test_openai_connection():
    """Test OpenAI API connection and generation"""
    print("🔍 Testing OpenAI Connection")
    print("=" * 50)
    
    # Check API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ No OpenAI API key found!")
        print("Set it with: $env:OPENAI_API_KEY = 'your-key-here'")
        return False
    
    print(f"✅ API Key found: {api_key[:10]}...{api_key[-4:]}")
    
    # Test simple API call
    try:
        client = OpenAI(api_key=api_key)
        print("✅ OpenAI client created successfully")
        
        # Simple test call
        print("\n🔄 Testing API call...")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": "Say 'Hello World' in JSON format: {\"message\": \"Hello World\"}"}
            ],
            max_tokens=50,
            temperature=0.1
        )
        
        content = response.choices[0].message.content.strip()
        print(f"✅ API Response: {content}")
        
        # Test flashcard generation
        print("\n🔄 Testing flashcard generation...")
        flashcard_prompt = """
Generate exactly 2 flashcards about Python programming in JSON format:
[
  {"question": "What is Python?", "answer": "Python is a programming language."},
  {"question": "What is a variable?", "answer": "A variable stores data values."}
]
"""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an educational content creator. Respond only with valid JSON."},
                {"role": "user", "content": flashcard_prompt}
            ],
            max_tokens=300,
            temperature=0.3
        )
        
        flashcard_content = response.choices[0].message.content.strip()
        print(f"📝 Flashcard Response: {flashcard_content}")
        
        # Try to parse JSON
        try:
            flashcards = json.loads(flashcard_content)
            print("✅ JSON parsing successful!")
            print(f"Generated {len(flashcards)} flashcards")
            return True
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ API Error: {e}")
        return False

def check_api_usage():
    """Check API usage and limits"""
    print("\n💰 Checking API Usage")
    print("=" * 30)
    
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ No API key found")
        return
    
    try:
        client = OpenAI(api_key=api_key)
        
        # Make a very small test call to check if API is working
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5
        )
        
        print("✅ API is working and accessible")
        print("💡 If you're getting fallback responses, it might be:")
        print("   - Rate limiting")
        print("   - Network connectivity issues")
        print("   - API quota exceeded")
        
    except Exception as e:
        error_str = str(e).lower()
        if "quota" in error_str or "billing" in error_str:
            print("❌ API Quota/Billing Issue")
            print("💡 Check your OpenAI account billing and usage limits")
        elif "rate" in error_str:
            print("❌ Rate Limiting")
            print("💡 You're making too many requests. Wait a moment and try again")
        elif "authentication" in error_str:
            print("❌ Authentication Error")
            print("💡 Check if your API key is correct and active")
        else:
            print(f"❌ Unknown Error: {e}")

if __name__ == "__main__":
    print("🚀 OpenAI API Diagnostic Tool")
    print("=" * 60)
    
    success = test_openai_connection()
    check_api_usage()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ OpenAI integration is working!")
        print("💡 If you're still getting fallback responses, restart your Flask server")
    else:
        print("❌ OpenAI integration needs fixing")
        print("💡 Check the errors above and resolve them")