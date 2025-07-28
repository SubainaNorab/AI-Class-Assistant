from fastapi import APIRouter
from .quiz_generator import generate_quiz_from_pdf
from .database import quiz_collection, flashcard_collection

router = APIRouter()

@router.post("/generate-quiz/")
async def generate_quiz(file: UploadFile = File(...)):
    content = await file.read()

    quiz_data = generate_quiz_from_pdf(content)  # from PDF content

    # Save to MongoDB
    if quiz_data:
        quiz_collection.insert_many(quiz_data["quiz"])
        flashcard_collection.insert_many(quiz_data["flashcards"])
    
    return {"message": "Quiz and flashcards saved to database."}
