"""Comprehensive unit tests for backend/main.py FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock
import uuid
import json

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
    """Mock conversation with messages."""
    return {
        "id": "test-conv-456",
        "created_at": "2024-01-01T00:00:00",
        "title": "Test Conversation with Messages",
        "messages": [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "stage1": [], "stage2": [], "stage3": {}}
        ]
    }


class TestRootEndpoint:
    """Tests for root health check endpoint."""

    def test_root_returns_ok_status(self, client):
        """Test that root endpoint returns OK status."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_root_returns_service_name(self, client):
        """Test that root endpoint returns service name."""
        response = client.get("/")
        data = response.json()
        assert "service" in data
        assert "LLM Council" in data["service"]


class TestListConversations:
    """Tests for GET /api/conversations endpoint."""

    def test_list_conversations_success(self, client):
        """Test successful listing of conversations."""
        mock_convs = [
            {"id": "1", "created_at": "2024-01-01T00:00:00", "title": "Conv 1", "message_count": 2},
            {"id": "2", "created_at": "2024-01-02T00:00:00", "title": "Conv 2", "message_count": 0}
        ]
        
        with patch("backend.main.storage.list_conversations", return_value=mock_convs):
            response = client.get("/api/conversations")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "1"
        assert data[1]["id"] == "2"

    def test_list_conversations_empty(self, client):
        """Test listing conversations when none exist."""
        with patch("backend.main.storage.list_conversations", return_value=[]):
            response = client.get("/api/conversations")
        
        assert response.status_code == 200
        assert response.json() == []

    def test_list_conversations_validates_response_model(self, client):
        """Test that response validates against ConversationMetadata model."""
        mock_convs = [
            {"id": "1", "created_at": "2024-01-01T00:00:00", "title": "Test", "message_count": 5}
        ]
        
        with patch("backend.main.storage.list_conversations", return_value=mock_convs):
            response = client.get("/api/conversations")
        
        assert response.status_code == 200
        data = response.json()[0]
        assert "id" in data
        assert "created_at" in data
        assert "title" in data
        assert "message_count" in data


class TestCreateConversation:
    """Tests for POST /api/conversations endpoint."""

    def test_create_conversation_success(self, client, mock_conversation):
        """Test successful conversation creation."""
        with patch("backend.main.storage.create_conversation", return_value=mock_conversation):
            response = client.post("/api/conversations", json={})
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "created_at" in data
        assert "title" in data
        assert "messages" in data

    def test_create_conversation_generates_uuid(self, client, mock_conversation):
        """Test that a UUID is generated for new conversations."""
        with patch("backend.main.storage.create_conversation", return_value=mock_conversation) as mock:
            with patch("uuid.uuid4", return_value=uuid.UUID("12345678-1234-5678-1234-567812345678")):
                response = client.post("/api/conversations", json={})
        
        assert response.status_code == 200
        # Verify storage.create_conversation was called with a string UUID
        mock.assert_called_once()
        call_arg = mock.call_args[0][0]
        assert isinstance(call_arg, str)

    def test_create_conversation_returns_conversation_model(self, client, mock_conversation):
        """Test that response matches Conversation model."""
        with patch("backend.main.storage.create_conversation", return_value=mock_conversation):
            response = client.post("/api/conversations", json={})
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == mock_conversation["id"]
        assert data["messages"] == []

    def test_create_conversation_with_empty_request_body(self, client, mock_conversation):
        """Test creating conversation with empty request body."""
        with patch("backend.main.storage.create_conversation", return_value=mock_conversation):
            response = client.post("/api/conversations", json={})
        
        assert response.status_code == 200


class TestGetConversation:
    """Tests for GET /api/conversations/{conversation_id} endpoint."""

    def test_get_conversation_success(self, client, mock_conversation):
        """Test successfully retrieving a conversation."""
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            response = client.get("/api/conversations/test-conv-123")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "test-conv-123"
        assert "messages" in data

    def test_get_conversation_not_found(self, client):
        """Test retrieving non-existent conversation returns 404."""
        with patch("backend.main.storage.get_conversation", return_value=None):
            response = client.get("/api/conversations/nonexistent")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_conversation_with_messages(self, client, mock_conversation_with_messages):
        """Test retrieving conversation that has messages."""
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation_with_messages):
            response = client.get("/api/conversations/test-conv-456")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["messages"]) == 2
        assert data["messages"][0]["role"] == "user"

    def test_get_conversation_validates_id_format(self, client, mock_conversation):
        """Test that various ID formats are accepted."""
        test_ids = ["simple-id", "uuid-12345678", "test_conv_123"]
        
        for test_id in test_ids:
            with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
                response = client.get(f"/api/conversations/{test_id}")
                assert response.status_code == 200


