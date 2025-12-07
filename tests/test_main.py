"""Comprehensive unit tests for backend/main.py (FastAPI endpoints)."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
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
        "title": "Test Conversation",
        "messages": [
            {"role": "user", "content": "Hello"},
            {
                "role": "assistant",
                "stage1": [{"model": "model1", "response": "Hi"}],
                "stage2": [],
                "stage3": {"model": "chairman", "response": "Final response"}
            }
        ]
    }


class TestRootEndpoint:
    """Tests for the root health check endpoint."""

    def test_root_returns_ok(self, client):
        """Test that root endpoint returns OK status."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data

    def test_root_service_name(self, client):
        """Test that root returns correct service name."""
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
                "id": "conv1",
                "created_at": "2024-01-01T00:00:00",
                "title": "First",
                "message_count": 2
            },
            {
                "id": "conv2",
                "created_at": "2024-01-02T00:00:00",
                "title": "Second",
                "message_count": 4
            }
        ]
        
        with patch("backend.main.storage.list_conversations") as mock_list:
            mock_list.return_value = mock_convs
            
            response = client.get("/api/conversations")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["id"] == "conv1"
            assert data[1]["id"] == "conv2"

    def test_list_conversations_sorted(self, client):
        """Test that conversations are returned in correct order."""
        mock_convs = [
            {
                "id": "new",
                "created_at": "2024-01-02T00:00:00",
                "title": "Newer",
                "message_count": 1
            },
            {
                "id": "old",
                "created_at": "2024-01-01T00:00:00",
                "title": "Older",
                "message_count": 1
            }
        ]
        
        with patch("backend.main.storage.list_conversations") as mock_list:
            mock_list.return_value = mock_convs
            
            response = client.get("/api/conversations")
            data = response.json()
            
            assert data[0]["id"] == "new"


class TestCreateConversation:
    """Tests for creating new conversations."""

    def test_create_conversation_success(self, client, mock_conversation):
        """Test successful conversation creation."""
        with patch("backend.main.storage.create_conversation") as mock_create:
            with patch("backend.main.uuid.uuid4") as mock_uuid:
                mock_uuid.return_value = "test-uuid"
                mock_create.return_value = mock_conversation
                
                response = client.post("/api/conversations", json={})
                
                assert response.status_code == 200
                data = response.json()
                assert "id" in data
                assert "created_at" in data
                assert "messages" in data

    def test_create_conversation_generates_uuid(self, client, mock_conversation):
        """Test that create conversation generates a UUID."""
        with patch("backend.main.storage.create_conversation") as mock_create:
            with patch("backend.main.uuid.uuid4") as mock_uuid:
                test_uuid = "generated-uuid-123"
                mock_uuid.return_value = test_uuid
                mock_create.return_value = mock_conversation
                
                client.post("/api/conversations", json={})
                
                mock_uuid.assert_called_once()
                mock_create.assert_called_once_with(test_uuid)

    def test_create_conversation_empty_messages(self, client, mock_conversation):
        """Test that new conversation has empty messages."""
        with patch("backend.main.storage.create_conversation") as mock_create:
            mock_create.return_value = mock_conversation
            
            response = client.post("/api/conversations", json={})
            data = response.json()
            
            assert data["messages"] == []


