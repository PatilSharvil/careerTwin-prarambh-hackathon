from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint_and_request_id():
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
    # Request-ID header middleware check
    assert "X-Request-Id" in response.headers
    assert len(response.headers["X-Request-Id"]) > 0


def test_custom_request_id_propagated():
    custom_id = "test-req-12345"
    response = client.get("/api/health", headers={"X-Request-Id": custom_id})
    assert response.status_code == 200
    assert response.headers.get("X-Request-Id") == custom_id