class TestSendMessage:
    """Tests for POST /api/conversations/{conversation_id}/message endpoint."""

    def test_send_message_success(self, client, mock_conversation):
        """Test successfully sending a message."""
        mock_stage1 = [{"model": "model1", "response": "Response 1"}]
        mock_stage2 = [{"model": "model1", "ranking": "Ranking"}]
        mock_stage3 = {"model": "chairman", "response": "Final answer"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                        
                        response = client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": "Test question"}
                        )
        
        assert response.status_code == 200
        data = response.json()
        assert "stage1" in data
        assert "stage2" in data
        assert "stage3" in data
        assert "metadata" in data

    def test_send_message_conversation_not_found(self, client):
        """Test sending message to non-existent conversation."""
        with patch("backend.main.storage.get_conversation", return_value=None):
            response = client.post(
                "/api/conversations/nonexistent/message",
                json={"content": "Test"}
            )
        
        assert response.status_code == 404

    def test_send_message_first_message_generates_title(self, client, mock_conversation):
        """Test that first message triggers title generation."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Ranking"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.storage.update_conversation_title") as mock_update_title:
                        with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_gen_title:
                            mock_gen_title.return_value = "Generated Title"
                            with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                                mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                                
                                response = client.post(
                                    "/api/conversations/test-conv-123/message",
                                    json={"content": "First question"}
                                )
        
        assert response.status_code == 200
        mock_gen_title.assert_called_once_with("First question")
        mock_update_title.assert_called_once_with("test-conv-123", "Generated Title")

    def test_send_message_subsequent_message_no_title_generation(self, client, mock_conversation_with_messages):
        """Test that subsequent messages don't trigger title generation."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Ranking"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation_with_messages):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_gen_title:
                        with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                            mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                            
                            response = client.post(
                                "/api/conversations/test-conv-456/message",
                                json={"content": "Follow-up question"}
                            )
        
        assert response.status_code == 200
        mock_gen_title.assert_not_called()

    def test_send_message_adds_user_message_to_storage(self, client, mock_conversation):
        """Test that user message is added to storage."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Ranking"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message") as mock_add_user:
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                        
                        response = client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": "My question"}
                        )
        
        assert response.status_code == 200
        mock_add_user.assert_called_once_with("test-conv-123", "My question")

    def test_send_message_adds_assistant_message_to_storage(self, client, mock_conversation):
        """Test that assistant message with all stages is added to storage."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Ranking"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message") as mock_add_asst:
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                        
                        response = client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": "Question"}
                        )
        
        assert response.status_code == 200
        mock_add_asst.assert_called_once_with(
            "test-conv-123",
            mock_stage1,
            mock_stage2,
            mock_stage3
        )

    def test_send_message_empty_content(self, client, mock_conversation):
        """Test sending message with empty content."""
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            response = client.post(
                "/api/conversations/test-conv-123/message",
                json={"content": ""}
            )
        
        # Should still process empty content
        assert response.status_code in [200, 422]  # 422 if validation fails

    def test_send_message_missing_content_field(self, client):
        """Test sending message without content field."""
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


