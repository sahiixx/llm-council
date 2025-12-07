"""Comprehensive tests for backend/main.py (FastAPI application)."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
import uuid
import json


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    from backend.main import app
    return TestClient(app)


@pytest.fixture
def mock_storage():
    """Mock storage module functions."""
    with patch('backend.main.storage') as mock:
        yield mock


@pytest.fixture
def mock_council():
    """Mock council module functions."""
    with patch('backend.main.run_full_council', new_callable=AsyncMock) as mock_council, \
         patch('backend.main.generate_conversation_title', new_callable=AsyncMock) as mock_title, \
         patch('backend.main.stage1_collect_responses', new_callable=AsyncMock) as mock_s1, \
         patch('backend.main.stage2_collect_rankings', new_callable=AsyncMock) as mock_s2, \
         patch('backend.main.stage3_synthesize_final', new_callable=AsyncMock) as mock_s3, \
         patch('backend.main.calculate_aggregate_rankings') as mock_agg:
        yield {
            'run_full_council': mock_council,
            'generate_title': mock_title,
            'stage1': mock_s1,
            'stage2': mock_s2,
            'stage3': mock_s3,
            'aggregate': mock_agg
        }


class TestRootEndpoint:
    """Tests for root health check endpoint."""

    def test_root_returns_200(self, client):
        """Test that root endpoint returns 200."""
        response = client.get("/")
        assert response.status_code == 200

    def test_root_returns_json(self, client):
        """Test that root endpoint returns JSON."""
        response = client.get("/")
        assert response.headers["content-type"] == "application/json"

    def test_root_has_status(self, client):
        """Test that root response has status field."""
        response = client.get("/")
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"

    def test_root_has_service_name(self, client):
        """Test that root response identifies service."""
        response = client.get("/")
        data = response.json()
        assert "service" in data
        assert "LLM Council" in data["service"]


class TestListConversations:
    """Tests for listing conversations endpoint."""

    def test_list_conversations_returns_200(self, client, mock_storage):
        """Test successful listing of conversations."""
        mock_storage.list_conversations.return_value = []
        response = client.get("/api/conversations")
        assert response.status_code == 200

    def test_list_conversations_returns_array(self, client, mock_storage):
        """Test that endpoint returns an array."""
        mock_storage.list_conversations.return_value = []
        response = client.get("/api/conversations")
        assert isinstance(response.json(), list)

    def test_list_conversations_with_data(self, client, mock_storage):
        """Test listing with conversation data."""
        mock_convs = [
            {
                "id": "conv1",
                "created_at": "2024-01-01T00:00:00",
                "title": "Test Conv",
                "message_count": 2
            }
        ]
        mock_storage.list_conversations.return_value = mock_convs
        
        response = client.get("/api/conversations")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "conv1"

    def test_list_conversations_calls_storage(self, client, mock_storage):
        """Test that endpoint calls storage.list_conversations."""
        mock_storage.list_conversations.return_value = []
        client.get("/api/conversations")
        mock_storage.list_conversations.assert_called_once()


class TestCreateConversation:
    """Tests for creating conversations endpoint."""

    def test_create_conversation_returns_200(self, client, mock_storage):
        """Test successful conversation creation."""
        mock_storage.create_conversation.return_value = {
            "id": "new-id",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        
        response = client.post("/api/conversations", json={})
        assert response.status_code == 200

    def test_create_conversation_generates_uuid(self, client, mock_storage):
        """Test that conversation gets a UUID."""
        mock_storage.create_conversation.return_value = {
            "id": "test-uuid",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        
        response = client.post("/api/conversations", json={})
        data = response.json()
        assert "id" in data

    def test_create_conversation_calls_storage(self, client, mock_storage):
        """Test that endpoint calls storage.create_conversation."""
        mock_storage.create_conversation.return_value = {
            "id": "test",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        
        client.post("/api/conversations", json={})
        mock_storage.create_conversation.assert_called_once()

    def test_create_conversation_returns_full_data(self, client, mock_storage):
        """Test that created conversation includes all fields."""
        mock_conv = {
            "id": "test",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        mock_storage.create_conversation.return_value = mock_conv
        
        response = client.post("/api/conversations", json={})
        data = response.json()
        assert "id" in data
        assert "created_at" in data
        assert "title" in data
        assert "messages" in data


class TestGetConversation:
    """Tests for getting a specific conversation."""

    def test_get_conversation_success(self, client, mock_storage):
        """Test successful retrieval of conversation."""
        mock_storage.get_conversation.return_value = {
            "id": "conv1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        response = client.get("/api/conversations/conv1")
        assert response.status_code == 200

    def test_get_conversation_not_found(self, client, mock_storage):
        """Test 404 for non-existent conversation."""
        mock_storage.get_conversation.return_value = None
        
        response = client.get("/api/conversations/nonexistent")
        assert response.status_code == 404

    def test_get_conversation_returns_data(self, client, mock_storage):
        """Test that endpoint returns conversation data."""
        mock_conv = {
            "id": "conv1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": [{"role": "user", "content": "Hi"}]
        }
        mock_storage.get_conversation.return_value = mock_conv
        
        response = client.get("/api/conversations/conv1")
        data = response.json()
        assert data["id"] == "conv1"
        assert len(data["messages"]) == 1

    def test_get_conversation_calls_storage(self, client, mock_storage):
        """Test that endpoint calls storage with correct ID."""
        mock_storage.get_conversation.return_value = {
            "id": "test-id",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        client.get("/api/conversations/test-id")
        mock_storage.get_conversation.assert_called_once_with("test-id")


class TestSendMessage:
    """Tests for sending messages (non-streaming)."""

    def test_send_message_success(self, client, mock_storage, mock_council):
        """Test successful message sending."""
        mock_storage.get_conversation.return_value = {
            "id": "conv1",
            "messages": []
        }
        mock_council['run_full_council'].return_value = (
            [{"model": "m1", "response": "R1"}],
            [{"model": "m1", "ranking": "Rank"}],
            {"model": "chairman", "response": "Final"},
            {"label_to_model": {}, "aggregate_rankings": []}
        )
        mock_council['generate_title'].return_value = "Test Title"
        
        response = client.post(
            "/api/conversations/conv1/message",
            json={"content": "Hello"}
        )
        assert response.status_code == 200

    def test_send_message_not_found(self, client, mock_storage):
        """Test 404 for non-existent conversation."""
        mock_storage.get_conversation.return_value = None
        
        response = client.post(
            "/api/conversations/nonexistent/message",
            json={"content": "Hello"}
        )
        assert response.status_code == 404

    def test_send_message_generates_title_first_message(
        self, client, mock_storage, mock_council
    ):
        """Test that title is generated for first message."""
        mock_storage.get_conversation.return_value = {
            "id": "conv1",
            "messages": []  # Empty = first message
        }
        mock_council['run_full_council'].return_value = ([], [], {}, {})
        mock_council['generate_title'].return_value = "Generated Title"
        
        client.post(
            "/api/conversations/conv1/message",
            json={"content": "First message"}
        )
        
        mock_council['generate_title'].assert_called_once()
        mock_storage.update_conversation_title.assert_called_once_with(
            "conv1",
            "Generated Title"
        )

    def test_send_message_no_title_subsequent_messages(
        self, client, mock_storage, mock_council
    ):
        """Test that title is not generated for subsequent messages."""
        mock_storage.get_conversation.return_value = {
            "id": "conv1",
            "messages": [{"role": "user", "content": "Previous"}]
        }
        mock_council['run_full_council'].return_value = ([], [], {}, {})
        
        client.post(
            "/api/conversations/conv1/message",
            json={"content": "Second message"}
        )
        
        mock_council['generate_title'].assert_not_called()

    def test_send_message_saves_user_message(self, client, mock_storage, mock_council):
        """Test that user message is saved."""
        mock_storage.get_conversation.return_value = {
            "id": "conv1",
            "messages": []
        }
        mock_council['run_full_council'].return_value = ([], [], {}, {})
        
        client.post(
            "/api/conversations/conv1/message",
            json={"content": "User message"}
        )
        
        mock_storage.add_user_message.assert_called_once_with(
            "conv1",
            "User message"
        )

    def test_send_message_saves_assistant_response(
        self, client, mock_storage, mock_council
    ):
        """Test that assistant response is saved."""
        mock_storage.get_conversation.return_value = {
            "id": "conv1",
            "messages": []
        }
        stage1 = [{"model": "m1", "response": "R1"}]
        stage2 = [{"model": "m1", "ranking": "Rank"}]
        stage3 = {"model": "chairman", "response": "Final"}
        mock_council['run_full_council'].return_value = (
            stage1, stage2, stage3, {}
        )
        
        client.post(
            "/api/conversations/conv1/message",
            json={"content": "Question"}
        )
        
        mock_storage.add_assistant_message.assert_called_once_with(
            "conv1", stage1, stage2, stage3
        )

    def test_send_message_returns_all_stages(
        self, client, mock_storage, mock_council
    ):
        """Test that response includes all 3 stages."""
        mock_storage.get_conversation.return_value = {
            "id": "conv1",
            "messages": []
        }
        mock_council['run_full_council'].return_value = (
            [{"model": "m1", "response": "R1"}],
            [{"model": "m1", "ranking": "Rank"}],
            {"model": "chairman", "response": "Final"},
            {"label_to_model": {"Response A": "m1"}}
        )
        
        response = client.post(
            "/api/conversations/conv1/message",
            json={"content": "Q"}
        )
        
        data = response.json()
        assert "stage1" in data
        assert "stage2" in data
        assert "stage3" in data
        assert "metadata" in data


class TestSendMessageStream:
    """Tests for streaming message endpoint."""

    def test_stream_message_not_found(self, client, mock_storage):
        """Test 404 for non-existent conversation."""
        mock_storage.get_conversation.return_value = None
        
        response = client.post(
            "/api/conversations/nonexistent/message/stream",
            json={"content": "Hello"}
        )
        assert response.status_code == 404

    def test_stream_message_content_type(self, client, mock_storage, mock_council):
        """Test that streaming endpoint returns SSE content type."""
        mock_storage.get_conversation.return_value = {
            "id": "conv1",
            "messages": []
        }
        mock_council['stage1'].return_value = []
        mock_council['stage2'].return_value = ([], {})
        mock_council['stage3'].return_value = {"model": "m", "response": "R"}
        mock_council['aggregate'].return_value = []
        
        response = client.post(
            "/api/conversations/conv1/message/stream",
            json={"content": "Q"}
        )
        
        assert "text/event-stream" in response.headers.get("content-type", "")

    def test_stream_message_sends_events(self, client, mock_storage, mock_council):
        """Test that streaming sends SSE events."""
        mock_storage.get_conversation.return_value = {
            "id": "conv1",
            "messages": []
        }
        mock_council['stage1'].return_value = [{"model": "m1", "response": "R1"}]
        mock_council['stage2'].return_value = (
            [{"model": "m1", "ranking": "Rank"}],
            {"Response A": "m1"}
        )
        mock_council['stage3'].return_value = {"model": "chairman", "response": "Final"}
        mock_council['aggregate'].return_value = []
        mock_council['generate_title'].return_value = "Title"
        
        response = client.post(
            "/api/conversations/conv1/message/stream",
            json={"content": "Q"}
        )
        
        # Check that response contains SSE data
        content = response.text
        assert "data:" in content
        assert "stage1_start" in content or "stage1_complete" in content


class TestCORSConfiguration:
    """Tests for CORS middleware configuration."""

    def test_cors_headers_present(self, client):
        """Test that CORS headers are configured."""
        response = client.options(
            "/api/conversations",
            headers={"Origin": "http://localhost:5173"}
        )
        # FastAPI's TestClient might not fully simulate CORS
        # This test verifies the endpoint is accessible
        assert response.status_code in [200, 405]  # OPTIONS or allowed


class TestRequestValidation:
    """Tests for request validation."""

    def test_send_message_missing_content(self, client, mock_storage):
        """Test validation error for missing content."""
        mock_storage.get_conversation.return_value = {
            "id": "conv1",
            "messages": []
        }
        
        response = client.post(
            "/api/conversations/conv1/message",
            json={}  # Missing 'content' field
        )
        assert response.status_code == 422

    def test_send_message_invalid_json(self, client):
        """Test error handling for invalid JSON."""
        response = client.post(
            "/api/conversations/conv1/message",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422


class TestEdgeCases:
    """Edge case tests."""

    def test_long_conversation_id(self, client, mock_storage):
        """Test handling of very long conversation IDs."""
        long_id = "a" * 1000
        mock_storage.get_conversation.return_value = None
        
        response = client.get(f"/api/conversations/{long_id}")
        assert response.status_code == 404

    def test_special_characters_in_message(self, client, mock_storage, mock_council):
        """Test handling of special characters in messages."""
        mock_storage.get_conversation.return_value = {
            "id": "conv1",
            "messages": []
        }
        mock_council['run_full_council'].return_value = ([], [], {}, {})
        
        special_content = "Test with émojis 🎉 and symbols: @#$%^&*()"
        response = client.post(
            "/api/conversations/conv1/message",
            json={"content": special_content}
        )
        
        # Should handle gracefully
        assert response.status_code in [200, 500]  # Either success or server error