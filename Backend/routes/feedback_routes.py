# Backend/routes/feedback_routes.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db
from datetime import datetime
from typing import Optional

router = APIRouter()

# Create feedback collection
feedback_collection = db["feedback"]

class FeedbackInput(BaseModel):
    type: str  # "quiz" or "flashcard"
    item_id: str
    rating: int  # 1-5 stars
    comment: Optional[str] = ""

@router.post("/feedback")
async def submit_feedback(feedback: FeedbackInput):
    try:
        if feedback.rating < 1 or feedback.rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
        feedback_doc = {
            "type": feedback.type,
            "item_id": feedback.item_id,
            "rating": feedback.rating,
            "comment": feedback.comment,
            "created_at": datetime.utcnow()
        }
        
        result = feedback_collection.insert_one(feedback_doc)
        
        return {
            "message": "Feedback submitted successfully",
            "feedback_id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting feedback: {str(e)}")

@router.get("/stats")
async def get_stats():
    try:
        from database import quiz_collection, flashcard_collection
        
        # Count total quizzes and flashcards
        total_quizzes = quiz_collection.count_documents({})
        total_flashcards = flashcard_collection.count_documents({})
        
        # Calculate average rating
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "avg_rating": {"$avg": "$rating"},
                    "total_feedback": {"$sum": 1}
                }
            }
        ]
        
        rating_result = list(feedback_collection.aggregate(pipeline))
        avg_rating = rating_result[0]["avg_rating"] if rating_result else 0
        
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
                "rating": fb["rating"],
                "comment": fb.get("comment", ""),
                "created_at": fb["created_at"].isoformat()
            })
        
        return {
            "total_quizzes": total_quizzes,
            "total_flashcards": total_flashcards,
            "avg_rating": round(avg_rating, 1) if avg_rating else 0,
            "recent_feedback": formatted_feedback
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")