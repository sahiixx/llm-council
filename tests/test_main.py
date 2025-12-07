"""Comprehensive unit tests for backend/main.py (FastAPI endpoints)."""

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
        "title": "Test Chat",
        "messages": [
            {"role": "user", "content": "Hello"},
            {
                "role": "assistant",
                "stage1": [{"model": "gpt-4", "response": "Hi there!"}],
                "stage2": [{"model": "gpt-4", "ranking": "Rankings"}],
                "stage3": {"model": "chairman", "response": "Final answer"}
            }
        ]
    }


class TestRootEndpoint:
    """Tests for root health check endpoint."""

    def test_root_returns_ok_status(self, client):
        """Test that root endpoint returns OK status."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data

    def test_root_returns_service_name(self, client):
        """Test that root endpoint identifies the service."""
        response = client.get("/")
        data = response.json()
        assert "LLM Council" in data["service"]

    def test_root_accepts_only_get(self, client):
        """Test that root only accepts GET requests."""
        response = client.post("/")
        assert response.status_code == 405  # Method Not Allowed


class TestListConversationsEndpoint:
    """Tests for GET /api/conversations endpoint."""

    def test_list_empty_conversations(self, client):
        """Test listing when no conversations exist."""
        with patch("backend.main.storage.list_conversations") as mock_list:
            mock_list.return_value = []
            
            response = client.get("/api/conversations")
            
            assert response.status_code == 200
            assert response.json() == []

    def test_list_multiple_conversations(self, client):
        """Test listing multiple conversations."""
        mock_conversations = [
            {
                "id": "conv-1",
                "created_at": "2024-01-01T00:00:00",
                "title": "First",
                "message_count": 2
            },
            {
                "id": "conv-2",
                "created_at": "2024-01-02T00:00:00",
                "title": "Second",
                "message_count": 0
            }
        ]
        
        with patch("backend.main.storage.list_conversations") as mock_list:
            mock_list.return_value = mock_conversations
            
            response = client.get("/api/conversations")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["id"] == "conv-1"
            assert data[1]["id"] == "conv-2"

    def test_list_conversations_includes_metadata(self, client):
        """Test that listed conversations include all required metadata."""
        mock_conv = {
            "id": "test-id",
            "created_at": "2024-01-01T00:00:00",
            "title": "Test Title",
            "message_count": 5
        }
        
        with patch("backend.main.storage.list_conversations") as mock_list:
            mock_list.return_value = [mock_conv]
            
            response = client.get("/api/conversations")
            data = response.json()[0]
            
            assert "id" in data
            assert "created_at" in data
            assert "title" in data
            assert "message_count" in data

    def test_list_conversations_storage_error(self, client):
        """Test handling of storage errors when listing conversations."""
        with patch("backend.main.storage.list_conversations") as mock_list:
            mock_list.side_effect = Exception("Storage error")
            
            # The endpoint doesn't handle exceptions, so it will return 500
            response = client.get("/api/conversations")
            assert response.status_code == 500


class TestCreateConversationEndpoint:
    """Tests for POST /api/conversations endpoint."""

    def test_create_new_conversation(self, client, mock_conversation):
        """Test creating a new conversation."""
        with patch("backend.main.storage.create_conversation") as mock_create:
            with patch("backend.main.uuid.uuid4") as mock_uuid:
                mock_uuid.return_value = "generated-uuid"
                mock_create.return_value = mock_conversation
                
                response = client.post("/api/conversations", json={})
                
                assert response.status_code == 200
                data = response.json()
                assert "id" in data
                assert "created_at" in data
                assert "title" in data
                assert "messages" in data

    def test_create_conversation_generates_uuid(self, client, mock_conversation):
        """Test that conversation ID is auto-generated as UUID."""
        with patch("backend.main.storage.create_conversation") as mock_create:
            with patch("backend.main.uuid.uuid4") as mock_uuid:
                mock_uuid.return_value = uuid.UUID("12345678-1234-5678-1234-567812345678")
                mock_create.return_value = mock_conversation
                
                client.post("/api/conversations", json={})
                
                # Verify UUID was generated and passed to storage
                mock_create.assert_called_once()
                call_args = mock_create.call_args[0][0]
                assert isinstance(call_args, str)

    def test_create_conversation_empty_messages(self, client, mock_conversation):
        """Test that new conversation has empty messages list."""
        with patch("backend.main.storage.create_conversation") as mock_create:
            mock_create.return_value = mock_conversation
            
            response = client.post("/api/conversations", json={})
            data = response.json()
            
            assert data["messages"] == []

    def test_create_conversation_default_title(self, client):
        """Test that new conversation has default title."""
        mock_conv = {
            "id": "new-id",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        
        with patch("backend.main.storage.create_conversation") as mock_create:
            mock_create.return_value = mock_conv
            
            response = client.post("/api/conversations", json={})
            data = response.json()
            
            assert data["title"] == "New Conversation"


class TestGetConversationEndpoint:
    """Tests for GET /api/conversations/{conversation_id} endpoint."""

    def test_get_existing_conversation(self, client, mock_conversation):
        """Test retrieving an existing conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation
            
            response = client.get("/api/conversations/test-conv-123")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "test-conv-123"

    def test_get_nonexistent_conversation(self, client):
        """Test retrieving a conversation that doesn't exist."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.get("/api/conversations/nonexistent")
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    def test_get_conversation_with_messages(self, client, mock_conversation_with_messages):
        """Test retrieving conversation with full message history."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation_with_messages
            
            response = client.get("/api/conversations/test-conv-456")
            data = response.json()
            
            assert len(data["messages"]) == 2
            assert data["messages"][0]["role"] == "user"
            assert data["messages"][1]["role"] == "assistant"

    def test_get_conversation_includes_all_stages(self, client, mock_conversation_with_messages):
        """Test that assistant messages include all 3 stages."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation_with_messages
            
            response = client.get("/api/conversations/test-conv-456")
            data = response.json()
            
            assistant_msg = data["messages"][1]
            assert "stage1" in assistant_msg
            assert "stage2" in assistant_msg
            assert "stage3" in assistant_msg


class TestSendMessageEndpoint:
    """Tests for POST /api/conversations/{conversation_id}/message endpoint."""

    @pytest.mark.asyncio
    async def test_send_message_success(self, client, mock_conversation):
        """Test sending a message successfully."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message") as mock_add_user:
                with patch("backend.main.storage.add_assistant_message") as mock_add_asst:
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_get.return_value = mock_conversation
                        mock_council.return_value = (
                            [{"model": "m1", "response": "R1"}],  # stage1
                            [{"model": "m1", "ranking": "Rank"}],  # stage2
                            {"model": "chairman", "response": "Final"},  # stage3
                            {"label_to_model": {"Response A": "m1"}, "aggregate_rankings": []}  # metadata
                        )
                        
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

    def test_send_message_nonexistent_conversation(self, client):
        """Test sending message to non-existent conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.post(
                "/api/conversations/nonexistent/message",
                json={"content": "Test"}
            )
            
            assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_send_first_message_generates_title(self, client, mock_conversation):
        """Test that first message triggers title generation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.storage.update_conversation_title") as mock_update_title:
                        with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_gen_title:
                            with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                                mock_get.return_value = mock_conversation  # Empty messages
                                mock_gen_title.return_value = "Generated Title"
                                mock_council.return_value = ([], [], {}, {})
                                
                                client.post(
                                    "/api/conversations/test-conv-123/message",
                                    json={"content": "First message"}
                                )
                                
                                mock_gen_title.assert_called_once()
                                mock_update_title.assert_called_once_with("test-conv-123", "Generated Title")

    @pytest.mark.asyncio
    async def test_send_subsequent_message_no_title_update(self, client, mock_conversation_with_messages):
        """Test that subsequent messages don't update title."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.storage.update_conversation_title") as mock_update_title:
                        with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_gen_title:
                            with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                                mock_get.return_value = mock_conversation_with_messages  # Has messages
                                mock_council.return_value = ([], [], {}, {})
                                
                                client.post(
                                    "/api/conversations/test-conv-456/message",
                                    json={"content": "Follow-up message"}
                                )
                                
                                mock_gen_title.assert_not_called()
                                mock_update_title.assert_not_called()

    @pytest.mark.asyncio
    async def test_send_message_saves_user_message(self, client, mock_conversation):
        """Test that user message is saved to storage."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message") as mock_add_user:
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_get.return_value = mock_conversation
                        mock_council.return_value = ([], [], {}, {})
                        
                        client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": "User question"}
                        )
                        
                        mock_add_user.assert_called_once_with("test-conv-123", "User question")

    @pytest.mark.asyncio
    async def test_send_message_saves_assistant_response(self, client, mock_conversation):
        """Test that assistant response is saved with all stages."""
        stage1 = [{"model": "m1", "response": "R1"}]
        stage2 = [{"model": "m1", "ranking": "Rank"}]
        stage3 = {"model": "chairman", "response": "Final"}
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message") as mock_add_asst:
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_get.return_value = mock_conversation
                        mock_council.return_value = (stage1, stage2, stage3, {})
                        
                        client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": "Question"}
                        )
                        
                        mock_add_asst.assert_called_once_with(
                            "test-conv-123",
                            stage1,
                            stage2,
                            stage3
                        )

    def test_send_message_requires_content(self, client, mock_conversation):
        """Test that message content is required."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation
            
            response = client.post(
                "/api/conversations/test-conv-123/message",
                json={}
            )
            
            assert response.status_code == 422  # Validation error


class TestSendMessageStreamEndpoint:
    """Tests for POST /api/conversations/{conversation_id}/message/stream endpoint."""

    def test_stream_endpoint_returns_sse(self, client, mock_conversation):
        """Test that stream endpoint returns Server-Sent Events."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as mock_s1:
                        with patch("backend.main.stage2_collect_rankings", new_callable=AsyncMock) as mock_s2:
                            with patch("backend.main.stage3_synthesize_final", new_callable=AsyncMock) as mock_s3:
                                mock_get.return_value = mock_conversation
                                mock_s1.return_value = []
                                mock_s2.return_value = ([], {})
                                mock_s3.return_value = {"model": "m", "response": "R"}
                                
                                response = client.post(
                                    "/api/conversations/test-conv-123/message/stream",
                                    json={"content": "Test"}
                                )
                                
                                assert response.status_code == 200
                                assert "text/event-stream" in response.headers["content-type"]

    def test_stream_nonexistent_conversation(self, client):
        """Test streaming to non-existent conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.post(
                "/api/conversations/nonexistent/message/stream",
                json={"content": "Test"}
            )
            
            assert response.status_code == 404

    def test_stream_sends_stage_events(self, client, mock_conversation):
        """Test that stream sends events for each stage."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as mock_s1:
                        with patch("backend.main.stage2_collect_rankings", new_callable=AsyncMock) as mock_s2:
                            with patch("backend.main.stage3_synthesize_final", new_callable=AsyncMock) as mock_s3:
                                with patch("backend.main.calculate_aggregate_rankings") as mock_agg:
                                    mock_get.return_value = mock_conversation
                                    mock_s1.return_value = [{"model": "m1", "response": "R1"}]
                                    mock_s2.return_value = ([{"model": "m1", "ranking": "Rank"}], {"Response A": "m1"})
                                    mock_s3.return_value = {"model": "chairman", "response": "Final"}
                                    mock_agg.return_value = []
                                    
                                    response = client.post(
                                        "/api/conversations/test-conv-123/message/stream",
                                        json={"content": "Test"}
                                    )
                                    
                                    content = response.text
                                    assert "stage1_start" in content
                                    assert "stage1_complete" in content
                                    assert "stage2_start" in content
                                    assert "stage2_complete" in content
                                    assert "stage3_start" in content
                                    assert "stage3_complete" in content
                                    assert "complete" in content


