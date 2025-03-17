import sqlite3
import psycopg2
import os
import json
from datetime import datetime

def migrate_data():
    # Source SQLite database
    sqlite_conn = sqlite3.connect('instance/spa.db')
    sqlite_cur = sqlite_conn.cursor()
    
    # Target PostgreSQL database
    pg_conn = psycopg2.connect(
        dbname=os.getenv('PGDATABASE'),
        user=os.getenv('PGUSER'),
        password=os.getenv('PGPASSWORD'),
        host=os.getenv('PGHOST'),
        port=os.getenv('PGPORT')
    )
    pg_cur = pg_conn.cursor()

    try:
        # Migrate users
        sqlite_cur.execute("SELECT * FROM users")
        users = sqlite_cur.fetchall()
        for user in users:
            pg_cur.execute("""
                INSERT INTO users (id, email, password_hash, role, is_active, spa_id, 
                                 last_login, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, user)

        # Migrate clients
        sqlite_cur.execute("SELECT * FROM clients")
        clients = sqlite_cur.fetchall()
        for client in clients:
            pg_cur.execute("""
                INSERT INTO clients (spa_id, name, email, subscription_plan, 
                                   subscription_status, config, api_keys)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, client)

        # Migrate services
        sqlite_cur.execute("SELECT * FROM services")
        services = sqlite_cur.fetchall()
        for service in services:
            pg_cur.execute("""
                INSERT INTO services (id, spa_id, name, duration, price, 
                                    description, benefits, contraindications)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, service)

        # Migrate appointments
        sqlite_cur.execute("SELECT * FROM appointments")
        appointments = sqlite_cur.fetchall()
        for appointment in appointments:
            pg_cur.execute("""
                INSERT INTO appointments (id, spa_id, client_name, client_email, 
                                        client_phone, service_id, location_id, 
                                        appointment_datetime, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, appointment)

        # Migrate chat_conversations
        sqlite_cur.execute("SELECT * FROM chat_conversations")
        conversations = sqlite_cur.fetchall()
        for conv in conversations:
            pg_cur.execute("""
                INSERT INTO chat_conversations (id, session_id, spa_id, user_id, 
                                              client_email, client_name, messages,
                                              created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, conv)

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