

from pymongo import MongoClient
from pymongo import ASCENDING

client = MongoClient("mongodb+srv://AI_user:9909455@cluster0.b5gy0p8.mongodb.net/?retryWrites=true&w=majority")
db = client["class_assistant"]  # ✅ based on your screenshot
quiz_collection = db["quizzes"]
flashcard_collection = db["flashcards"]

flashcard_collection.create_index([("difficulty", ASCENDING)])
flashcard_collection.create_index([("topic_tags", ASCENDING)])


