import sqlite3
import psycopg2
import os
from datetime import datetime
import json
from urllib.parse import urlparse
from dotenv import load_dotenv
import sys
from pathlib import Path

# Add the parent directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

# Load environment variables from .env file
load_dotenv()

# Force production mode and set DATABASE_URL before importing models
os.environ['FLASK_ENV'] = 'production'
database_url = os.getenv('DATABASE_URL')
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)
os.environ['DATABASE_URL'] = database_url

def clean_json_data(data):
    """Convert None to empty dict/list for JSON fields"""
    if data is None:
        return {}
    if isinstance(data, str):
        try:
            return json.loads(data)
        except:
            return data
    return data

def migrate_data():
    print("Starting migration process...")
    
    # Source SQLite database
    sqlite_conn = sqlite3.connect('instance/spa.db')
    sqlite_cur = sqlite_conn.cursor()
    
    # Get DATABASE_URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is not set. Please check your .env file.")
    
    print(f"Using database URL: {database_url}")
    
    # Convert postgres:// to postgresql:// if needed
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    print("Connecting to PostgreSQL...")
    # Target PostgreSQL database
    try:
        pg_conn = psycopg2.connect(database_url)
        print("Successfully connected to PostgreSQL!")
        pg_cur = pg_conn.cursor()

        # Create tables first
        from models.database import Base, engine
        print(f"Engine URL: {engine.url}")
        print("Creating tables in PostgreSQL...")
        
        # Drop all tables first to ensure clean state
        print("Dropping existing tables...")
        Base.metadata.drop_all(bind=engine)
        
        print("Creating new tables...")
        Base.metadata.create_all(bind=engine)
        
        # Verify tables were created
        pg_cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = pg_cur.fetchall()
        print("Created tables:", [table[0] for table in tables])

        # Migrate clients first (since other tables depend on it)
        print("Migrating clients...")
        sqlite_cur.execute("SELECT * FROM clients")
        clients = sqlite_cur.fetchall()
        for client in clients:
            pg_cur.execute("""
                INSERT INTO clients (id, spa_id, name, email, phone, subscription_plan, 
                                   subscription_status, subscription_id, trial_ends_at,
                                   config, api_keys, calendar_type, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, client)

        # Migrate users
        print("Migrating users...")
        sqlite_cur.execute("SELECT * FROM users")
        users = sqlite_cur.fetchall()
        for user in users:
            pg_cur.execute("""
                INSERT INTO users (id, spa_id, email, password_hash, role, is_active,
                                 last_login, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, user)

        # Migrate services
        print("Migrating services...")
        sqlite_cur.execute("SELECT * FROM services")
        services = sqlite_cur.fetchall()
        for service in services:
            # Clean JSON fields
            benefits = clean_json_data(service[6])
            contraindications = clean_json_data(service[7])
            pg_cur.execute("""
                INSERT INTO services (id, spa_id, name, duration, price, description,
                                    benefits, contraindications)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (*service[:6], json.dumps(benefits), json.dumps(contraindications)))

        # Migrate locations
        print("Migrating locations...")
        sqlite_cur.execute("SELECT * FROM locations")
        locations = sqlite_cur.fetchall()
        for location in locations:
            business_hours = clean_json_data(location[10])
            pg_cur.execute("""
                INSERT INTO locations (id, spa_id, name, address, city, state, zip_code,
                                     phone, email, is_primary, business_hours, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (*location[:10], json.dumps(business_hours), *location[11:]))

        # Migrate appointments
        print("Migrating appointments...")
        sqlite_cur.execute("SELECT * FROM appointments")
        appointments = sqlite_cur.fetchall()
        for appointment in appointments:
            pg_cur.execute("""
                INSERT INTO appointments (id, spa_id, client_name, client_email, client_phone,
                                        service_id, location_id, appointment_datetime, status,
                                        reminder_sent, feedback_sent, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, appointment)

        # Migrate chat conversations
        print("Migrating chat conversations...")
        sqlite_cur.execute("SELECT * FROM chat_conversations")
        conversations = sqlite_cur.fetchall()
        for conv in conversations:
            messages = clean_json_data(conv[6])
            pg_cur.execute("""
                INSERT INTO chat_conversations (id, session_id, spa_id, user_id, client_email,
                                              client_name, messages, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (*conv[:6], json.dumps(messages), *conv[7:]))

        pg_conn.commit()
        print("Migration completed successfully!")

    except Exception as e:
        pg_conn.rollback()
        print(f"Error during migration: {str(e)}")
        raise
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    migrate_data()
