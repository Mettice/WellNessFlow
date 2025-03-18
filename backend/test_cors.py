import requests
import json

def test_login():
    base_url = "http://localhost:5000"
    headers = {
        "Origin": "https://wellnessflow-git-spacontent-dions-projects-0087c2a0.vercel.app",
        "Content-Type": "application/json"
    }
    data = {
        "email": "admin@example.com",
        "password": "admin123"
    }
    
    print("\nTesting login endpoint...")
    try:
        response = requests.post(
            f"{base_url}/api/auth/login",
            headers=headers,
            json=data,
            timeout=30
        )
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        if response.text:
            try:
                print(f"Response: {json.dumps(response.json(), indent=2)}")
            except:
                print(f"Raw response: {response.text}")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    print("Starting login test...")
    test_login()