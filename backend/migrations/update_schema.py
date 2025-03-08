"""
Migration script to update database schema:
1. Add 'created_at' and 'updated_at' columns to appointments table
"""

import sys
import os
import sqlite3
from datetime import datetime

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def upgrade():
    """Update database schema"""
    try:
        # Database path
        db_path = "instance/spa.db"
        
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if appointments table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'")
        if cursor.fetchone():
            # Check if created_at and updated_at columns exist
            cursor.execute("PRAGMA table_info(appointments)")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]
            
            if 'created_at' not in column_names:
                print("Adding 'created_at' column to appointments table...")
                cursor.execute("ALTER TABLE appointments ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP")
                print("Successfully added 'created_at' column")
            
            if 'updated_at' not in column_names:
                print("Adding 'updated_at' column to appointments table...")
                cursor.execute("ALTER TABLE appointments ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP")
                print("Successfully added 'updated_at' column")
        
        # Commit changes
        conn.commit()
        print("Migration successful: Updated database schema")
        return True
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Migration failed: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def downgrade():
    """Revert schema changes"""
    try:
        # Database path
        db_path = "instance/spa.db"
        
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if appointments table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'")
        if cursor.fetchone():
            # Check if created_at and updated_at columns exist
            cursor.execute("PRAGMA table_info(appointments)")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]
            
            # SQLite doesn't support dropping columns directly
            # We would need to create a new table without those columns
            # and copy the data, which is complex and not implemented here
            print("Warning: SQLite doesn't support dropping columns directly.")
            print("To remove columns, you would need to recreate the table.")
        
        # Commit changes
        conn.commit()
        print("Downgrade completed with warnings")
        return True
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Downgrade failed: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == 'downgrade':
        downgrade()
    else:
        upgrade() 