class TestGetConversation:
    """Tests for retrieving specific conversations."""

    def test_get_conversation_success(self, client, mock_conversation):
        """Test successfully getting a conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation
            
            response = client.get("/api/conversations/test-conv-123")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "test-conv-123"

    def test_get_conversation_not_found(self, client):
        """Test getting non-existent conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.get("/api/conversations/nonexistent")
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    def test_get_conversation_with_messages(self, client, mock_conversation_with_messages):
        """Test getting conversation that has messages."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation_with_messages
            
            response = client.get("/api/conversations/test-conv-456")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["messages"]) == 2
            assert data["messages"][0]["role"] == "user"
            assert data["messages"][1]["role"] == "assistant"


class TestSendMessage:
    """Tests for sending messages endpoint."""

    def test_send_message_success(self, client, mock_conversation):
        """Test successfully sending a message."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Ranking"}]
        mock_stage3 = {"model": "chairman", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_get.return_value = mock_conversation
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

    def test_send_message_conversation_not_found(self, client):
        """Test sending message to non-existent conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.post(
                "/api/conversations/nonexistent/message",
                json={"content": "Test"}
            )
            
            assert response.status_code == 404

    def test_send_message_first_message_generates_title(self, client, mock_conversation):
        """Test that first message generates a title."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "R"}]
        mock_stage3 = {"model": "c", "response": "F"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.storage.update_conversation_title") as mock_update_title:
                        with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                            with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_gen_title:
                                mock_get.return_value = mock_conversation
                                mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                                mock_gen_title.return_value = "Generated Title"
                                
                                client.post(
                                    "/api/conversations/test-conv-123/message",
                                    json={"content": "First message"}
                                )
                                
                                mock_gen_title.assert_called_once()
                                mock_update_title.assert_called_once_with("test-conv-123", "Generated Title")

    def test_send_message_subsequent_no_title(self, client, mock_conversation_with_messages):
        """Test that subsequent messages don't regenerate title."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "R"}]
        mock_stage3 = {"model": "c", "response": "F"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.storage.update_conversation_title") as mock_update_title:
                        with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                            with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_gen_title:
                                mock_get.return_value = mock_conversation_with_messages
                                mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                                
                                client.post(
                                    "/api/conversations/test-conv-456/message",
                                    json={"content": "Follow-up message"}
                                )
                                
                                mock_gen_title.assert_not_called()
                                mock_update_title.assert_not_called()

    def test_send_message_invalid_json(self, client):
        """Test sending message with invalid JSON."""
        response = client.post(
            "/api/conversations/test-conv-123/message",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422


class TestSendMessageStream:
    """Tests for streaming message endpoint."""

    def test_send_message_stream_conversation_not_found(self, client):
        """Test streaming to non-existent conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.post(
                "/api/conversations/nonexistent/message/stream",
                json={"content": "Test"}
            )
            
            assert response.status_code == 404

    def test_send_message_stream_headers(self, client, mock_conversation):
        """Test that streaming response has correct headers."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as mock_s1:
                    with patch("backend.main.stage2_collect_rankings", new_callable=AsyncMock) as mock_s2:
                        with patch("backend.main.stage3_synthesize_final", new_callable=AsyncMock) as mock_s3:
                            with patch("backend.main.storage.add_assistant_message"):
                                mock_get.return_value = mock_conversation
                                mock_s1.return_value = []
                                mock_s2.return_value = ([], {})
                                mock_s3.return_value = {"model": "c", "response": "F"}
                                
                                response = client.post(
                                    "/api/conversations/test-conv-123/message/stream",
                                    json={"content": "Test"}
                                )
                                
                                assert response.status_code == 200
                                assert "text/event-stream" in response.headers["content-type"]

    def test_send_message_stream_events(self, client, mock_conversation):
        """Test that streaming sends correct event sequence."""
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "R"}]
        mock_stage3 = {"model": "c", "response": "F"}
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as mock_s1:
                    with patch("backend.main.stage2_collect_rankings", new_callable=AsyncMock) as mock_s2:
                        with patch("backend.main.stage3_synthesize_final", new_callable=AsyncMock) as mock_s3:
                            with patch("backend.main.calculate_aggregate_rankings") as mock_calc:
                                with patch("backend.main.storage.add_assistant_message"):
                                    mock_get.return_value = mock_conversation
                                    mock_s1.return_value = mock_stage1
                                    mock_s2.return_value = (mock_stage2, {})
                                    mock_s3.return_value = mock_stage3
                                    mock_calc.return_value = []
                                    
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


class TestRequestValidation:
    """Tests for request validation."""

    def test_send_message_missing_content(self, client):
        """Test sending message without content field."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = {"id": "test", "messages": []}
            
            response = client.post(
                "/api/conversations/test-conv-123/message",
                json={}
            )
            
            assert response.status_code == 422

    def test_create_conversation_empty_body(self, client):
        """Test creating conversation with empty body."""
        with patch("backend.main.storage.create_conversation") as mock_create:
            mock_create.return_value = {
                "id": "test",
                "created_at": "2024-01-01T00:00:00",
                "title": "New",
                "messages": []
            }
            
            response = client.post("/api/conversations", json={})
            assert response.status_code == 200


class TestErrorHandling:
    """Tests for error handling."""

    def test_council_failure_handled(self, client, mock_conversation):
        """Test that council failures are handled gracefully."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                    mock_get.return_value = mock_conversation
                    mock_council.side_effect = Exception("Council failed")
                    
                    response = client.post(
                        "/api/conversations/test-conv-123/message",
                        json={"content": "Test"}
                    )
                    
                    assert response.status_code == 500

    def test_storage_failure_handled(self, client):
        """Test that storage failures are handled."""
        with patch("backend.main.storage.list_conversations") as mock_list:
            mock_list.side_effect = Exception("Storage error")
            
            response = client.get("/api/conversations")
            
            assert response.status_code == 500
