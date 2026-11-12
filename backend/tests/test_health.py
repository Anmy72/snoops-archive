from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_reports_service_name():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "name": "Snoops Archive API",
        "status": "online",
    }


def test_health_reports_online():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "online",
        "service": "Snoops Archive API",
    }
