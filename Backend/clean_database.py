# Backend/clean_database.py
from database import quiz_collection
from pymongo import UpdateOne

def clean_invalid_quizzes():
    """Remove or fix quizzes with None/empty values"""
    
    # Find invalid quizzes
    invalid_quizzes = list(quiz_collection.find({
        '$or': [
            {'question': None},
            {'question': ''},
            {'options': None},
            {'options': []},
            {'answer': None},
            {'answer': ''}
        ]
    }))
    
    print(f"Found {len(invalid_quizzes)} invalid quizzes")
    
    for quiz in invalid_quizzes:
        print(f"Invalid quiz ID: {quiz['_id']}")
        print(f"  Question: {quiz.get('question')}")
        print(f"  Options: {quiz.get('options')}")
        print(f"  Answer: {quiz.get('answer')}")
    
    # Option 1: Delete invalid entries
    result = quiz_collection.delete_many({
        '$or': [
            {'question': None},
            {'question': ''},
            {'options': None},
            {'options': []},
            {'answer': None},
            {'answer': ''}
        ]
    })
    
    print(f"Deleted {result.deleted_count} invalid quizzes")
    
    # Check remaining valid quizzes
    valid_count = quiz_collection.count_documents({
        'question': {'$ne': None, '$exists': True, '$ne': ''},
        'options': {'$ne': None, '$exists': True, '$not': {'$size': 0}},
        'answer': {'$ne': None, '$exists': True, '$ne': ''}
    })
    
    print(f"Remaining valid quizzes: {valid_count}")

if __name__ == "__main__":
    clean_invalid_quizzes()