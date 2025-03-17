import os
import sys
from pathlib import Path

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from models.database import Base, engine, init_db
from sqlalchemy import text

def migrate_database():
    print("Starting database migration...")
    
    # Create new tables and columns
    Base.metadata.create_all(bind=engine)
    
    # Add created_at and updated_at to appointments if they don't exist
    with engine.connect() as connection:
        try:
            connection.execute(text("""
                ALTER TABLE appointments 
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            """))
            print("Added created_at and updated_at to appointments table")
        except Exception as e:
            print(f"Error adding columns to appointments: {e}")
            
        try:
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS chat_conversations (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR UNIQUE,
                    spa_id VARCHAR,
                    client_name VARCHAR,
                    client_email VARCHAR,
                    messages JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("Created chat_conversations table")
        except Exception as e:
            print(f"Error creating chat_conversations table: {e}")
            
        connection.commit()
        
    print("Database migration completed")

if __name__ == "__main__":
    migrate_database() 