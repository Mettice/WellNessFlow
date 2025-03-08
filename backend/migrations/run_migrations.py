"""
Script to run all database migrations
"""
import os
import sys
import sqlite3

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import migration modules
from migrations.update_schema import upgrade as update_schema

def run_sql_script(script_path, db_path):
    """Run a SQL script on the database"""
    try:
        # Read SQL script
        with open(script_path, 'r') as f:
            sql_script = f.read()
        
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Execute SQL script
        cursor.executescript(sql_script)
        
        # Commit changes
        conn.commit()
        print(f"Successfully executed SQL script: {script_path}")
        return True
    except Exception as e:
        print(f"Error executing SQL script {script_path}: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def run_migrations():
    """Run all migrations"""
    print("Starting database migrations...")
    
    # Database path
    db_path = "instance/spa.db"
    
    # Ensure database directory exists
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    # Run schema updates
    print("\nRunning schema updates...")
    update_schema()
    
    # Run SQL script for column renaming
    print("\nRunning metadata column rename...")
    sql_script_path = os.path.join(os.path.dirname(__file__), "rename_metadata_column.sql")
    run_sql_script(sql_script_path, db_path)
    
    # Run SQL script for datetime column renaming
    print("\nRunning datetime column rename...")
    sql_script_path = os.path.join(os.path.dirname(__file__), "rename_datetime_column.sql")
    run_sql_script(sql_script_path, db_path)
    
    print("\nAll migrations completed!")

if __name__ == "__main__":
    run_migrations() 