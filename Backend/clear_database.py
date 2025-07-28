import sqlite3
import os

def clear_flashcard_database():
    """Clear the flashcard database to force new generation"""
    print("🗑️ Clearing flashcard database...")
    
    db_path = 'flashcards.db'
    
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Delete all flashcards
            cursor.execute('DELETE FROM flashcards')
            
            # Get count of deleted records
            deleted_count = cursor.rowcount
            
            conn.commit()
            conn.close()
            
            print(f"✅ Deleted {deleted_count} old flashcards from database")
            print("🔄 New flashcard generation will now work properly")
            
        except Exception as e:
            print(f"❌ Error clearing database: {e}")
    else:
        print("📝 No existing database found - this is normal for first run")

if __name__ == "__main__":
    clear_flashcard_database()