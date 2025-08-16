# Backend/fix_database.py
from database import quiz_collection, flashcard_collection, db
from pymongo import UpdateOne
from datetime import datetime

def cleanup_database():
    """Clean invalid entries and ensure proper structure"""
    
    print("🧹 Cleaning up database...")
    
    # Remove invalid quiz entries
    invalid_quiz_query = {
        '$or': [
            {'question': None},
            {'question': ''},
            {'options': None},
            {'options': []},
            {'answer': None},
            {'answer': ''},
            {'question': {'$exists': False}},
            {'options': {'$exists': False}},
            {'answer': {'$exists': False}}
        ]
    }
    
    deleted_count = quiz_collection.delete_many(invalid_quiz_query).deleted_count
    print(f"🗑️ Deleted {deleted_count} invalid quiz entries")
    
    # Update existing quizzes to have required fields
    update_operations = []
    
    # Find quizzes missing new fields
    quizzes_to_update = quiz_collection.find({
        '$or': [
            {'difficulty': {'$exists': False}},
            {'topic_tags': {'$exists': False}},
            {'is_completed': {'$exists': False}},
            {'lecture_title': {'$exists': False}}
        ]
    })
    
    for quiz in quizzes_to_update:
        update_doc = {}
        
        if 'difficulty' not in quiz:
            update_doc['difficulty'] = 'Medium'
        if 'topic_tags' not in quiz:
            update_doc['topic_tags'] = []
        if 'is_completed' not in quiz:
            update_doc['is_completed'] = False
        if 'lecture_title' not in quiz:
            update_doc['lecture_title'] = 'Generated Quiz'
        if 'created_at' not in quiz:
            update_doc['created_at'] = datetime.utcnow()
            
        if update_doc:
            update_operations.append(
                UpdateOne({'_id': quiz['_id']}, {'$set': update_doc})
            )
    
    if update_operations:
        result = quiz_collection.bulk_write(update_operations)
        print(f"📝 Updated {result.modified_count} quiz entries with missing fields")
    
    # Create indexes for better performance
    try:
        quiz_collection.create_index([('lecture_title', 1)])
        quiz_collection.create_index([('difficulty', 1)])
        quiz_collection.create_index([('topic_tags', 1)])
        quiz_collection.create_index([('created_at', -1)])
        print("📊 Created database indexes")
    except Exception as e:
        print(f"⚠️ Index creation note: {e}")
    
    # Final count
    valid_count = quiz_collection.count_documents({
        'question': {'$ne': None, '$exists': True, '$ne': ''},
        'options': {'$ne': None, '$exists': True, '$not': {'$size': 0}},
        'answer': {'$ne': None, '$exists': True, '$ne': ''}
    })
    
    print(f"✅ Database cleanup complete. {valid_count} valid quizzes remaining.")

if __name__ == "__main__":
    cleanup_database()