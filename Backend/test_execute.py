"""
Test script to verify /execute-code endpoint is working
Run this while backend is running to debug issues
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_root():
    """Test root endpoint"""
    print("\n" + "="*60)
    print("Testing ROOT endpoint...")
    print("="*60)
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"✅ Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_health():
    """Test health endpoint"""
    print("\n" + "="*60)
    print("Testing HEALTH endpoint...")
    print("="*60)
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"✅ Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_execute_python():
    """Test execute-code endpoint with Python"""
    print("\n" + "="*60)
    print("Testing EXECUTE-CODE endpoint (Python)...")
    print("="*60)
    
    payload = {
        "code": "print('Hello from Python!')\nprint(2 + 2)",
        "language": "python"
    }
    
    print(f"Request URL: {BASE_URL}/execute-code")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/execute-code",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        print(f"\n✅ Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

def test_execute_javascript():
    """Test execute-code endpoint with JavaScript"""
    print("\n" + "="*60)
    print("Testing EXECUTE-CODE endpoint (JavaScript)...")
    print("="*60)
    
    payload = {
        "code": "console.log('Hello from JavaScript!');\nconsole.log(2 + 2);",
        "language": "javascript"
    }
    
    print(f"Request URL: {BASE_URL}/execute-code")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/execute-code",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        print(f"\n✅ Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("🧪 Prepped.ai Backend Testing Suite")
    print("="*60)
    print("\n⚠️  Make sure backend is running first!")
    print("Run: python main.py\n")
    
    results = {
        "Root Endpoint": test_root(),
        "Health Check": test_health(),
        "Execute Python": test_execute_python(),
        "Execute JavaScript": test_execute_javascript()
    }
    
    print("\n" + "="*60)
    print("📊 TEST RESULTS SUMMARY")
    print("="*60)
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(results.values())
    print("="*60)
    if all_passed:
        print("🎉 All tests passed!")
    else:
        print("⚠️  Some tests failed. Check logs above.")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
