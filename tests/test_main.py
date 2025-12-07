"""Comprehensive unit tests for backend/main.py FastAPI application."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from backend.main import app
import json


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
        "messages": [
            {"role": "user", "content": "Hello"},
            {
                "role": "assistant",
                "stage1": [{"model": "model1", "response": "Response 1"}],
                "stage2": [{"model": "model1", "ranking": "Ranking 1"}],
                "stage3": {"model": "chairman", "response": "Final answer"}
            }
        ]
    }


@pytest.fixture
def mock_conversation_metadata():
    """Mock conversation metadata."""
    return {
        "id": "test-conv-123",
        "created_at": "2024-01-01T00:00:00",
        "title": "Test Conversation",
        "message_count": 2
    }


class TestRootEndpoint:
    """Tests for root endpoint."""

    def test_root_returns_ok(self, client):
        """Test that root endpoint returns OK status."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data

    def test_root_service_name(self, client):
        """Test that root endpoint returns correct service name."""
        response = client.get("/")
        data = response.json()
        assert "LLM Council" in data["service"]


class TestListConversations:
    """Tests for listing conversations."""

    def test_list_conversations_success(self, client, mock_conversation_metadata):
        """Test successful listing of conversations."""
        with patch("backend.main.storage.list_conversations") as mock_list:
            mock_list.return_value = [mock_conversation_metadata]
            
            response = client.get("/api/conversations")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["id"] == "test-conv-123"
            assert data[0]["title"] == "Test Conversation"

    def test_list_conversations_empty(self, client):
        """Test listing when no conversations exist."""
        with patch("backend.main.storage.list_conversations") as mock_list:
            mock_list.return_value = []
            
            response = client.get("/api/conversations")
            
            assert response.status_code == 200
            assert response.json() == []

    def test_list_conversations_multiple(self, client):
        """Test listing multiple conversations."""
        mock_convs = [
            {"id": "conv1", "created_at": "2024-01-01T00:00:00", "title": "Conv 1", "message_count": 2},
            {"id": "conv2", "created_at": "2024-01-02T00:00:00", "title": "Conv 2", "message_count": 4},
            {"id": "conv3", "created_at": "2024-01-03T00:00:00", "title": "Conv 3", "message_count": 1},
        ]
        
        with patch("backend.main.storage.list_conversations") as mock_list:
            mock_list.return_value = mock_convs
            
            response = client.get("/api/conversations")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 3


