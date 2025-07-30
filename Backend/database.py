

from pymongo import MongoClient

client = MongoClient("mongodb+srv://AI_user:9909455@cluster0.b5gy0p8.mongodb.net/?retryWrites=true&w=majority")
db = client["class_assistant"]  # ✅ based on your screenshot
quiz_collection = db["quizzes"]
flashcard_collection = db["flashcards"]


