# Backend/database.py 

from pymongo import MongoClient
from pymongo import ASCENDING


client = MongoClient("mongodb+srv://AI_user:9909455@cluster0.b5gy0p8.mongodb.net/?retryWrites=true&w=majority")
db = client["class_assistant"]  


quiz_collection = db["quizzes"]
flashcard_collection = db["flashcards"]
user_collection = db["users"]


flashcard_collection.create_index([("difficulty", ASCENDING)])
flashcard_collection.create_index([("topic_tags", ASCENDING)])

# ===== User Authentication Support =====
def setup_user_authentication():
    
  
    try:
       # Add unique index on email
        user_collection.create_index([("email", ASCENDING)], unique=True)
        print("✅ Unique email index created for authentication")

        # Add helpful indexes for auth performance
        user_collection.create_index([("created_at", ASCENDING)])
        print("✅ Additional auth indexes created")

    except Exception as e:
        # Index might already exist - this is fine
        print(f"⚠️  Auth index setup (likely already exists): {e}")

# Initialize authentication support
setup_user_authentication()

print("🗄️ Database setup complete with authentication support")
print("🔗 Ready for integration with authentication routes")