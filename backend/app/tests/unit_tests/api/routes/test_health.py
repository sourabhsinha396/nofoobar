def test_health_returns_ok(client, mock_session):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    mock_session.execute.assert_called_once()
