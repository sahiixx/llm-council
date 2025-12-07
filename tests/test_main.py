"""Comprehensive unit tests for backend/main.py (FastAPI application)."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
import json
import uuid

from backend.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_storage():
    """Mock all storage functions."""
    with patch('backend.main.storage') as mock:
        yield mock


@pytest.fixture
def mock_council():
    """Mock council functions."""
    with patch('backend.main.run_full_council', new_callable=AsyncMock) as mock_run, \
         patch('backend.main.generate_conversation_title', new_callable=AsyncMock) as mock_title, \
         patch('backend.main.stage1_collect_responses', new_callable=AsyncMock) as mock_s1, \
         patch('backend.main.stage2_collect_rankings', new_callable=AsyncMock) as mock_s2, \
         patch('backend.main.stage3_synthesize_final', new_callable=AsyncMock) as mock_s3, \
         patch('backend.main.calculate_aggregate_rankings') as mock_calc:
        yield {
            'run_full_council': mock_run,
            'generate_title': mock_title,
            'stage1': mock_s1,
            'stage2': mock_s2,
            'stage3': mock_s3,
            'calculate': mock_calc,
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
        assert "LLM Council" in data["service"]


class TestListConversations:
    """Tests for GET /api/conversations endpoint."""

    def test_list_conversations_success(self, client, mock_storage):
        """Test successfully listing conversations."""
        mock_conversations = [
            {
                "id": "conv-1",
                "created_at": "2024-01-01T00:00:00",
                "title": "Test Conversation",
                "message_count": 2
            },
            {
                "id": "conv-2",
                "created_at": "2024-01-02T00:00:00",
                "title": "Another Conversation",
                "message_count": 4
            }
        ]
        mock_storage.list_conversations.return_value = mock_conversations

        response = client.get("/api/conversations")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "conv-1"
        assert data[1]["id"] == "conv-2"

    def test_list_conversations_empty(self, client, mock_storage):
        """Test listing conversations when none exist."""
        mock_storage.list_conversations.return_value = []

        response = client.get("/api/conversations")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_conversations_includes_metadata(self, client, mock_storage):
        """Test that conversation list includes required metadata."""
        mock_conversations = [{
            "id": "conv-1",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "message_count": 1
        }]
        mock_storage.list_conversations.return_value = mock_conversations

        response = client.get("/api/conversations")
        data = response.json()

        assert "id" in data[0]
        assert "created_at" in data[0]
        assert "title" in data[0]
        assert "message_count" in data[0]


class TestCreateConversation:
    """Tests for POST /api/conversations endpoint."""

    def test_create_conversation_success(self, client, mock_storage):
        """Test successfully creating a new conversation."""
        mock_conv = {
            "id": "new-conv-id",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        mock_storage.create_conversation.return_value = mock_conv

        response = client.post("/api/conversations", json={})

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "new-conv-id"
        assert data["title"] == "New Conversation"
        assert data["messages"] == []

    def test_create_conversation_generates_uuid(self, client, mock_storage):
        """Test that conversation ID is generated."""
        mock_storage.create_conversation.return_value = {
            "id": "test-id",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }

        client.post("/api/conversations", json={})

        # Verify storage was called with some UUID
        args = mock_storage.create_conversation.call_args[0]
        assert len(args) == 1
        # Should be a valid UUID format
        try:
            uuid.UUID(args[0])
        except ValueError:
            pytest.fail("Generated ID is not a valid UUID")

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


class TestGetConversation:
    """Tests for GET /api/conversations/{conversation_id} endpoint."""

    def test_get_conversation_success(self, client, mock_storage):
        """Test successfully retrieving a conversation."""
        mock_conv = {
            "id": "conv-123",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test Conversation",
            "messages": [
                {"role": "user", "content": "Hello"}
            ]
        }
        mock_storage.get_conversation.return_value = mock_conv

        response = client.get("/api/conversations/conv-123")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "conv-123"
        assert len(data["messages"]) == 1

    def test_get_conversation_not_found(self, client, mock_storage):
        """Test retrieving non-existent conversation returns 404."""
        mock_storage.get_conversation.return_value = None

        response = client.get("/api/conversations/nonexistent")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_conversation_includes_full_messages(self, client, mock_storage):
        """Test that full conversation includes all messages."""
        mock_conv = {
            "id": "conv-123",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": [
                {"role": "user", "content": "Q1"},
                {"role": "assistant", "stage1": [], "stage2": [], "stage3": {}},
                {"role": "user", "content": "Q2"},
            ]
        }
        mock_storage.get_conversation.return_value = mock_conv

        response = client.get("/api/conversations/conv-123")
        data = response.json()

        assert len(data["messages"]) == 3


class TestSendMessage:
    """Tests for POST /api/conversations/{conversation_id}/message endpoint."""

    def test_send_message_success(self, client, mock_storage, mock_council):
        """Test successfully sending a message."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        mock_council['run_full_council'].return_value = (
            [{"model": "m1", "response": "R1"}],  # stage1
            [{"model": "m1", "ranking": "Rank"}],  # stage2
            {"model": "chairman", "response": "Final"},  # stage3
            {"label_to_model": {}, "aggregate_rankings": []}  # metadata
        )
        mock_council['generate_title'].return_value = "Test Title"

        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": "Test question"}
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

    def test_send_message_saves_user_message(self, client, mock_storage, mock_council):
        """Test that user message is saved."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        mock_council['run_full_council'].return_value = ([], [], {}, {})
        mock_council['generate_title'].return_value = "Title"

        client.post(
            "/api/conversations/conv-1/message",
            json={"content": "User question"}
        )

        mock_storage.add_user_message.assert_called_once_with("conv-1", "User question")

    def test_send_message_generates_title_for_first_message(self, client, mock_storage, mock_council):
        """Test that title is generated for first message."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []  # Empty = first message
        }
        mock_council['run_full_council'].return_value = ([], [], {}, {})
        mock_council['generate_title'].return_value = "Generated Title"

        client.post(
            "/api/conversations/conv-1/message",
            json={"content": "First question"}
        )

        mock_council['generate_title'].assert_called_once()
        mock_storage.update_conversation_title.assert_called_once_with(
            "conv-1", "Generated Title"
        )

    def test_send_message_no_title_for_subsequent_messages(self, client, mock_storage, mock_council):
        """Test that title is not generated for subsequent messages."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": [{"role": "user", "content": "Previous"}]
        }
        mock_council['run_full_council'].return_value = ([], [], {}, {})

        client.post(
            "/api/conversations/conv-1/message",
            json={"content": "Second question"}
        )

        mock_council['generate_title'].assert_not_called()
        mock_storage.update_conversation_title.assert_not_called()

    def test_send_message_saves_assistant_message(self, client, mock_storage, mock_council):
        """Test that assistant message is saved."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        stage1 = [{"model": "m1", "response": "R1"}]
        stage2 = [{"model": "m1", "ranking": "Rank"}]
        stage3 = {"model": "chairman", "response": "Final"}
        
        mock_council['run_full_council'].return_value = (stage1, stage2, stage3, {})
        mock_council['generate_title'].return_value = "Title"

        client.post(
            "/api/conversations/conv-1/message",
            json={"content": "Question"}
        )

        mock_storage.add_assistant_message.assert_called_once_with(
            "conv-1", stage1, stage2, stage3
        )

    def test_send_message_runs_full_council(self, client, mock_storage, mock_council):
        """Test that full council process is executed."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        mock_council['run_full_council'].return_value = ([], [], {}, {})
        mock_council['generate_title'].return_value = "Title"

        client.post(
            "/api/conversations/conv-1/message",
            json={"content": "Test question"}
        )

        mock_council['run_full_council'].assert_called_once_with("Test question")


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

    def test_send_message_stream_returns_sse(self, client, mock_storage, mock_council):
        """Test that streaming endpoint returns Server-Sent Events."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        mock_council['stage1'].return_value = [{"model": "m1", "response": "R1"}]
        mock_council['stage2'].return_value = (
            [{"model": "m1", "ranking": "Rank"}],
            {"Response A": "m1"}
        )
        mock_council['stage3'].return_value = {"model": "chairman", "response": "Final"}
        mock_council['calculate'].return_value = []
        mock_council['generate_title'].return_value = "Title"

        response = client.post(
            "/api/conversations/conv-1/message/stream",
            json={"content": "Test"}
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

    def test_send_message_stream_saves_messages(self, client, mock_storage, mock_council):
        """Test that streaming endpoint saves messages."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        mock_council['stage1'].return_value = []
        mock_council['stage2'].return_value = ([], {})
        mock_council['stage3'].return_value = {}
        mock_council['calculate'].return_value = []
        mock_council['generate_title'].return_value = "Title"

        client.post(
            "/api/conversations/conv-1/message/stream",
            json={"content": "Test"}
        )

        mock_storage.add_user_message.assert_called_once()
        mock_storage.add_assistant_message.assert_called_once()

    def test_send_message_stream_executes_stages(self, client, mock_storage, mock_council):
        """Test that all three stages are executed in streaming mode."""
        mock_storage.get_conversation.return_value = {
            "id": "conv-1",
            "messages": []
        }
        
        mock_council['stage1'].return_value = [{"model": "m1", "response": "R1"}]
        mock_council['stage2'].return_value = ([{"model": "m1", "ranking": "R"}], {})
        mock_council['stage3'].return_value = {"model": "c", "response": "F"}
        mock_council['calculate'].return_value = []
        mock_council['generate_title'].return_value = "Title"

        client.post(
            "/api/conversations/conv-1/message/stream",
            json={"content": "Test"}
        )

        mock_council['stage1'].assert_called_once()
        mock_council['stage2'].assert_called_once()
        mock_council['stage3'].assert_called_once()


class TestCORSConfiguration:
    """Tests for CORS middleware configuration."""

    def test_cors_allows_localhost_origins(self, client):
        """Test that CORS is configured for localhost development."""
        response = client.options(
            "/api/conversations",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET"
            }
        )
        
        # CORS should allow the request
        assert response.status_code in [200, 204]


class TestInputValidation:
    """Tests for input validation."""

    def test_send_message_requires_content(self, client, mock_storage):
        """Test that content field is required for sending messages."""
        mock_storage.get_conversation.return_value = {"id": "conv-1", "messages": []}
        
        response = client.post(
            "/api/conversations/conv-1/message",
            json={}  # Missing content
        )
        
        assert response.status_code == 422  # Validation error

    def test_send_message_empty_content(self, client, mock_storage, mock_council):
        """Test sending message with empty content."""
        mock_storage.get_conversation.return_value = {"id": "conv-1", "messages": []}
        mock_council['run_full_council'].return_value = ([], [], {}, {})
        mock_council['generate_title'].return_value = "Title"
        
        response = client.post(
            "/api/conversations/conv-1/message",
            json={"content": ""}
        )
        
        # Empty content should still be accepted (validation happens at business logic level)
        assert response.status_code == 200


class TestErrorHandling:
    """Tests for error handling."""

    def test_handles_storage_errors_gracefully(self, client, mock_storage):
        """Test that storage errors are handled gracefully."""
        mock_storage.get_conversation.side_effect = Exception("Storage error")
        
        with pytest.raises(Exception):
            client.get("/api/conversations/conv-1")

    def test_handles_council_errors(self, client, mock_storage, mock_council):
        """Test that council errors are handled."""
        mock_storage.get_conversation.return_value = {"id": "conv-1", "messages": []}
        mock_council['run_full_council'].side_effect = Exception("Council error")
        mock_council['generate_title'].return_value = "Title"
        
        with pytest.raises(Exception):
            client.post(
                "/api/conversations/conv-1/message",
                json={"content": "Test"}
            )


class TestIntegrationScenarios:
    """Integration tests for complete workflows."""

    def test_complete_conversation_workflow(self, client, mock_storage, mock_council):
        """Test a complete conversation workflow from creation to messaging."""
        # Create conversation
        mock_storage.create_conversation.return_value = {
            "id": "new-conv",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        
        create_response = client.post("/api/conversations", json={})
        conv_id = create_response.json()["id"]
        
        # Send first message
        mock_storage.get_conversation.return_value = {
            "id": conv_id,
            "messages": []
        }
        mock_council['run_full_council'].return_value = (
            [{"model": "m1", "response": "R1"}],
            [{"model": "m1", "ranking": "Rank"}],
            {"model": "chairman", "response": "Final"},
            {}
        )
        mock_council['generate_title'].return_value = "Python Question"
        
        msg_response = client.post(
            f"/api/conversations/{conv_id}/message",
            json={"content": "What is Python?"}
        )
        
        assert create_response.status_code == 200
        assert msg_response.status_code == 200
        assert "stage3" in msg_response.json()

    def test_multiple_messages_in_conversation(self, client, mock_storage, mock_council):
        """Test sending multiple messages in same conversation."""
        conv_id = "multi-msg-conv"
        
        # First message
        mock_storage.get_conversation.return_value = {
            "id": conv_id,
            "messages": []
        }
        mock_council['run_full_council'].return_value = ([], [], {}, {})
        mock_council['generate_title'].return_value = "Title"
        
        client.post(
            f"/api/conversations/{conv_id}/message",
            json={"content": "First question"}
        )
        
        # Second message
        mock_storage.get_conversation.return_value = {
            "id": conv_id,
            "messages": [
                {"role": "user", "content": "First question"},
                {"role": "assistant", "stage1": [], "stage2": [], "stage3": {}}
            ]
        }
        mock_council['run_full_council'].return_value = ([], [], {}, {})
        
        response = client.post(
            f"/api/conversations/{conv_id}/message",
            json={"content": "Second question"}
        )
        
        assert response.status_code == 200
        # Title should only be generated once
        assert mock_council['generate_title'].call_count == 1
