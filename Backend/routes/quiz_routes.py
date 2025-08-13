# Backend/routes/quiz_routes.py
from flask import Blueprint, request, jsonify
from datetime import datetime
from database import quiz_collection, flashcard_collection
from utils.quiz_generator import build_prompt, call_ai_model
import math

# Create Flask Blueprint instead of FastAPI router
quiz_bp = Blueprint('quiz', __name__)

@quiz_bp.route('/quiz', methods=['GET'])
def get_quizzes():
    """Get all quizzes with optional filters, search, and pagination"""
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search = request.args.get('search', '').strip()
        lecture_filter = request.args.get('lecture', '').strip()
        difficulty_filter = request.args.get('difficulty', '').strip()
        date_filter = request.args.get('date', '').strip()
        
        # Validate pagination
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 10
            
        # Build MongoDB query
        query = {}
        
        # Search by keyword in question
        if search:
            query['question'] = {'$regex': search, '$options': 'i'}
            
        # Filter by lecture title
        if lecture_filter:
            query['lecture_title'] = {'$regex': lecture_filter, '$options': 'i'}
            
        # Filter by difficulty
        if difficulty_filter and difficulty_filter != 'all':
            query['difficulty'] = difficulty_filter
            
        # Filter by date
        if date_filter:
            try:
               
                start_date = datetime.strptime(date_filter, '%Y-%m-%d')
                end_date = start_date.replace(hour=23, minute=59, second=59)
                query['created_at'] = {
                    '$gte': start_date,
                    '$lte': end_date
                }
            except ValueError:
                pass  # Ignore invalid date format
        
        # Get total count for pagination
        total_count = quiz_collection.count_documents(query)
        
        # Calculate pagination
        skip = (page - 1) * limit
        total_pages = math.ceil(total_count / limit)
        
        # Fetch quizzes with pagination
        quizzes_cursor = quiz_collection.find(query).skip(skip).limit(limit).sort('created_at', -1)
        
        # Convert cursor to list and format
        quizzes = []
        for quiz in quizzes_cursor:
            quiz_dict = {
                '_id': str(quiz.get('_id', '')),
                'lecture_title': quiz.get('lecture_title', ''),
                'question': quiz.get('question', ''),
                'options': quiz.get('options', []),
                'answer': quiz.get('answer', ''),
                'difficulty': quiz.get('difficulty', 'Medium'),
                'topic_tags': quiz.get('topic_tags', []),
                'time_taken': quiz.get('time_taken', 0),
                'created_at': quiz.get('created_at', datetime.now()).isoformat() if quiz.get('created_at') else None
            }
            quizzes.append(quiz_dict)
        
        return jsonify({
            'quizzes': quizzes,
            'pagination': {
                'page': page,
                'limit': limit,
                'total_pages': total_pages,
                'total_count': total_count
            }
        }), 200
        
    except Exception as e:
        print(f"Error in get_quizzes: {str(e)}")
        return jsonify({'error': f'Failed to fetch quizzes: {str(e)}'}), 500

