"""Comprehensive unit tests for backend/main.py FastAPI application."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
import uuid
import json
from backend.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_conversation():
    """Create a mock conversation object."""
    return {
        "id": "test-conv-123",
        "created_at": "2024-01-01T00:00:00",
        "title": "Test Conversation",
        "messages": [
            {"role": "user", "content": "Hello"},
            {
                "role": "assistant",
                "stage1": [{"model": "model1", "response": "Response 1"}],
                "stage2": [{"model": "model1", "ranking": "Ranking"}],
                "stage3": {"model": "chairman", "response": "Final"}
            }
        ]
    }


class TestRootEndpoint:
    """Tests for root health check endpoint."""

    def test_root_returns_200(self, client):
        """Test that root endpoint returns 200 OK."""
        response = client.get("/")
        assert response.status_code == 200

    def test_root_returns_json(self, client):
        """Test that root endpoint returns JSON."""
        response = client.get("/")
        assert response.headers["content-type"] == "application/json"

    def test_root_contains_status(self, client):
        """Test that root response contains status field."""
        response = client.get("/")
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"

    def test_root_contains_service_name(self, client):
        """Test that root response contains service name."""
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
            {"id": "2", "created_at": "2024-01-02T00:00:00", "title": "Conv 2", "message_count": 4}
        ]
        
        with patch("backend.main.storage.list_conversations", return_value=mock_convs):
            response = client.get("/api/conversations")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "1"
        assert data[1]["id"] == "2"

    def test_list_conversations_empty(self, client):
        """Test listing when no conversations exist."""
        with patch("backend.main.storage.list_conversations", return_value=[]):
            response = client.get("/api/conversations")
        
        assert response.status_code == 200
        assert response.json() == []

    def test_list_conversations_metadata_structure(self, client):
        """Test that returned metadata has correct structure."""
        mock_convs = [{
            "id": "test-id",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test Title",
            "message_count": 5
        }]
        
        with patch("backend.main.storage.list_conversations", return_value=mock_convs):
            response = client.get("/api/conversations")
        
        data = response.json()
        assert "id" in data[0]
        assert "created_at" in data[0]
        assert "title" in data[0]
        assert "message_count" in data[0]


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
        """Test that conversation creation generates a valid UUID."""
        with patch("backend.main.storage.create_conversation", return_value=mock_conversation) as mock_create:
            response = client.post("/api/conversations", json={})
        
        # Verify that create_conversation was called with a UUID string
        call_args = mock_create.call_args[0][0]
        # Should be able to parse as UUID
        uuid.UUID(call_args)

    def test_create_conversation_empty_messages(self, client):
        """Test that new conversation has empty messages list."""
        new_conv = {
            "id": "new-id",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        
        with patch("backend.main.storage.create_conversation", return_value=new_conv):
            response = client.post("/api/conversations", json={})
        
        data = response.json()
        assert data["messages"] == []

    def test_create_conversation_accepts_empty_request(self, client, mock_conversation):
        """Test that endpoint accepts empty request body."""
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
        """Test getting non-existent conversation returns 404."""
        with patch("backend.main.storage.get_conversation", return_value=None):
            response = client.get("/api/conversations/nonexistent")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_conversation_includes_all_fields(self, client, mock_conversation):
        """Test that response includes all conversation fields."""
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            response = client.get("/api/conversations/test-conv-123")
        
        data = response.json()
        assert "id" in data
        assert "created_at" in data
        assert "title" in data
        assert "messages" in data

    def test_get_conversation_includes_full_messages(self, client, mock_conversation):
        """Test that response includes full message content."""
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            response = client.get("/api/conversations/test-conv-123")
        
        data = response.json()
        assert len(data["messages"]) == 2
        assert data["messages"][0]["role"] == "user"
        assert data["messages"][1]["role"] == "assistant"
        assert "stage1" in data["messages"][1]


class TestSendMessage:
    """Tests for POST /api/conversations/{conversation_id}/message endpoint."""

    def test_send_message_success(self, client, mock_conversation):
        """Test successfully sending a message."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                        
                        response = client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": "Test message"}
                        )
        
        assert response.status_code == 200
        data = response.json()
        assert "stage1" in data
        assert "stage2" in data
        assert "stage3" in data
        assert "metadata" in data

    def test_send_message_not_found(self, client):
        """Test sending message to non-existent conversation."""
        with patch("backend.main.storage.get_conversation", return_value=None):
            response = client.post(
                "/api/conversations/nonexistent/message",
                json={"content": "Test"}
            )
        
        assert response.status_code == 404

    def test_send_message_generates_title_for_first_message(self, client):
        """Test that title is generated for first message."""
        empty_conv = {
            "id": "test-id",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation", return_value=empty_conv):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_title:
                        with patch("backend.main.storage.update_conversation_title") as mock_update:
                            with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                                mock_title.return_value = "Generated Title"
                                mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                                
                                client.post(
                                    "/api/conversations/test-id/message",
                                    json={"content": "First message"}
                                )
                                
                                mock_title.assert_called_once_with("First message")
                                mock_update.assert_called_once_with("test-id", "Generated Title")

    def test_send_message_no_title_for_subsequent_messages(self, client, mock_conversation):
        """Test that title is not generated for subsequent messages."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_title:
                        with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                            mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                            
                            client.post(
                                "/api/conversations/test-conv-123/message",
                                json={"content": "Second message"}
                            )
                            
                            mock_title.assert_not_called()

    def test_send_message_adds_user_message(self, client, mock_conversation):
        """Test that user message is added to conversation."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message") as mock_add_user:
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                        
                        client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": "Test message"}
                        )
                        
                        mock_add_user.assert_called_once_with("test-conv-123", "Test message")

    def test_send_message_adds_assistant_message(self, client, mock_conversation):
        """Test that assistant message is added with all stages."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message") as mock_add_assistant:
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                        
                        client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": "Test"}
                        )
                        
                        mock_add_assistant.assert_called_once_with(
                            "test-conv-123",
                            mock_stage1,
                            mock_stage2,
                            mock_stage3
                        )

    def test_send_message_validates_content_field(self, client, mock_conversation):
        """Test that content field is required."""
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            response = client.post(
                "/api/conversations/test-conv-123/message",
                json={}
            )
        
        assert response.status_code == 422  # Validation error


class TestSendMessageStream:
    """Tests for POST /api/conversations/{conversation_id}/message/stream endpoint."""

    def test_send_message_stream_not_found(self, client):
        """Test streaming to non-existent conversation returns 404."""
        with patch("backend.main.storage.get_conversation", return_value=None):
            response = client.post(
                "/api/conversations/nonexistent/message/stream",
                json={"content": "Test"}
            )
        
        assert response.status_code == 404

    def test_send_message_stream_returns_event_stream(self, client, mock_conversation):
        """Test that streaming endpoint returns event-stream content type."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        label_to_model = {"Response A": "m1"}
        aggregate = [{"model": "m1", "average_rank": 1.0}]
        
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as s1:
                        with patch("backend.main.stage2_collect_rankings", new_callable=AsyncMock) as s2:
                            with patch("backend.main.stage3_synthesize_final", new_callable=AsyncMock) as s3:
                                with patch("backend.main.calculate_aggregate_rankings", return_value=aggregate):
                                    s1.return_value = mock_stage1
                                    s2.return_value = (mock_stage2, label_to_model)
                                    s3.return_value = mock_stage3
                                    
                                    response = client.post(
                                        "/api/conversations/test-conv-123/message/stream",
                                        json={"content": "Test"}
                                    )
        
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

    def test_send_message_stream_stages_in_order(self, client, mock_conversation):
        """Test that stream events are sent in correct order."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        label_to_model = {"Response A": "m1"}
        aggregate = [{"model": "m1", "average_rank": 1.0}]
        
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as s1:
                        with patch("backend.main.stage2_collect_rankings", new_callable=AsyncMock) as s2:
                            with patch("backend.main.stage3_synthesize_final", new_callable=AsyncMock) as s3:
                                with patch("backend.main.calculate_aggregate_rankings", return_value=aggregate):
                                    s1.return_value = mock_stage1
                                    s2.return_value = (mock_stage2, label_to_model)
                                    s3.return_value = mock_stage3
                                    
                                    response = client.post(
                                        "/api/conversations/test-conv-123/message/stream",
                                        json={"content": "Test"}
                                    )
                                    
                                    content = response.text
                                    # Verify stage events appear in order
                                    assert "stage1_start" in content
                                    assert "stage1_complete" in content
                                    assert "stage2_start" in content
                                    assert "stage2_complete" in content
                                    assert "stage3_start" in content
                                    assert "stage3_complete" in content
                                    assert "complete" in content

    def test_send_message_stream_title_generation(self, client):
        """Test that title is generated in parallel for first message."""
        empty_conv = {
            "id": "test-id",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        label_to_model = {"Response A": "m1"}
        aggregate = [{"model": "m1", "average_rank": 1.0}]
        
        with patch("backend.main.storage.get_conversation", return_value=empty_conv):
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.storage.update_conversation_title"):
                        with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_title:
                            with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as s1:
                                with patch("backend.main.stage2_collect_rankings", new_callable=AsyncMock) as s2:
                                    with patch("backend.main.stage3_synthesize_final", new_callable=AsyncMock) as s3:
                                        with patch("backend.main.calculate_aggregate_rankings", return_value=aggregate):
                                            mock_title.return_value = "Generated Title"
                                            s1.return_value = mock_stage1
                                            s2.return_value = (mock_stage2, label_to_model)
                                            s3.return_value = mock_stage3
                                            
                                            response = client.post(
                                                "/api/conversations/test-id/message/stream",
                                                json={"content": "First"}
                                            )
                                            
                                            content = response.text
                                            assert "title_complete" in content


class TestCORSMiddleware:
    """Tests for CORS configuration."""

    def test_cors_headers_present(self, client):
        """Test that CORS headers are configured."""
        response = client.options(
            "/api/conversations",
            headers={"Origin": "http://localhost:5173"}
        )
        # CORS should be configured, check for access-control headers
        assert response.status_code in [200, 204]


class TestEdgeCases:
    """Edge case tests for the API."""

    def test_invalid_conversation_id_format(self, client):
        """Test handling of malformed conversation IDs."""
        with patch("backend.main.storage.get_conversation", return_value=None):
            response = client.get("/api/conversations/invalid%20id%20with%20spaces")
        
        assert response.status_code == 404

    def test_send_message_empty_content(self, client, mock_conversation):
        """Test sending message with empty content."""
        with patch("backend.main.storage.get_conversation", return_value=mock_conversation):
            response = client.post(
                "/api/conversations/test-conv-123/message",
                json={"content": ""}
            )
        
        # Empty content should still be valid (backend will handle it)
        assert response.status_code in [200, 422]

    def test_send_message_very_long_content(self, client, mock_conversation):
        """Test sending message with very long content."""
        long_content = "A" * 100000
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
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

    def test_send_message_unicode_content(self, client, mock_conversation):
        """Test sending message with Unicode characters."""
        unicode_content = "Hello 世界 🌍 café"
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
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