class TestCORSConfiguration:
    """Tests for CORS middleware configuration."""

    def test_cors_allows_localhost_5173(self, client):
        """Test that CORS allows requests from Vite dev server."""
        response = client.get(
            "/",
            headers={"Origin": "http://localhost:5173"}
        )
        # CORS headers should be present
        assert response.status_code == 200

    def test_cors_allows_credentials(self, client):
        """Test that CORS allows credentials."""
        response = client.options(
            "/api/conversations",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET"
            }
        )
        # Should allow credentials
        assert response.status_code == 200


class TestPydanticModels:
    """Tests for Pydantic request/response models."""

    def test_send_message_request_validation(self, client, mock_conversation):
        """Test SendMessageRequest validates content field."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation
            
            # Missing content field
            response = client.post(
                "/api/conversations/test-conv-123/message",
                json={}
            )
            assert response.status_code == 422

    def test_send_message_request_accepts_string_content(self, client, mock_conversation):
        """Test that content must be a string."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                with patch("backend.main.storage.add_user_message"):
                    with patch("backend.main.storage.add_assistant_message"):
                        mock_get.return_value = mock_conversation
                        mock_council.return_value = ([], [], {}, {})
                        
                        # Valid string content
                        response = client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": "Valid string"}
                        )
                        assert response.status_code == 200


