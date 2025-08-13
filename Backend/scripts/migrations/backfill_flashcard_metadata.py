from pymongo import MongoClient
client = MongoClient("mongodb+srv://AI_user:9909455@cluster0.b5gy0p8.mongodb.net/?retryWrites=true&w=majority")
db = client["your_db"]
col = db["flashcards"]

res = col.update_many(
    {
        "$or": [
            {"topic_tags": {"$exists": False}},
            {"difficulty": {"$exists": False}},
            {"time_taken": {"$exists": False}},
        ]
    },
    {
        "$set": {
            "topic_tags": [],
            "difficulty": "medium",
            "time_taken": 0,
        }
    }
)
print("Matched:", res.matched_count, "Modified:", res.modified_count)