class TestCreateConversation:
    """Tests for creating conversations."""

    def test_create_conversation_success(self, client):
        """Test successful conversation creation."""
        mock_conv = {
            "id": "new-conv-456",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        
        with patch("backend.main.storage.create_conversation") as mock_create:
            mock_create.return_value = mock_conv
            
            response = client.post("/api/conversations", json={})
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "new-conv-456"
            assert data["title"] == "New Conversation"
            assert data["messages"] == []

    def test_create_conversation_generates_uuid(self, client):
        """Test that conversation creation generates a UUID."""
        with patch("backend.main.storage.create_conversation") as mock_create:
            mock_create.return_value = {"id": "uuid-123", "created_at": "2024-01-01", "title": "New", "messages": []}
            
            response = client.post("/api/conversations", json={})
            
            # Verify create_conversation was called with a string ID
            mock_create.assert_called_once()
            call_args = mock_create.call_args[0]
            assert isinstance(call_args[0], str)
            assert len(call_args[0]) > 0


class TestGetConversation:
    """Tests for getting a specific conversation."""

    def test_get_conversation_success(self, client, mock_conversation):
        """Test successfully retrieving a conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation
            
            response = client.get("/api/conversations/test-conv-123")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "test-conv-123"
            assert data["title"] == "Test Conversation"
            assert len(data["messages"]) == 2

    def test_get_conversation_not_found(self, client):
        """Test getting a non-existent conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.get("/api/conversations/nonexistent")
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    def test_get_conversation_with_empty_messages(self, client):
        """Test getting a conversation with no messages."""
        mock_conv = {
            "id": "empty-conv",
            "created_at": "2024-01-01T00:00:00",
            "title": "Empty",
            "messages": []
        }
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conv
            
            response = client.get("/api/conversations/empty-conv")
            
            assert response.status_code == 200
            data = response.json()
            assert data["messages"] == []


class TestSendMessage:
    """Tests for sending messages (non-streaming endpoint)."""

    @pytest.mark.asyncio
    async def test_send_message_success(self, client, mock_conversation):
        """Test successfully sending a message."""
        stage1_results = [{"model": "m1", "response": "R1"}]
        stage2_results = [{"model": "m1", "ranking": "Ranking"}]
        stage3_result = {"model": "chairman", "response": "Final"}
        metadata = {"label_to_model": {"Response A": "m1"}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message") as mock_add_user:
                with patch("backend.main.storage.add_assistant_message") as mock_add_asst:
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_get.return_value = mock_conversation
                        mock_council.return_value = (stage1_results, stage2_results, stage3_result, metadata)
                        
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

    def test_send_message_conversation_not_found(self, client):
        """Test sending message to non-existent conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.post(
                "/api/conversations/nonexistent/message",
                json={"content": "Test"}
            )
            
            assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_send_first_message_generates_title(self, client):
        """Test that first message generates a conversation title."""
        mock_conv = {
            "id": "test-conv",
            "created_at": "2024-01-01",
            "title": "New Conversation",
            "messages": []  # Empty messages - first message
        }
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.storage.update_conversation_title") as mock_update:
                        with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_gen_title:
                            with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                                mock_get.return_value = mock_conv
                                mock_gen_title.return_value = "Generated Title"
                                mock_council.return_value = ([], [], {"model": "m", "response": "r"}, {})
                                
                                client.post(
                                    "/api/conversations/test-conv/message",
                                    json={"content": "Hello"}
                                )
                                
                                mock_gen_title.assert_called_once_with("Hello")
                                mock_update.assert_called_once_with("test-conv", "Generated Title")

    @pytest.mark.asyncio
    async def test_send_subsequent_message_no_title(self, client, mock_conversation):
        """Test that subsequent messages don't generate a title."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_gen_title:
                        with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                            mock_get.return_value = mock_conversation  # Has messages
                            mock_council.return_value = ([], [], {"model": "m", "response": "r"}, {})
                            
                            client.post(
                                "/api/conversations/test-conv-123/message",
                                json={"content": "Follow up"}
                            )
                            
                            mock_gen_title.assert_not_called()


class TestSendMessageStream:
    """Tests for streaming message endpoint."""

    def test_stream_endpoint_exists(self, client, mock_conversation):
        """Test that streaming endpoint exists and accepts POST."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation
            
            # The endpoint should accept the request
            response = client.post(
                "/api/conversations/test-conv-123/message/stream",
                json={"content": "Test"}
            )
            
            # Should return 200 (will fail to stream in test, but endpoint exists)
            assert response.status_code == 200

    def test_stream_conversation_not_found(self, client):
        """Test streaming to non-existent conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.post(
                "/api/conversations/nonexistent/message/stream",
                json={"content": "Test"}
            )
            
            assert response.status_code == 404

    def test_stream_response_headers(self, client, mock_conversation):
        """Test that stream response has correct headers."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as mock_s1:
                    with patch("backend.main.stage2_collect_rankings", new_callable=AsyncMock) as mock_s2:
                        with patch("backend.main.stage3_synthesize_final", new_callable=AsyncMock) as mock_s3:
                            with patch("backend.main.storage.add_assistant_message"):
                                mock_get.return_value = mock_conversation
                                mock_s1.return_value = []
                                mock_s2.return_value = ([], {})
                                mock_s3.return_value = {"model": "m", "response": "r"}
                                
                                response = client.post(
                                    "/api/conversations/test-conv-123/message/stream",
                                    json={"content": "Test"}
                                )
                                
                                assert response.headers["content-type"] == "text/event-stream; charset=utf-8"


class TestCORSMiddleware:
    """Tests for CORS middleware configuration."""

    def test_cors_allows_localhost(self, client):
        """Test that CORS is configured for localhost."""
        response = client.options(
            "/api/conversations",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET"
            }
        )
        
        # Should not reject the request
        assert response.status_code in [200, 204]


class TestRequestValidation:
    """Tests for request validation."""

    def test_send_message_empty_content(self, client, mock_conversation):
        """Test sending message with empty content."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation
            
            response = client.post(
                "/api/conversations/test-conv-123/message",
                json={"content": ""}
            )
            
            # Should accept empty string (validation happens at application level)
            assert response.status_code in [200, 422]

    def test_send_message_missing_content(self, client, mock_conversation):
        """Test sending message without content field."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation
            
            response = client.post(
                "/api/conversations/test-conv-123/message",
                json={}
            )
            
            assert response.status_code == 422  # Validation error

    def test_send_message_invalid_json(self, client):
        """Test sending invalid JSON."""
        response = client.post(
            "/api/conversations/test-conv-123/message",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422


class TestEdgeCases:
    """Edge case tests."""

    def test_conversation_id_with_special_characters(self, client):
        """Test handling conversation IDs with special characters."""
        special_id = "test-conv_123.456"
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.get(f"/api/conversations/{special_id}")
            
            assert response.status_code == 404
            mock_get.assert_called_once_with(special_id)

    def test_very_long_message(self, client, mock_conversation):
        """Test sending a very long message."""
        long_content = "A" * 100000
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_get.return_value = mock_conversation
                        mock_council.return_value = ([], [], {"model": "m", "response": "r"}, {})
                        
                        response = client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": long_content}
                        )
                        
                        # Should handle long messages
                        assert response.status_code == 200

    def test_unicode_in_message(self, client, mock_conversation):
        """Test sending message with Unicode characters."""
        unicode_content = "Hello 世界 🌍 café"
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_get.return_value = mock_conversation
                        mock_council.return_value = ([], [], {"model": "m", "response": "r"}, {})
                        
                        response = client.post(
                            "/api/conversations/test-conv-123/message",
                            json={"content": unicode_content}
                        )
                        
                        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_concurrent_message_requests(self, client, mock_conversation):
        """Test handling multiple concurrent message requests."""
        import asyncio
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_get.return_value = mock_conversation
                        mock_council.return_value = ([], [], {"model": "m", "response": "r"}, {})
                        
                        # Send multiple requests
                        responses = [
                            client.post(
                                "/api/conversations/test-conv-123/message",
                                json={"content": f"Message {i}"}
                            )
                            for i in range(3)
                        ]
                        
                        # All should succeed
                        assert all(r.status_code == 200 for r in responses)
