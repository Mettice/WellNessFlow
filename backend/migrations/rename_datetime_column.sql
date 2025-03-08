-- Rename datetime column to appointment_datetime in appointments table
-- SQLite doesn't support direct column renaming, so we need to create a new table

-- Create temporary table with the desired schema
CREATE TABLE IF NOT EXISTS appointments_temp (
    id INTEGER PRIMARY KEY,
    spa_id TEXT,
    client_name TEXT,
    client_email TEXT,
    client_phone TEXT,
    service_id INTEGER,
    location_id INTEGER,
    appointment_datetime DATETIME,
    status TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    feedback_sent BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Copy data from existing table to temp table, renaming the column in the process
INSERT INTO appointments_temp (
    id, spa_id, client_name, client_email, client_phone, service_id, location_id, 
    appointment_datetime, status, reminder_sent, feedback_sent, notes, created_at, updated_at
)
SELECT 
    id, spa_id, client_name, client_email, client_phone, service_id, location_id, 
    datetime, status, reminder_sent, feedback_sent, notes, created_at, updated_at 
FROM appointments;

-- Drop existing table
DROP TABLE IF EXISTS appointments;

-- Rename temp table to the correct name
ALTER TABLE appointments_temp RENAME TO appointments; 