from pymongo import MongoClient

# Replace with your connection URI
MONGO_URI = "mongodb+srv://AI_user:<990945>@cluster0.b5gy0p8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

client = MongoClient(MONGO_URI)
db = client["ai_class_assistant"]
quiz_collection = db["quizzes"]
flashcard_collection = db["flashcards"]
