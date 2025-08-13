# Backend/routes/feedback_routes.py
from flask import Blueprint, request, jsonify
from database import db, quiz_collection, flashcard_collection
from datetime import datetime
from bson import ObjectId

# Create Flask Blueprint for feedback routes
feedback_bp = Blueprint('feedback', __name__)

# Get feedback collection
feedback_collection = db["feedback"]

@feedback_bp.route('/feedback', methods=['POST'])
def submit_feedback():
    """Submit feedback for quiz or flashcard"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['type', 'item_id', 'rating']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Validate feedback type
        if data['type'] not in ['quiz', 'flashcard']:
            return jsonify({'error': 'Type must be either "quiz" or "flashcard"'}), 400
        
        # Validate rating range
        rating = data.get('rating')
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({'error': 'Rating must be an integer between 1 and 5'}), 400
        
        # Create feedback document
        feedback_doc = {
            'type': data['type'],
            'item_id': data['item_id'],
            'rating': rating,
            'comment': data.get('comment', ''),
            'created_at': datetime.utcnow(),
            'user_id': data.get('user_id', 'anonymous')  # Optional user tracking
        }
        
        # Insert into database
        result = feedback_collection.insert_one(feedback_doc)
        
        # Update average rating for the item (optional enhancement)
        update_item_rating(data['type'], data['item_id'])
        
        return jsonify({
            'message': 'Feedback submitted successfully',
            'feedback_id': str(result.inserted_id)
        }), 201
        
    except Exception as e:
        print(f"Error in submit_feedback: {str(e)}")
        return jsonify({'error': f'Failed to submit feedback: {str(e)}'}), 500

@feedback_bp.route('/feedback/<feedback_id>', methods=['GET'])
def get_feedback(feedback_id):
    """Get specific feedback by ID"""
    try:
        feedback = feedback_collection.find_one({'_id': ObjectId(feedback_id)})
        
        if not feedback:
            return jsonify({'error': 'Feedback not found'}), 404
        
        # Format response
        feedback['_id'] = str(feedback['_id'])
        feedback['created_at'] = feedback['created_at'].isoformat()
        
        return jsonify(feedback), 200
        
    except Exception as e:
        print(f"Error in get_feedback: {str(e)}")
        return jsonify({'error': f'Failed to fetch feedback: {str(e)}'}), 500

@feedback_bp.route('/feedback/item/<item_type>/<item_id>', methods=['GET'])
def get_item_feedback(item_type, item_id):
    """Get all feedback for a specific quiz or flashcard"""
    try:
        if item_type not in ['quiz', 'flashcard']:
            return jsonify({'error': 'Invalid item type'}), 400
        
        # Get all feedback for this item
        feedback_cursor = feedback_collection.find({
            'type': item_type,
            'item_id': item_id
        }).sort('created_at', -1)
        
        feedback_list = []
        total_rating = 0
        count = 0
        
        for fb in feedback_cursor:
            feedback_list.append({
                '_id': str(fb['_id']),
                'rating': fb['rating'],
                'comment': fb.get('comment', ''),
                'created_at': fb['created_at'].isoformat(),
                'user_id': fb.get('user_id', 'anonymous')
            })
            total_rating += fb['rating']
            count += 1
        
        # Calculate average rating
        avg_rating = round(total_rating / count, 1) if count > 0 else 0
        
        return jsonify({
            'item_type': item_type,
            'item_id': item_id,
            'total_feedback': count,
            'average_rating': avg_rating,
            'feedback': feedback_list
        }), 200
        
    except Exception as e:
        print(f"Error in get_item_feedback: {str(e)}")
        return jsonify({'error': f'Failed to fetch item feedback: {str(e)}'}), 500

@feedback_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get overall statistics including feedback"""
    try:
        # Count total quizzes and flashcards
        total_quizzes = quiz_collection.count_documents({})
        total_flashcards = flashcard_collection.count_documents({})
        
        # Calculate average rating across all feedback
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "avg_rating": {"$avg": "$rating"},
                    "total_feedback": {"$sum": 1},
                    "total_quiz_feedback": {
                        "$sum": {"$cond": [{"$eq": ["$type", "quiz"]}, 1, 0]}
                    },
                    "total_flashcard_feedback": {
                        "$sum": {"$cond": [{"$eq": ["$type", "flashcard"]}, 1, 0]}
                    }
                }
            }
        ]
        
        rating_result = list(feedback_collection.aggregate(pipeline))
        
        if rating_result:
            stats = rating_result[0]
            avg_rating = stats.get("avg_rating", 0)
            total_feedback = stats.get("total_feedback", 0)
            quiz_feedback = stats.get("total_quiz_feedback", 0)
            flashcard_feedback = stats.get("total_flashcard_feedback", 0)
        else:
            avg_rating = 0
            total_feedback = 0
            quiz_feedback = 0
            flashcard_feedback = 0
        
        # Get rating distribution
        rating_dist_pipeline = [
            {
                "$group": {
                    "_id": "$rating",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        rating_distribution = list(feedback_collection.aggregate(rating_dist_pipeline))
        
        # Format rating distribution
        rating_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for item in rating_distribution:
            if item["_id"] in rating_dist:
                rating_dist[item["_id"]] = item["count"]
        
        # Get 5 most recent feedback entries
        recent_feedback = list(
            feedback_collection.find({})
            .sort("created_at", -1)
            .limit(5)
        )
        
        # Format recent feedback for response
        formatted_feedback = []
        for fb in recent_feedback:
            formatted_feedback.append({
                "type": fb["type"],
                "item_id": fb["item_id"],
                "rating": fb["rating"],
                "comment": fb.get("comment", ""),
                "created_at": fb["created_at"].isoformat()
            })
        
        return jsonify({
            "total_quizzes": total_quizzes,
            "total_flashcards": total_flashcards,
            "total_feedback": total_feedback,
            "quiz_feedback_count": quiz_feedback,
            "flashcard_feedback_count": flashcard_feedback,
            "average_rating": round(avg_rating, 1) if avg_rating else 0,
            "rating_distribution": rating_dist,
            "recent_feedback": formatted_feedback
        }), 200
        
    except Exception as e:
        print(f"Error in get_stats: {str(e)}")
        return jsonify({"error": f"Error fetching stats: {str(e)}"}), 500

@feedback_bp.route('/feedback/<feedback_id>', methods=['DELETE'])
def delete_feedback(feedback_id):
    """Delete specific feedback (admin function)"""
    try:
        result = feedback_collection.delete_one({'_id': ObjectId(feedback_id)})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Feedback not found'}), 404
        
        return jsonify({'message': 'Feedback deleted successfully'}), 200
        
    except Exception as e:
        print(f"Error in delete_feedback: {str(e)}")
        return jsonify({'error': f'Failed to delete feedback: {str(e)}'}), 500

# Helper function to update item ratings
def update_item_rating(item_type, item_id):
    """Update the average rating for a quiz or flashcard"""
    try:
        # Calculate average rating for this item
        pipeline = [
            {
                "$match": {
                    "type": item_type,
                    "item_id": item_id
                }
            },
            {
                "$group": {
                    "_id": None,
                    "avg_rating": {"$avg": "$rating"},
                    "total_ratings": {"$sum": 1}
                }
            }
        ]
        
        result = list(feedback_collection.aggregate(pipeline))
        
        if result:
            avg_rating = result[0]["avg_rating"]
            total_ratings = result[0]["total_ratings"]
            
            # Update the item's collection with the new rating
            if item_type == 'quiz':
                quiz_collection.update_one(
                    {'_id': ObjectId(item_id)},
                    {'$set': {
                        'average_rating': round(avg_rating, 1),
                        'total_ratings': total_ratings
                    }}
                )
            elif item_type == 'flashcard':
                flashcard_collection.update_one(
                    {'_id': ObjectId(item_id)},
                    {'$set': {
                        'average_rating': round(avg_rating, 1),
                        'total_ratings': total_ratings
                    }}
                )
                
    except Exception as e:
        print(f"Error updating item rating: {str(e)}")
        # Don't fail the main operation if rating update fails
        pass