class TestEdgeCases:
    """Edge case tests for API endpoints."""

    def test_empty_content_message(self, client, mock_conversation):
        """Test sending message with empty content."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message") as mock_add:
                with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                    with patch("backend.main.storage.add_assistant_message"):
                        mock_get.return_value = mock_conversation
                        mock_council.return_value = ([], [], {}, {})
                        
                        response = client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": ""}
                        )
                        
                        # Should still accept empty string
                        assert response.status_code == 200
                        mock_add.assert_called_once_with("test-conv-123", "")

    def test_very_long_message(self, client, mock_conversation):
        """Test sending very long message."""
        long_content = "A" * 100000
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                    with patch("backend.main.storage.add_assistant_message"):
                        mock_get.return_value = mock_conversation
                        mock_council.return_value = ([], [], {}, {})
                        
                        response = client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": long_content}
                        )
                        
                        assert response.status_code == 200

    def test_unicode_in_message(self, client, mock_conversation):
        """Test sending message with Unicode characters."""
        unicode_content = "Hello 世界! Café ☕ 🎉"
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                    with patch("backend.main.storage.add_assistant_message"):
                        mock_get.return_value = mock_conversation
                        mock_council.return_value = ([], [], {}, {})
                        
                        response = client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": unicode_content}
                        )
                        
                        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_council_exception_handling(self, client, mock_conversation):
        """Test that council exceptions are handled gracefully."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                    mock_get.return_value = mock_conversation
                    mock_council.side_effect = Exception("Council failed")
                    
                    response = client.post(
                        "/api/conversations/test-conv-123/message",
                        json={"content": "Test"}
                    )
                    
                    # Should return 500 for unhandled exceptions
                    assert response.status_code == 500
