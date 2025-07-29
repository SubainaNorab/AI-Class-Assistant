

from pymongo import MongoClient

client = MongoClient("mongodb+srv://AI_user:<9909455>@cluster0.b5gy0p8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
)
db = client["your_db_name"]
quiz_collection = db["quiz_collection"]
flashcard_collection = db["flashcard_collection"]