class TestSendMessageStream:
    """Tests for POST /api/conversations/{conversation_id}/message/stream endpoint."""

    def test_send_message_stream_conversation_not_found(self, client):
        """Test streaming to non-existent conversation."""
        with patch("backend.main.storage.get_conversation", return_value=None):
            response = client.post(
                "/api/conversations/nonexistent/message/stream",
                json={"content": "Test"}
            )
        
        assert response.status_code == 404

    def test_send_message_stream_returns_event_stream(self, client, mock_conversation):
        """Test that streaming endpoint returns correct content type."""
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as mock_s1:
                    with patch("backend.main.stage2_collect_rankings", new_callable=AsyncMock) as mock_s2:
                        with patch("backend.main.stage3_synthesize_final", new_callable=AsyncMock) as mock_s3:
                            with patch("backend.main.storage.add_assistant_message"):
                                mock_s1.return_value = []
                                mock_s2.return_value = ([], {})
                                mock_s3.return_value = {"model": "m", "response": "r"}
                                
                                response = client.post(
                                    "/api/conversations/test-conv-123/message/stream",
                                    json={"content": "Question"}
                                )
        
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

    def test_send_message_stream_sends_stage_events(self, client, mock_conversation):
        """Test that streaming sends events for each stage."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Ranking"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as mock_s1:
                    with patch("backend.main.stage2_collect_rankings", new_callable=AsyncMock) as mock_s2:
                        with patch("backend.main.stage3_synthesize_final", new_callable=AsyncMock) as mock_s3:
                            with patch("backend.main.calculate_aggregate_rankings", return_value=[]):
                                with patch("backend.main.storage.add_assistant_message"):
                                    mock_s1.return_value = mock_stage1
                                    mock_s2.return_value = (mock_stage2, {})
                                    mock_s3.return_value = mock_stage3
                                    
                                    response = client.post(
                                        "/api/conversations/test-conv-123/message/stream",
                                        json={"content": "Question"}
                                    )
        
        assert response.status_code == 200
        content = response.text
        
        # Verify stage events are present
        assert "stage1_start" in content
        assert "stage1_complete" in content
        assert "stage2_start" in content
        assert "stage2_complete" in content
        assert "stage3_start" in content
        assert "stage3_complete" in content
        assert "complete" in content

    def test_send_message_stream_first_message_generates_title(self, client, mock_conversation):
        """Test that streaming generates title for first message."""
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as mock_s1:
                    with patch("backend.main.stage2_collect_rankings", new_callable=AsyncMock) as mock_s2:
                        with patch("backend.main.stage3_synthesize_final", new_callable=AsyncMock) as mock_s3:
                            with patch("backend.main.calculate_aggregate_rankings", return_value=[]):
                                with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_title:
                                    with patch("backend.main.storage.update_conversation_title"):
                                        with patch("backend.main.storage.add_assistant_message"):
                                            mock_s1.return_value = []
                                            mock_s2.return_value = ([], {})
                                            mock_s3.return_value = {"model": "m", "response": "r"}
                                            mock_title.return_value = "Generated Title"
                                            
                                            response = client.post(
                                                "/api/conversations/test-conv-123/message/stream",
                                                json={"content": "First question"}
                                            )
        
        assert response.status_code == 200
        content = response.text
        assert "title_complete" in content

    def test_send_message_stream_handles_errors(self, client, mock_conversation):
        """Test that streaming handles errors gracefully."""
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as mock_s1:
                    mock_s1.side_effect = Exception("Test error")
                    
                    response = client.post(
                        "/api/conversations/test-conv-123/message/stream",
                        json={"content": "Question"}
                    )
        
        assert response.status_code == 200
        content = response.text
        assert "error" in content


class TestCORSMiddleware:
    """Tests for CORS middleware configuration."""

    def test_cors_allows_localhost_5173(self, client):
        """Test that CORS allows requests from localhost:5173."""
        response = client.get(
            "/",
            headers={"Origin": "http://localhost:5173"}
        )
        assert response.status_code == 200

    def test_cors_allows_localhost_3000(self, client):
        """Test that CORS allows requests from localhost:3000."""
        response = client.get(
            "/",
            headers={"Origin": "http://localhost:3000"}
        )
        assert response.status_code == 200


class TestRequestValidation:
    """Tests for request validation with Pydantic models."""

    def test_send_message_validates_content_type(self, client, mock_conversation):
        """Test that SendMessageRequest validates content is a string."""
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            response = client.post(
                "/api/conversations/test-conv-123/message",
                json={"content": 123}  # Should be string
            )
        
        assert response.status_code == 422

    def test_send_message_validates_required_fields(self, client):
        """Test that required fields are enforced."""
        response = client.post(
            "/api/conversations/test-conv-123/message",
            json={"wrong_field": "value"}
        )
        
        assert response.status_code == 422


class TestEdgeCases:
    """Edge case tests."""

    def test_send_message_with_very_long_content(self, client, mock_conversation):
        """Test sending message with very long content."""
        long_content = "A" * 100000
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Ranking"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                        
                        response = client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": long_content}
                        )
        
        assert response.status_code == 200

    def test_send_message_with_unicode_content(self, client, mock_conversation):
        """Test sending message with Unicode characters."""
        unicode_content = "Hello 世界 🌍 café"
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Ranking"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                        
                        response = client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": unicode_content}
                        )
        
        assert response.status_code == 200

    def test_get_conversation_with_special_characters_in_id(self, client, mock_conversation):
        """Test getting conversation with special characters in ID."""
        special_ids = ["test-conv_123", "conv.with.dots", "conv-with-dashes"]
        
        for conv_id in special_ids:
            mock_conv = {**mock_conversation, "id": conv_id}
            with patch("backend.main.storage.get_conversation", return_value=mock_conv):
                response = client.get(f"/api/conversations/{conv_id}")
                assert response.status_code == 200
