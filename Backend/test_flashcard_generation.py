import requests
import json

def test_backend_directly():
    """Test the backend API directly"""
    print("🧪 Testing Backend API Directly")
    print("=" * 50)
    
    test_content = """
    Python is a high-level programming language that is widely used for web development. 
    Variables in Python store data values and can be of different types. Functions are 
    reusable blocks of code that perform specific tasks. Loops allow programmers to repeat 
    code multiple times. Object-oriented programming uses classes and objects.
    """
    
    url = "http://localhost:5000/generate_flashcards"
    payload = {
        "content": test_content,
        "user_id": "test_user"
    }
    
    print(f"🚀 Sending request to: {url}")
    print(f"📝 Content length: {len(test_content)} characters")
    
    try:
        response = requests.post(url, json=payload)
        print(f"\n📡 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success!")
            print(f"📊 Response keys: {list(data.keys())}")
            
            if data.get('success'):
                flashcards = data.get('flashcards', [])
                print(f"🎯 Generated: {len(flashcards)} flashcards")
                print(f"🎯 Source: {data.get('source', 'unknown')}")
                print(f"🎯 Message: {data.get('message', 'none')}")
                
                if 'ai_status' in data:
                    ai_status = data['ai_status']
                    print(f"🤖 AI Available: {ai_status.get('ai_available', 'unknown')}")
                    if not ai_status.get('ai_available', True):
                        print(f"🤖 AI Error: {ai_status.get('ai_error', 'unknown')}")
                        print(f"🤖 Fallback Used: {ai_status.get('fallback_used', False)}")
                
                print("\n📚 FLASHCARDS:")
                for i, card in enumerate(flashcards[:2], 1):  # Show first 2
                    print(f"\n{i}. Q: {card.get('question', 'NO QUESTION')}")
                    print(f"   A: {card.get('answer', 'NO ANSWER')}")
                
                if len(flashcards) > 2:
                    print(f"\n... and {len(flashcards) - 2} more flashcards")
                    
            else:
                print(f"❌ Backend returned success=False")
                print(f"❌ Error: {data.get('error', 'unknown error')}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"❌ Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error - Is Flask running on localhost:5000?")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_backend_directly()