import os
import sys

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from flask_jwt_extended import create_access_token

app = create_app()

with app.app_context():
    token = create_access_token(
        identity="1",
        additional_claims={"spa_id": "default"}
    )
    print(token) 