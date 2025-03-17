import os

# Force production environment
os.environ['FLASK_ENV'] = 'production'

# Database Configuration
if os.getenv('FLASK_ENV') == 'production':
    DATABASE_URL = os.getenv('DATABASE_URL', os.getenv('DATABASE_PUBLIC_URL'))
    if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = "sqlite:///./instance/spa.db"

# Print the database URL being used (with password masked)
if DATABASE_URL:
    masked_url = DATABASE_URL.replace(DATABASE_URL.split('@')[0].split(':')[-1], '***')
    print(f"Config: Using database URL: {masked_url}")

# Export the DATABASE_URL
os.environ['DATABASE_URL'] = DATABASE_URL

class Config:
    DATABASE_URL = DATABASE_URL
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False