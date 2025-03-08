-- Rename chat_messages_new table to chat_messages
-- The column is already named message_metadata, so we just need to rename the table

-- Create temporary table with the same schema
CREATE TABLE IF NOT EXISTS chat_messages_temp (
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_user BOOLEAN DEFAULT TRUE,
    timestamp DATETIME,
    message_metadata JSON,
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
);

-- Copy data from existing table to temp table (column names are already correct)
INSERT INTO chat_messages_temp (id, conversation_id, content, is_user, timestamp, message_metadata)
SELECT id, conversation_id, content, is_user, timestamp, message_metadata FROM chat_messages_new;

-- Drop existing table
DROP TABLE IF EXISTS chat_messages_new;

-- Rename temp table to the correct name
ALTER TABLE chat_messages_temp RENAME TO chat_messages; 