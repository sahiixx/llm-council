"""Comprehensive unit tests for backend/main.py FastAPI endpoints."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from backend.main import app
import json


@pytest.fixture
def client():
    """Create a test client for FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_storage():
    """Mock storage module."""
    with patch("backend.main.storage") as mock:
        yield mock


@pytest.fixture
def mock_council():
    """Mock council functions."""
    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
        with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_title:
            with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as mock_s1:
                with patch("backend.main.stage2_collect_rankings", new_callable=AsyncMock) as mock_s2:
                    with patch("backend.main.stage3_synthesize_final", new_callable=AsyncMock) as mock_s3:
                        with patch("backend.main.calculate_aggregate_rankings") as mock_agg:
                            yield {
                                "run_full_council": mock_council,
                                "generate_title": mock_title,
                                "stage1": mock_s1,
                                "stage2": mock_s2,
                                "stage3": mock_s3,
                                "aggregate": mock_agg,
                            }


class TestRootEndpoint:
    """Tests for root health check endpoint."""

    def test_root_endpoint_success(self, client):
        """Test root endpoint returns success status."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data
        assert "LLM Council" in data["service"]

    def test_root_endpoint_structure(self, client):
        """Test root endpoint response structure."""
        response = client.get("/")
        data = response.json()
        assert isinstance(data, dict)
        assert "status" in data
        assert "service" in data


class TestListConversations:
    """Tests for GET /api/conversations endpoint."""

    def test_list_conversations_empty(self, client, mock_storage):
        """Test listing conversations when none exist."""
        mock_storage.list_conversations.return_value = []
        
        response = client.get("/api/conversations")
        
        assert response.status_code == 200
        data = response.json()
        assert data == []
        mock_storage.list_conversations.assert_called_once()

    def test_list_conversations_with_data(self, client, mock_storage):
        """Test listing conversations with multiple conversations."""
        mock_conversations = [
            {
                "id": "conv-1",
                "created_at": "2024-01-01T00:00:00",
                "title": "Test Conversation 1",
                "message_count": 5
            },
            {
                "id": "conv-2",
                "created_at": "2024-01-02T00:00:00",
                "title": "Test Conversation 2",
                "message_count": 3
            }
        ]
        mock_storage.list_conversations.return_value = mock_conversations
        
        response = client.get("/api/conversations")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "conv-1"
        assert data[1]["message_count"] == 3

    def test_list_conversations_response_model(self, client, mock_storage):
        """Test that response matches ConversationMetadata model."""
        mock_conversations = [{
            "id": "test-id",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "message_count": 0
        }]
        mock_storage.list_conversations.return_value = mock_conversations
        
        response = client.get("/api/conversations")
        data = response.json()
        
        assert all(key in data[0] for key in ["id", "created_at", "title", "message_count"])


class TestCreateConversation:
    """Tests for POST /api/conversations endpoint."""

    def test_create_conversation_success(self, client, mock_storage):
        """Test successful conversation creation."""
        mock_conversation = {
            "id": "new-conv-id",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        mock_storage.create_conversation.return_value = mock_conversation
        
        response = client.post("/api/conversations", json={})
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["messages"] == []
        mock_storage.create_conversation.assert_called_once()

    def test_create_conversation_generates_uuid(self, client, mock_storage):
        """Test that conversation creation generates a UUID."""
        mock_storage.create_conversation.return_value = {
            "id": "test-id",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        
        response = client.post("/api/conversations", json={})
        
        # Verify UUID format (36 characters with hyphens)
        call_args = mock_storage.create_conversation.call_args
        conversation_id = call_args[0][0]
        assert isinstance(conversation_id, str)
        assert len(conversation_id) == 36  # UUID format
        assert conversation_id.count("-") == 4

    def test_create_conversation_empty_request_body(self, client, mock_storage):
        """Test creating conversation with empty request body."""
        mock_storage.create_conversation.return_value = {
            "id": "id",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        
        response = client.post("/api/conversations", json={})
        assert response.status_code == 200

    def test_create_conversation_response_structure(self, client, mock_storage):
        """Test that created conversation has correct structure."""
        mock_storage.create_conversation.return_value = {
            "id": "id",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        
        response = client.post("/api/conversations", json={})
        data = response.json()
        
        assert "id" in data
        assert "created_at" in data
        assert "title" in data
        assert "messages" in data


class TestGetConversation:
    """Tests for GET /api/conversations/{conversation_id} endpoint."""

    def test_get_conversation_success(self, client, mock_storage):
        """Test successfully retrieving a conversation."""
        mock_conversation = {
            "id": "conv-123",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test Conversation",
            "messages": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there"}
            ]
        }
        mock_storage.get_conversation.return_value = mock_conversation
        
        response = client.get("/api/conversations/conv-123")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "conv-123"
        assert len(data["messages"]) == 2
        mock_storage.get_conversation.assert_called_once_with("conv-123")

    def test_get_conversation_not_found(self, client, mock_storage):
        """Test getting non-existent conversation returns 404."""
        mock_storage.get_conversation.return_value = None
        
        response = client.get("/api/conversations/nonexistent")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()

    def test_get_conversation_with_special_characters(self, client, mock_storage):
        """Test getting conversation with special characters in ID."""
        conv_id = "conv-123-abc-xyz"
        mock_storage.get_conversation.return_value = {
            "id": conv_id,
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        response = client.get(f"/api/conversations/{conv_id}")
        assert response.status_code == 200

    def test_get_conversation_empty_messages(self, client, mock_storage):
        """Test getting conversation with no messages."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-123",
            "created_at": "2024-01-01T00:00:00",
            "title": "Empty Conv",
            "messages": []
        }
        
        response = client.get("/api/conversations/conv-123")
        data = response.json()
        assert data["messages"] == []


