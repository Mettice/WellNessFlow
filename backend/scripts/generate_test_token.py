import os
import sys

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from flask_jwt_extended import create_access_token

app = create_app()

with app.app_context():
    # Use the same value for identity and spa_id for consistency
    spa_id = "1"
    token = create_access_token(
        identity=spa_id,
        additional_claims={"spa_id": spa_id}
    )
    print(f"Generated test token with spa_id={spa_id}")
    print(token) 