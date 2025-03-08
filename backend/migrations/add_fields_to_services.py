"""
Migration script to add new fields to the services table
"""
import sys
import os
from datetime import datetime
from sqlalchemy import create_engine, Column, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from alembic import op
import sqlalchemy as sa

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import Base, SpaService

def upgrade():
    """Add new columns to the services table"""
    try:
        # Get database URL from environment or use default
        database_url = os.environ.get('DATABASE_URL', 'sqlite:///./spa_platform.db')
        
        # Create engine and session
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        # Add columns using Alembic operations
        op.add_column('services', sa.Column('spa_id', sa.String(), nullable=True))
        op.add_column('services', sa.Column('service_type', sa.String(), nullable=True, server_default='regular'))
        op.add_column('services', sa.Column('parent_type', sa.String(), nullable=True))
        op.add_column('services', sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()))
        op.add_column('services', sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.func.now()))
        
        # Create index on spa_id
        op.create_index(op.f('ix_services_spa_id'), 'services', ['spa_id'], unique=False)
        
        print("Migration successful: Added new columns to services table")
        return True
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return False

def downgrade():
    """Remove the new columns from the services table"""
    try:
        # Drop columns
        op.drop_index(op.f('ix_services_spa_id'), table_name='services')
        op.drop_column('services', 'updated_at')
        op.drop_column('services', 'created_at')
        op.drop_column('services', 'parent_type')
        op.drop_column('services', 'service_type')
        op.drop_column('services', 'spa_id')
        
        print("Downgrade successful: Removed columns from services table")
        return True
    except Exception as e:
        print(f"Downgrade failed: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == 'downgrade':
        downgrade()
    else:
        upgrade() 