# Rest of your code remains the same...
@quiz_bp.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    """Generate quiz from summary with metadata"""
    try:
        data = request.get_json()
        
        # Extract data with defaults
        summary = data.get('summary', '')
        lecture_title = data.get('lecture_title', 'Generated Quiz')
        difficulty = data.get('difficulty', 'Medium')
        topic_tags = data.get('topic_tags', [])
        time_taken = data.get('time_taken', 0)
        
        # Validate required fields
        if not summary:
            return jsonify({'error': 'Summary is required'}), 400
            
        # Validate difficulty
        allowed_difficulties = ['Easy', 'Medium', 'Hard']
        if difficulty not in allowed_difficulties:
            difficulty = 'Medium'
            
        # Ensure topic_tags is a list
        if not isinstance(topic_tags, list):
            topic_tags = []
            
        # Build prompt and call AI model
        prompt = build_prompt(summary)
        result = call_ai_model(prompt)
        
        if not result:
            return jsonify({'error': 'Failed to generate quiz'}), 500
            
        created_at = datetime.utcnow()
        
        # Prepare quiz documents with metadata
        quiz_docs = []
        if 'quiz' in result:
            for q in result['quiz']:
                quiz_doc = {
                    'lecture_title': lecture_title,
                    'question': q.get('question', ''),
                    'options': q.get('options', []),
                    'answer': q.get('answer', ''),
                    'difficulty': difficulty,
                    'topic_tags': topic_tags,
                    'time_taken': time_taken,
                    'created_at': created_at
                }
                quiz_docs.append(quiz_doc)
        
        # Prepare flashcard documents
        flashcard_docs = []
        if 'flashcards' in result:
            for fc in result['flashcards']:
                flashcard_doc = {
                    'lecture_title': lecture_title,
                    'question': fc.get('question', ''),
                    'answer': fc.get('answer', ''),
                    'created_at': created_at
                }
                flashcard_docs.append(flashcard_doc)
        
        # Insert into database
        quiz_ids = []
        flashcard_ids = []
        
        if quiz_docs:
            result = quiz_collection.insert_many(quiz_docs)
            quiz_ids = [str(id) for id in result.inserted_ids]
            
        if flashcard_docs:
            result = flashcard_collection.insert_many(flashcard_docs)
            flashcard_ids = [str(id) for id in result.inserted_ids]
        
        return jsonify({
            'message': 'Quiz and flashcards generated successfully',
            'quiz_count': len(quiz_docs),
            'flashcard_count': len(flashcard_docs),
            'quiz_ids': quiz_ids,
            'flashcard_ids': flashcard_ids
        }), 201
        
    except Exception as e:
        print(f"Error in generate_quiz: {str(e)}")
        return jsonify({'error': f'Failed to generate quiz: {str(e)}'}), 500

@quiz_bp.route('/quiz/<quiz_id>', methods=['GET'])
def get_quiz_by_id(quiz_id):
    """Get a single quiz by ID"""
    try:
        from bson import ObjectId
        
        quiz = quiz_collection.find_one({'_id': ObjectId(quiz_id)})
        
        if not quiz:
            return jsonify({'error': 'Quiz not found'}), 404
            
        quiz_dict = {
            '_id': str(quiz['_id']),
            'lecture_title': quiz.get('lecture_title', ''),
            'question': quiz.get('question', ''),
            'options': quiz.get('options', []),
            'answer': quiz.get('answer', ''),
            'difficulty': quiz.get('difficulty', 'Medium'),
            'topic_tags': quiz.get('topic_tags', []),
            'time_taken': quiz.get('time_taken', 0),
            'created_at': quiz.get('created_at', datetime.now()).isoformat() if quiz.get('created_at') else None
        }
        
        return jsonify(quiz_dict), 200
        
    except Exception as e:
        print(f"Error in get_quiz_by_id: {str(e)}")
        return jsonify({'error': f'Failed to fetch quiz: {str(e)}'}), 500

@quiz_bp.route('/quiz-results', methods=['POST'])
def save_quiz_result():
    """Save quiz completion result"""
    try:
        data = request.get_json()
        
        # Create result document
        result_doc = {
            'quiz_id': data.get('quiz_id'),
            'is_correct': data.get('is_correct'),
            'time_taken': data.get('time_taken'),
            'selected_answer': data.get('selected_answer'),
            'correct_answer': data.get('correct_answer'),
            'timestamp': datetime.utcnow()
        }
        
        # You might want to create a separate collection for results
        # For now, we can update the quiz with last attempt info
        if data.get('quiz_id'):
            from bson import ObjectId
            quiz_collection.update_one(
                {'_id': ObjectId(data['quiz_id'])},
                {'$set': {
                    'last_attempt': result_doc,
                    'last_attempted_at': datetime.utcnow()
                }}
            )
        
        return jsonify({'message': 'Result saved successfully'}), 200
        
    except Exception as e:
        print(f"Error in save_quiz_result: {str(e)}")
        return jsonify({'error': f'Failed to save result: {str(e)}'}), 500

# Export the blueprint
def get_flashcards():
    """Helper function to get flashcards - can be called from other modules"""
    try:
        flashcards = list(flashcard_collection.find({}, {'_id': 0}))
        return flashcards
    except Exception as e:
        print(f"Error getting flashcards: {str(e)}")
        return []
