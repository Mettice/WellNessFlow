import os
from dotenv import load_dotenv
import psycopg2

# Load environment variables
load_dotenv()

def verify_users():
    # Get DATABASE_URL from environment
    database_url = os.getenv('DATABASE_URL')
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    print("Connecting to PostgreSQL...")
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    # Check all users
    print("\nAll Users:")
    cur.execute("SELECT id, email, role, spa_id FROM users")
    users = cur.fetchall()
    for user in users:
        print(f"ID: {user[0]}, Email: {user[1]}, Role: {user[2]}, Spa ID: {user[3]}")
    
    # Check super admin specifically
    print("\nSuper Admin Users:")
    cur.execute("SELECT id, email, role FROM users WHERE role = 'super_admin'")
    super_admins = cur.fetchall()
    for admin in super_admins:
        print(f"ID: {admin[0]}, Email: {admin[1]}, Role: {admin[2]}")
    
    print(f"\nTotal users: {len(users)}")
    print(f"Total super admins: {len(super_admins)}")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    verify_users() 