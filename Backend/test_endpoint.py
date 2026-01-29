import requests
import json

# Test the execute-code endpoint
def test_execute_code():
    url = "http://localhost:8000/execute-code"
    
    # Test Python code
    payload = {
        "code": "print('Hello from Python!')\nprint(2 + 2)",
        "language": "python"
    }
    
    print("Testing /execute-code endpoint...")
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload)
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    test_execute_code()
