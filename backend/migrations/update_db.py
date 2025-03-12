import sqlite3
import os

# Get the absolute path to the database file
db_path = os.path.join('C:\\Users\\efuet\\Spa\\backend\\instance\\spa.db')
print(f"Connecting to database: {db_path}")

# Connect to your SQLite database using the correct path
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Add the missing datetime column
try:
    # First check if the column already exists
    cursor.execute("PRAGMA table_info(appointments)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'appointment_datetime' not in columns:  # Using the column name from your screenshot
        print("Adding appointment_datetime column...")
        cursor.execute('ALTER TABLE appointments ADD COLUMN appointment_datetime TIMESTAMP')
    else:
        print("Column appointment_datetime already exists")
    
    if 'created_at' not in columns:
        print("Adding created_at column...")
        cursor.execute('ALTER TABLE appointments ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
    else:
        print("Column created_at already exists")
    
    # Update existing records with a default datetime (optional)
    cursor.execute('UPDATE appointments SET appointment_datetime = CURRENT_TIMESTAMP WHERE appointment_datetime IS NULL')
    
    # Commit the changes
    conn.commit()
    print("Changes committed successfully")
except Exception as e:
    print(f"Error: {e}")
    conn.rollback()

# Verify the changes
cursor.execute('PRAGMA table_info(appointments)')
columns = cursor.fetchall()
print("\nUpdated table structure:")
for column in columns:
    print(column)

# Close the connection
conn.close()
