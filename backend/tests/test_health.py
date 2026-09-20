from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "llm" in data
    assert "chain" in data["llm"]
    assert "primary" in data["llm"]
    assert data["chroma"] in ["ok", "error"]
    assert data["db"] in ["ok", "error"]

def test_unimplemented_endpoint():
    response = client.post("/api/coach", json={"message": "hello", "session_id": "s1"})
    assert response.status_code == 501
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_IMPLEMENTED"
