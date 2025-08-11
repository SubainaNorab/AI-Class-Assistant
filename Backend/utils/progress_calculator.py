# Backend/utils/progress_calculator.py 

from datetime import datetime, timezone, timedelta
from database import quiz_collection, flashcard_collection, feedback_collection

def calculate_quiz_statistics():
    """
    Calculate comprehensive quiz statistics
    
    Returns:
        dict: Quiz statistics
    """
    total_quizzes = quiz_collection.count_documents({})
    
    # Get quiz creation timeline
    pipeline = [
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"},
                    "day": {"$dayOfMonth": "$created_at"}
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}},
        {"$limit": 30}  # Last 30 days
    ]
    
    daily_stats = list(quiz_collection.aggregate(pipeline))
    
    # Format daily stats
    formatted_daily = []
    for stat in daily_stats:
        date_str = f"{stat['_id']['year']}-{stat['_id']['month']:02d}-{stat['_id']['day']:02d}"
        formatted_daily.append({
            "date": date_str,
            "quizzes_generated": stat["count"]
        })
    
    return {
        "total_generated": total_quizzes,
        "daily_generation": formatted_daily,
        "average_per_day": total_quizzes / max(len(daily_stats), 1)
    }

def calculate_flashcard_statistics():
    """
    Calculate comprehensive flashcard statistics
    
    Returns:
        dict: Flashcard statistics
    """
    total_flashcards = flashcard_collection.count_documents({})
    
    # Lecture breakdown
    pipeline = [
        {
            "$group": {
                "_id": "$lecture_title",
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    lecture_breakdown = list(flashcard_collection.aggregate(pipeline))
    
    # Recent activity (last 7 days)
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_count = flashcard_collection.count_documents({
        'created_at': {'$gte': seven_days_ago}
    })
    
    return {
        "total_created": total_flashcards,
        "recent_7_days": recent_count,
        "lecture_breakdown": lecture_breakdown,
        "average_per_lecture": total_flashcards / max(len(lecture_breakdown), 1)
    }

def calculate_user_progress(user_id=None):
    """
    Calculate user-specific progress metrics
    
    Args:
        user_id (str): User identifier (optional)
        
    Returns:
        dict: User progress data
    """
    # For now, return mock data since we don't have user-specific tracking yet
    # In a real implementation, you would filter by user_id
    
    quiz_stats = calculate_quiz_statistics()
    flashcard_stats = calculate_flashcard_statistics()
    
    # Mock performance data - in real app, this would come from user quiz attempts
    mock_performance = [
        {"date": "2024-08-05", "score": 0.7, "questions_answered": 15},
        {"date": "2024-08-06", "score": 0.8, "questions_answered": 20},
        {"date": "2024-08-07", "score": 0.75, "questions_answered": 10},
        {"date": "2024-08-08", "score": 0.85, "questions_answered": 25},
        {"date": "2024-08-09", "score": 0.9, "questions_answered": 18},
        {"date": "2024-08-10", "score": 0.72, "questions_answered": 22},
        {"date": "2024-08-11", "score": 0.88, "questions_answered": 16}
    ]
    
    # Calculate overall metrics
    total_questions = sum(day["questions_answered"] for day in mock_performance)
    average_score = sum(day["score"] for day in mock_performance) / len(mock_performance)
    
    return {
        "user_id": user_id or "default",
        "quiz_statistics": quiz_stats,
        "flashcard_statistics": flashcard_stats,
        "performance_data": mock_performance,
        "overall_metrics": {
            "total_questions_answered": total_questions,
            "average_score": round(average_score, 3),
            "total_study_sessions": len(mock_performance),
            "improvement_trend": "positive"  # Could calculate actual trend
        }
    }

def get_learning_insights(user_id=None):
    """
    Generate learning insights and recommendations
    
    Args:
        user_id (str): User identifier
        
    Returns:
        dict: Learning insights
    """
    progress = calculate_user_progress(user_id)
    
    insights = []
    recommendations = []
    
    # Analyze performance trend
    performance_data = progress["performance_data"]
    if len(performance_data) >= 3:
        recent_scores = [day["score"] for day in performance_data[-3:]]
        early_scores = [day["score"] for day in performance_data[:3]]
        
        if sum(recent_scores) > sum(early_scores):
            insights.append("Your performance has improved over time!")
            recommendations.append("Keep up the consistent practice.")
        else:
            insights.append("Consider reviewing areas where you struggled.")
            recommendations.append("Try focusing on weaker topics.")
    
    # Analyze study consistency
    total_sessions = progress["overall_metrics"]["total_study_sessions"]
    if total_sessions >= 7:
        insights.append("Great consistency! You've been studying regularly.")
    elif total_sessions >= 3:
        insights.append("Good start! Try to study more consistently.")
        recommendations.append("Aim for daily study sessions.")
    else:
        recommendations.append("Try to establish a regular study routine.")
    
    # Analyze quiz vs flashcard usage
    quiz_count = progress["quiz_statistics"]["total_generated"]
    flashcard_count = progress["flashcard_statistics"]["total_created"]
    
    if flashcard_count > quiz_count * 2:
        recommendations.append("Consider taking more quizzes to test your knowledge.")
    elif quiz_count > flashcard_count * 2:
        recommendations.append("Create more flashcards for better retention.")
    
    return {
        "insights": insights,
        "recommendations": recommendations,
        "study_streak": 7,  # Mock data
        "next_milestone": "Complete 50 quiz questions"
    }