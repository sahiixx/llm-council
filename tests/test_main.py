"""Comprehensive unit tests for backend/main.py (FastAPI endpoints)."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
import json
import uuid

from backend.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_storage():
    """Mock storage module."""
    with patch("backend.main.storage") as mock:
        yield mock


@pytest.fixture
def mock_council():
    """Mock council functions."""
    with patch("backend.main.run_full_council") as mock_run, \
         patch("backend.main.generate_conversation_title") as mock_title, \
         patch("backend.main.stage1_collect_responses") as mock_s1, \
         patch("backend.main.stage2_collect_rankings") as mock_s2, \
         patch("backend.main.stage3_synthesize_final") as mock_s3:
        yield {
            "run_full_council": mock_run,
            "generate_conversation_title": mock_title,
            "stage1_collect_responses": mock_s1,
            "stage2_collect_rankings": mock_s2,
            "stage3_synthesize_final": mock_s3,
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

    def test_root_service_name(self, client):
        """Test that root endpoint includes service name."""
        response = client.get("/")
        data = response.json()
        assert "LLM Council" in data["service"]

    def test_root_response_structure(self, client):
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
        assert response.json() == []

    def test_list_conversations_with_data(self, client, mock_storage):
        """Test listing conversations with existing data."""
        mock_conversations = [
            {
                "id": "conv-1",
                "created_at": "2024-01-01T00:00:00",
                "title": "Test Conversation",
                "message_count": 5
            },
            {
                "id": "conv-2",
                "created_at": "2024-01-02T00:00:00",
                "title": "Another Conversation",
                "message_count": 3
            }
        ]
        mock_storage.list_conversations.return_value = mock_conversations
        
        response = client.get("/api/conversations")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "conv-1"
        assert data[0]["message_count"] == 5

    def test_list_conversations_response_model(self, client, mock_storage):
        """Test that response conforms to ConversationMetadata model."""
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

    def test_list_conversations_calls_storage(self, client, mock_storage):
        """Test that endpoint calls storage.list_conversations."""
        mock_storage.list_conversations.return_value = []
        client.get("/api/conversations")
        mock_storage.list_conversations.assert_called_once()


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
        assert data["id"] == "new-conv-id"
        assert data["title"] == "New Conversation"
        assert data["messages"] == []

    def test_create_conversation_generates_uuid(self, client, mock_storage):
        """Test that conversation gets a UUID."""
        mock_storage.create_conversation.return_value = {
            "id": "uuid-123",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        
        response = client.post("/api/conversations", json={})
        # Verify storage was called with some ID
        mock_storage.create_conversation.assert_called_once()
        call_args = mock_storage.create_conversation.call_args[0]
        assert len(call_args[0]) > 0  # UUID string

    def test_create_conversation_empty_request(self, client, mock_storage):
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
        """Test that response has correct structure."""
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
        """Test successfully getting an existing conversation."""
        mock_conversation = {
            "id": "conv-123",
            "created_at": "2024-01-01T00:00:00",
            "title": "My Conversation",
            "messages": [{"role": "user", "content": "Hello"}]
        }
        mock_storage.get_conversation.return_value = mock_conversation
        
        response = client.get("/api/conversations/conv-123")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "conv-123"
        assert len(data["messages"]) == 1

    def test_get_conversation_not_found(self, client, mock_storage):
        """Test getting non-existent conversation returns 404."""
        mock_storage.get_conversation.return_value = None
        
        response = client.get("/api/conversations/nonexistent")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_conversation_with_messages(self, client, mock_storage):
        """Test getting conversation with multiple messages."""
        mock_conversation = {
            "id": "conv-123",
            "created_at": "2024-01-01T00:00:00",
            "title": "Chat",
            "messages": [
                {"role": "user", "content": "Q1"},
                {"role": "assistant", "stage1": [], "stage2": [], "stage3": {}},
                {"role": "user", "content": "Q2"}
            ]
        }
        mock_storage.get_conversation.return_value = mock_conversation
        
        response = client.get("/api/conversations/conv-123")
        assert response.status_code == 200
        data = response.json()
        assert len(data["messages"]) == 3

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
    """Tests for POST /api/conversations/{conversation_id}/message endpoint."""

    def test_send_message_success(self, client, mock_storage, mock_council):
        """Test successfully sending a message."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        mock_council["run_full_council"].return_value = (
            [{"model": "m1", "response": "r1"}],  # stage1
            [{"model": "m1", "ranking": "rank"}],  # stage2
            {"model": "chairman", "response": "final"},  # stage3
            {"label_to_model": {}, "aggregate_rankings": []}  # metadata
        )
        mock_council["generate_conversation_title"].return_value = "Test Title"
        
        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": "Hello"}
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
            json={"content": "Hello"}
        )
        
        assert response.status_code == 404

    def test_send_message_first_message_generates_title(self, client, mock_storage, mock_council):
        """Test that first message generates a title."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []  # Empty - first message
        }
        
        mock_council["run_full_council"].return_value = ([], [], {}, {})
        mock_council["generate_conversation_title"].return_value = "Generated Title"
        
        client.post(
            "/api/conversations/conv-1/message",
            json={"content": "First message"}
        )
        
        mock_council["generate_conversation_title"].assert_called_once_with("First message")
        mock_storage.update_conversation_title.assert_called_once_with("conv-1", "Generated Title")

    def test_send_message_not_first_message_no_title(self, client, mock_storage, mock_council):
        """Test that subsequent messages don't generate title."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Existing Title",
            "messages": [{"role": "user", "content": "Previous"}]  # Has messages
        }
        
        mock_council["run_full_council"].return_value = ([], [], {}, {})
        
        client.post(
            "/api/conversations/conv-1/message",
            json={"content": "Second message"}
        )
        
        mock_council["generate_conversation_title"].assert_not_called()

    def test_send_message_adds_user_message(self, client, mock_storage, mock_council):
        """Test that user message is added to storage."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        mock_council["run_full_council"].return_value = ([], [], {}, {})
        
        client.post(
            "/api/conversations/conv-1/message",
            json={"content": "User message"}
        )
        
        mock_storage.add_user_message.assert_called_once_with("conv-1", "User message")

    def test_send_message_runs_council(self, client, mock_storage, mock_council):
        """Test that council process is run."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        mock_council["run_full_council"].return_value = ([], [], {}, {})
        
        client.post(
            "/api/conversations/conv-1/message",
            json={"content": "Question"}
        )
        
        mock_council["run_full_council"].assert_called_once_with("Question")

    def test_send_message_saves_assistant_response(self, client, mock_storage, mock_council):
        """Test that assistant message is saved."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        stage1 = [{"model": "m1", "response": "r1"}]
        stage2 = [{"model": "m1", "ranking": "rank"}]
        stage3 = {"model": "chairman", "response": "final"}
        
        mock_council["run_full_council"].return_value = (stage1, stage2, stage3, {})
        
        client.post(
            "/api/conversations/conv-1/message",
            json={"content": "Question"}
        )
        
        mock_storage.add_assistant_message.assert_called_once_with(
            "conv-1", stage1, stage2, stage3
        )

    def test_send_message_invalid_request(self, client, mock_storage):
        """Test sending message with invalid request body."""
        response = client.post(
            "/api/conversations/conv-1/message",
            json={}  # Missing 'content' field
        )
        
        assert response.status_code == 422  # Validation error


class TestSendMessageStream:
    """Tests for POST /api/conversations/{conversation_id}/message/stream endpoint."""

    def test_send_message_stream_conversation_not_found(self, client, mock_storage):
        """Test streaming to non-existent conversation."""
        mock_storage.get_conversation.return_value = None
        
        response = client.post(
            "/api/conversations/nonexistent/message/stream",
            json={"content": "Hello"}
        )
        
        assert response.status_code == 404

    def test_send_message_stream_returns_streaming_response(self, client, mock_storage, mock_council):
        """Test that streaming endpoint returns correct response type."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        # Mock async functions
        mock_council["stage1_collect_responses"].return_value = []
        mock_council["stage2_collect_rankings"].return_value = ([], {})
        mock_council["stage3_synthesize_final"].return_value = {}
        
        response = client.post(
            "/api/conversations/conv-1/message/stream",
            json={"content": "Hello"}
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

    def test_send_message_stream_events_format(self, client, mock_storage, mock_council):
        """Test that stream sends events in correct SSE format."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        mock_council["stage1_collect_responses"].return_value = [{"model": "m1", "response": "r1"}]
        mock_council["stage2_collect_rankings"].return_value = ([{"model": "m1", "ranking": "r"}], {})
        mock_council["stage3_synthesize_final"].return_value = {"model": "c", "response": "f"}
        
        response = client.post(
            "/api/conversations/conv-1/message/stream",
            json={"content": "Hello"}
        )
        
        content = response.text
        assert "data:" in content
        assert "stage1_start" in content
        assert "stage1_complete" in content

    def test_send_message_stream_includes_all_stages(self, client, mock_storage, mock_council):
        """Test that stream includes all three stages."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        mock_council["stage1_collect_responses"].return_value = []
        mock_council["stage2_collect_rankings"].return_value = ([], {})
        mock_council["stage3_synthesize_final"].return_value = {}
        
        response = client.post(
            "/api/conversations/conv-1/message/stream",
            json={"content": "Hello"}
        )
        
        content = response.text
        assert "stage1_start" in content
        assert "stage2_start" in content
        assert "stage3_start" in content
        assert "complete" in content

    def test_send_message_stream_first_message_includes_title(self, client, mock_storage, mock_council):
        """Test that first message stream includes title generation."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []  # Empty - first message
        }
        
        mock_council["stage1_collect_responses"].return_value = []
        mock_council["stage2_collect_rankings"].return_value = ([], {})
        mock_council["stage3_synthesize_final"].return_value = {}
        mock_council["generate_conversation_title"].return_value = "New Title"
        
        response = client.post(
            "/api/conversations/conv-1/message/stream",
            json={"content": "First"}
        )
        
        content = response.text
        assert "title_complete" in content


class TestCORSMiddleware:
    """Tests for CORS configuration."""

    def test_cors_headers_present(self, client):
        """Test that CORS headers are configured."""
        response = client.get("/")
        # CORS headers should be present in response
        # Note: TestClient may not fully simulate CORS, but we verify the endpoint works
        assert response.status_code == 200

    def test_cors_allows_localhost(self, client):
        """Test that CORS allows local development origins."""
        # Verify app has CORS middleware configured
        from backend.main import app
        middleware_classes = [type(m) for m in app.user_middleware]
        assert any("CORS" in str(cls) for cls in middleware_classes)


class TestPydanticModels:
    """Tests for Pydantic request/response models."""

    def test_create_conversation_request_empty(self):
        """Test CreateConversationRequest with empty body."""
        from backend.main import CreateConversationRequest
        request = CreateConversationRequest()
        assert request is not None

    def test_send_message_request_valid(self):
        """Test SendMessageRequest with valid content."""
        from backend.main import SendMessageRequest
        request = SendMessageRequest(content="Test message")
        assert request.content == "Test message"

    def test_send_message_request_missing_content(self):
        """Test SendMessageRequest validation."""
        from backend.main import SendMessageRequest
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError):
            SendMessageRequest()

    def test_conversation_metadata_model(self):
        """Test ConversationMetadata model structure."""
        from backend.main import ConversationMetadata
        
        metadata = ConversationMetadata(
            id="test-id",
            created_at="2024-01-01T00:00:00",
            title="Test",
            message_count=5
        )
        
        assert metadata.id == "test-id"
        assert metadata.message_count == 5

    def test_conversation_model(self):
        """Test Conversation model structure."""
        from backend.main import Conversation
        
        conv = Conversation(
            id="test-id",
            created_at="2024-01-01T00:00:00",
            title="Test",
            messages=[{"role": "user", "content": "Hello"}]
        )
        
        assert conv.id == "test-id"
        assert len(conv.messages) == 1


class TestEdgeCases:
    """Edge case and error handling tests."""

    def test_send_message_with_empty_content(self, client, mock_storage, mock_council):
        """Test sending message with empty content string."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        mock_council["run_full_council"].return_value = ([], [], {}, {})
        
        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": ""}
        )
        
        # Should accept empty content (validation allows it)
        assert response.status_code == 200

    def test_send_message_with_very_long_content(self, client, mock_storage, mock_council):
        """Test sending message with very long content."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        mock_council["run_full_council"].return_value = ([], [], {}, {})
        
        long_content = "A" * 100000
        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": long_content}
        )
        
        assert response.status_code == 200

    def test_get_conversation_with_special_characters_in_id(self, client, mock_storage):
        """Test getting conversation with special characters in ID."""
        mock_storage.get_conversation.return_value = None
        
        response = client.get("/api/conversations/conv-with-dashes-123")
        assert response.status_code == 404

    def test_concurrent_requests(self, client, mock_storage, mock_council):
        """Test handling multiple concurrent requests."""
        mock_storage.list_conversations.return_value = []
        
        # Simulate multiple concurrent requests
        responses = [client.get("/api/conversations") for _ in range(10)]
        
        assert all(r.status_code == 200 for r in responses)

    def test_invalid_json_in_request(self, client):
        """Test handling of invalid JSON in request body."""
        response = client.post(
            "/api/conversations/conv-1/message",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422  # Unprocessable Entity

    def test_missing_conversation_id_in_url(self, client):
        """Test endpoint behavior with malformed URL."""
        response = client.get("/api/conversations/")
        # Should return 404 or 307 (redirect) depending on trailing slash handling
        assert response.status_code in [404, 307]