class TestSendMessage:
    """Tests for POST /api/conversations/{conversation_id}/message endpoint."""

    def test_send_message_success(self, client, mock_storage, mock_council):
        """Test successfully sending a message."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": [{"role": "user", "content": "Previous message"}]
        }
        
        mock_council["run_full_council"].return_value = (
            [{"model": "m1", "response": "R1"}],
            [{"model": "m1", "ranking": "Rank1"}],
            {"model": "chairman", "response": "Final answer"},
            {"label_to_model": {}, "aggregate_rankings": []}
        )
        
        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": "Test message"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "stage1" in data
        assert "stage2" in data
        assert "stage3" in data
        assert "metadata" in data

    def test_send_message_conversation_not_found(self, client, mock_storage):
        """Test sending message to non-existent conversation."""
        mock_storage.get_conversation.return_value = None
        
        response = client.post(
            "/api/conversations/nonexistent/message",
            json={"content": "Test"}
        )
        
        assert response.status_code == 404

    def test_send_message_first_message_generates_title(self, client, mock_storage, mock_council):
        """Test that first message triggers title generation."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []  # Empty - first message
        }
        
        mock_council["run_full_council"].return_value = (
            [{"model": "m1", "response": "R1"}],
            [{"model": "m1", "ranking": "Rank1"}],
            {"model": "chairman", "response": "Final"},
            {"label_to_model": {}, "aggregate_rankings": []}
        )
        mock_council["generate_title"].return_value = "Generated Title"
        
        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": "First message"}
        )
        
        assert response.status_code == 200
        mock_council["generate_title"].assert_called_once_with("First message")
        mock_storage.update_conversation_title.assert_called_once_with("conv-1", "Generated Title")

    def test_send_message_not_first_message_no_title_generation(self, client, mock_storage, mock_council):
        """Test that subsequent messages don't trigger title generation."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": [{"role": "user", "content": "Existing"}]
        }
        
        mock_council["run_full_council"].return_value = (
            [{"model": "m1", "response": "R1"}],
            [{"model": "m1", "ranking": "Rank1"}],
            {"model": "chairman", "response": "Final"},
            {"label_to_model": {}, "aggregate_rankings": []}
        )
        
        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": "Second message"}
        )
        
        assert response.status_code == 200
        mock_council["generate_title"].assert_not_called()

    def test_send_message_saves_user_message(self, client, mock_storage, mock_council):
        """Test that user message is saved to storage."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        mock_council["run_full_council"].return_value = (
            [{"model": "m1", "response": "R1"}],
            [],
            {"model": "chairman", "response": "Final"},
            {"label_to_model": {}, "aggregate_rankings": []}
        )
        
        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": "User message"}
        )
        
        assert response.status_code == 200
        mock_storage.add_user_message.assert_called_once_with("conv-1", "User message")

    def test_send_message_saves_assistant_message(self, client, mock_storage, mock_council):
        """Test that assistant message is saved with all stages."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        stage1 = [{"model": "m1", "response": "R1"}]
        stage2 = [{"model": "m1", "ranking": "Rank1"}]
        stage3 = {"model": "chairman", "response": "Final"}
        
        mock_council["run_full_council"].return_value = (
            stage1, stage2, stage3,
            {"label_to_model": {}, "aggregate_rankings": []}
        )
        
        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": "Test"}
        )
        
        assert response.status_code == 200
        mock_storage.add_assistant_message.assert_called_once_with(
            "conv-1", stage1, stage2, stage3
        )

    def test_send_message_empty_content(self, client, mock_storage, mock_council):
        """Test sending message with empty content."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        mock_council["run_full_council"].return_value = (
            [], [], {"model": "chairman", "response": "Response"},
            {"label_to_model": {}, "aggregate_rankings": []}
        )
        
        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": ""}
        )
        
        assert response.status_code == 200

    def test_send_message_unicode_content(self, client, mock_storage, mock_council):
        """Test sending message with Unicode characters."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        mock_council["run_full_council"].return_value = (
            [], [], {"model": "chairman", "response": "Response"},
            {"label_to_model": {}, "aggregate_rankings": []}
        )
        
        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": "Hello 你好 café 🎉"}
        )
        
        assert response.status_code == 200


class TestSendMessageStream:
    """Tests for POST /api/conversations/{conversation_id}/message/stream endpoint."""

    def test_send_message_stream_conversation_not_found(self, client, mock_storage):
        """Test streaming to non-existent conversation returns 404."""
        mock_storage.get_conversation.return_value = None
        
        response = client.post(
            "/api/conversations/nonexistent/message/stream",
            json={"content": "Test"}
        )
        
        assert response.status_code == 404

    def test_send_message_stream_returns_event_stream(self, client, mock_storage, mock_council):
        """Test that streaming endpoint returns event-stream media type."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        mock_council["stage1"].return_value = [{"model": "m1", "response": "R1"}]
        mock_council["stage2"].return_value = (
            [{"model": "m1", "ranking": "Rank"}],
            {"Response A": "m1"}
        )
        mock_council["stage3"].return_value = {"model": "chairman", "response": "Final"}
        mock_council["aggregate"].return_value = []
        mock_council["generate_title"].return_value = "Title"
        
        response = client.post(
            "/api/conversations/conv-1/message/stream",
            json={"content": "Test"}
        )
        
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")

    def test_send_message_stream_generates_events(self, client, mock_storage, mock_council):
        """Test that streaming generates expected SSE events."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        mock_council["stage1"].return_value = [{"model": "m1", "response": "R1"}]
        mock_council["stage2"].return_value = (
            [{"model": "m1", "ranking": "Rank"}],
            {"Response A": "m1"}
        )
        mock_council["stage3"].return_value = {"model": "chairman", "response": "Final"}
        mock_council["aggregate"].return_value = []
        mock_council["generate_title"].return_value = "Generated Title"
        
        response = client.post(
            "/api/conversations/conv-1/message/stream",
            json={"content": "Test message"}
        )
        
        # Read the streaming response
        content = response.text
        
        # Verify events are present
        assert "stage1_start" in content
        assert "stage1_complete" in content
        assert "stage2_start" in content
        assert "stage2_complete" in content
        assert "stage3_start" in content
        assert "stage3_complete" in content
        assert "complete" in content

    def test_send_message_stream_first_message_includes_title(self, client, mock_storage, mock_council):
        """Test that streaming first message includes title generation event."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []  # First message
        }
        
        mock_council["stage1"].return_value = []
        mock_council["stage2"].return_value = ([], {})
        mock_council["stage3"].return_value = {"model": "c", "response": "F"}
        mock_council["aggregate"].return_value = []
        mock_council["generate_title"].return_value = "Generated Title"
        
        response = client.post(
            "/api/conversations/conv-1/message/stream",
            json={"content": "First message"}
        )
        
        content = response.text
        assert "title_complete" in content
        assert "Generated Title" in content

    def test_send_message_stream_saves_messages(self, client, mock_storage, mock_council):
        """Test that streaming saves both user and assistant messages."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        stage1 = [{"model": "m1", "response": "R1"}]
        stage2 = [{"model": "m1", "ranking": "Rank"}]
        stage3 = {"model": "chairman", "response": "Final"}
        
        mock_council["stage1"].return_value = stage1
        mock_council["stage2"].return_value = (stage2, {})
        mock_council["stage3"].return_value = stage3
        mock_council["aggregate"].return_value = []
        
        response = client.post(
            "/api/conversations/conv-1/message/stream",
            json={"content": "Test"}
        )
        
        # Consume the stream
        _ = response.text
        
        mock_storage.add_user_message.assert_called_once_with("conv-1", "Test")
        mock_storage.add_assistant_message.assert_called_once_with(
            "conv-1", stage1, stage2, stage3
        )


class TestCORSMiddleware:
    """Tests for CORS middleware configuration."""

    def test_cors_allows_localhost_origins(self, client):
        """Test that CORS allows localhost origins."""
        response = client.options(
            "/api/conversations",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET"
            }
        )
        
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers

    def test_cors_allows_all_methods(self, client):
        """Test that CORS allows all HTTP methods."""
        response = client.options(
            "/api/conversations",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST"
            }
        )
        
        assert response.status_code == 200


class TestRequestModels:
    """Tests for Pydantic request models."""

    def test_send_message_request_validation(self, client, mock_storage):
        """Test that SendMessageRequest validates content field."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        # Missing content field
        response = client.post(
            "/api/conversations/conv-1/message",
            json={}
        )
        
        assert response.status_code == 422  # Validation error

    def test_send_message_request_accepts_valid_data(self, client, mock_storage, mock_council):
        """Test that valid request data is accepted."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        mock_council["run_full_council"].return_value = (
            [], [], {"model": "c", "response": "R"},
            {"label_to_model": {}, "aggregate_rankings": []}
        )
        
        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": "Valid message"}
        )
        
        assert response.status_code == 200


class TestEdgeCases:
    """Edge case tests for API endpoints."""

    def test_very_long_conversation_id(self, client, mock_storage):
        """Test handling of very long conversation IDs."""
        long_id = "a" * 1000
        mock_storage.get_conversation.return_value = None
        
        response = client.get(f"/api/conversations/{long_id}")
        assert response.status_code == 404

    def test_very_long_message_content(self, client, mock_storage, mock_council):
        """Test sending very long message content."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        mock_council["run_full_council"].return_value = (
            [], [], {"model": "c", "response": "R"},
            {"label_to_model": {}, "aggregate_rankings": []}
        )
        
        long_content = "A" * 10000
        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": long_content}
        )
        
        assert response.status_code == 200

    def test_concurrent_requests_different_conversations(self, client, mock_storage, mock_council):
        """Test handling concurrent requests to different conversations."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        mock_council["run_full_council"].return_value = (
            [], [], {"model": "c", "response": "R"},
            {"label_to_model": {}, "aggregate_rankings": []}
        )
        
        # Simulate concurrent requests
        response1 = client.post("/api/conversations/conv-1/message", json={"content": "Test1"})
        response2 = client.post("/api/conversations/conv-2/message", json={"content": "Test2"})
        
        # Both should complete (even if conv-2 doesn't exist, it should return 404)
        assert response1.status_code in [200, 404]
        assert response2.status_code in [200, 404]

    def test_special_characters_in_message_content(self, client, mock_storage, mock_council):
        """Test handling special characters in message content."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        mock_council["run_full_council"].return_value = (
            [], [], {"model": "c", "response": "R"},
            {"label_to_model": {}, "aggregate_rankings": []}
        )
        
        special_content = "Test with <html> & \"quotes\" 'and' symbols: @#$%^&*()"
        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": special_content}
        )
        
        assert response.status_code == 200
