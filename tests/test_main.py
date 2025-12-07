"""Comprehensive unit tests for backend/main.py FastAPI endpoints."""

import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_conversation():
    """Mock conversation data."""
    return {
        "id": "test-conv-123",
        "created_at": "2024-01-01T00:00:00",
        "title": "Test Conversation",
        "messages": []
    }


@pytest.fixture
def mock_conversation_with_messages():
    """Mock conversation with existing messages."""
    return {
        "id": "test-conv-456",
        "created_at": "2024-01-01T00:00:00",
        "title": "Existing Conversation",
        "messages": [
            {"role": "user", "content": "Previous question"},
            {"role": "assistant", "stage3": {"response": "Previous answer"}}
        ]
    }


class TestRootEndpoint:
    """Tests for root health check endpoint."""

    def test_root_returns_ok(self, client):
        """Test that root endpoint returns OK status."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data

    def test_root_returns_service_name(self, client):
        """Test that root endpoint includes service name."""
        response = client.get("/")
        data = response.json()
        assert data["service"] == "LLM Council API"


class TestListConversations:
    """Tests for listing conversations endpoint."""

    def test_list_conversations_empty(self, client):
        """Test listing conversations when none exist."""
        with patch("backend.main.storage.list_conversations") as mock_list:
            mock_list.return_value = []
            
            response = client.get("/api/conversations")
            assert response.status_code == 200
            assert response.json() == []

    def test_list_conversations_with_data(self, client):
        """Test listing conversations with existing data."""
        mock_convs = [
            {
                "id": "conv-1",
                "created_at": "2024-01-01T00:00:00",
                "title": "First Conv",
                "message_count": 2
            },
            {
                "id": "conv-2",
                "created_at": "2024-01-02T00:00:00",
                "title": "Second Conv",
                "message_count": 4
            }
        ]
        
        with patch("backend.main.storage.list_conversations") as mock_list:
            mock_list.return_value = mock_convs
            
            response = client.get("/api/conversations")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["id"] == "conv-1"
            assert data[1]["title"] == "Second Conv"


class TestCreateConversation:
    """Tests for creating new conversation endpoint."""

    def test_create_conversation_success(self, client, mock_conversation):
        """Test successful conversation creation."""
        with patch("backend.main.storage.create_conversation") as mock_create:
            mock_create.return_value = mock_conversation
            
            response = client.post("/api/conversations", json={})
            assert response.status_code == 200
            data = response.json()
            assert "id" in data
            assert "created_at" in data
            assert "title" in data

    def test_create_conversation_generates_uuid(self, client, mock_conversation):
        """Test that create generates a UUID for new conversation."""
        with patch("backend.main.storage.create_conversation") as mock_create:
            with patch("backend.main.uuid.uuid4") as mock_uuid:
                mock_uuid.return_value = MagicMock(__str__=lambda x: "generated-uuid")
                mock_create.return_value = mock_conversation
                
                response = client.post("/api/conversations", json={})
                mock_create.assert_called_once_with("generated-uuid")


class TestGetConversation:
    """Tests for getting specific conversation endpoint."""

    def test_get_conversation_success(self, client, mock_conversation):
        """Test successfully retrieving a conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation
            
            response = client.get("/api/conversations/test-conv-123")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "test-conv-123"
            assert data["title"] == "Test Conversation"

    def test_get_conversation_not_found(self, client):
        """Test getting non-existent conversation returns 404."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.get("/api/conversations/nonexistent")
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()


class TestSendMessage:
    """Tests for sending message endpoint (non-streaming)."""

    def test_send_message_conversation_not_found(self, client):
        """Test sending message to non-existent conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.post(
                "/api/conversations/nonexistent/message",
                json={"content": "Test"}
            )
            
            assert response.status_code == 404

    def test_send_message_empty_content(self, client, mock_conversation):
        """Test sending message with empty content."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation
            
            response = client.post(
                "/api/conversations/test-conv-123/message",
                json={"content": ""}
            )
            
            # Should process or return validation error
            assert response.status_code in [200, 422]


class TestSendMessageStream:
    """Tests for sending message with streaming endpoint."""

    def test_stream_conversation_not_found(self, client):
        """Test streaming to non-existent conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.post(
                "/api/conversations/nonexistent/message/stream",
                json={"content": "Test"}
            )
            
            assert response.status_code == 404


class TestRequestValidation:
    """Tests for request body validation."""

    def test_send_message_missing_content_field(self, client, mock_conversation):
        """Test sending message without content field."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation
            
            response = client.post(
                "/api/conversations/test-conv-123/message",
                json={}
            )
            
            assert response.status_code == 422  # Validation error

    def test_send_message_invalid_json(self, client):
        """Test sending message with invalid JSON."""
        response = client.post(
            "/api/conversations/test-conv-123/message",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422
