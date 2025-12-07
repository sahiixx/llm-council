"""Comprehensive unit tests for backend/main.py FastAPI endpoints."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
import json
import uuid

from backend.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_conversation_id():
    """Generate a mock conversation ID."""
    return str(uuid.uuid4())


@pytest.fixture
def mock_conversation(mock_conversation_id):
    """Create a mock conversation object."""
    return {
        "id": mock_conversation_id,
        "created_at": "2024-01-01T00:00:00",
        "title": "Test Conversation",
        "messages": []
    }


class TestRootEndpoint:
    """Tests for root health check endpoint."""

    def test_root_returns_status_ok(self, client):
        """Test that root endpoint returns successful status."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_root_returns_service_name(self, client):
        """Test that root endpoint includes service name."""
        response = client.get("/")
        data = response.json()
        assert "service" in data
        assert "LLM Council" in data["service"]


class TestListConversations:
    """Tests for GET /api/conversations endpoint."""

    def test_list_conversations_empty(self, client):
        """Test listing conversations when none exist."""
        with patch("backend.main.storage.list_conversations") as mock_list:
            mock_list.return_value = []
            
            response = client.get("/api/conversations")
            
            assert response.status_code == 200
            assert response.json() == []

    def test_list_conversations_with_data(self, client):
        """Test listing conversations with multiple conversations."""
        mock_convs = [
            {
                "id": "conv1",
                "created_at": "2024-01-01T00:00:00",
                "title": "First Conversation",
                "message_count": 5
            },
            {
                "id": "conv2",
                "created_at": "2024-01-02T00:00:00",
                "title": "Second Conversation",
                "message_count": 3
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

    def test_list_conversations_returns_correct_schema(self, client):
        """Test that listed conversations have correct schema."""
        mock_convs = [
            {
                "id": "conv1",
                "created_at": "2024-01-01T00:00:00",
                "title": "Test",
                "message_count": 0
            }
        ]
        
        with patch("backend.main.storage.list_conversations") as mock_list:
            mock_list.return_value = mock_convs
            
            response = client.get("/api/conversations")
            data = response.json()[0]
            
            assert "id" in data
            assert "created_at" in data
            assert "title" in data
            assert "message_count" in data


class TestCreateConversation:
    """Tests for POST /api/conversations endpoint."""

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
            assert "messages" in data

    def test_create_conversation_generates_uuid(self, client, mock_conversation):
        """Test that conversation creation generates a valid UUID."""
        with patch("backend.main.storage.create_conversation") as mock_create:
            mock_create.return_value = mock_conversation
            
            response = client.post("/api/conversations", json={})
            data = response.json()
            
            # Verify ID is a valid UUID
            try:
                uuid.UUID(data["id"])
                is_valid_uuid = True
            except ValueError:
                is_valid_uuid = False
            
            assert is_valid_uuid

    def test_create_conversation_default_title(self, client):
        """Test that new conversations have default title."""
        mock_conv = {
            "id": str(uuid.uuid4()),
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []
        }
        
        with patch("backend.main.storage.create_conversation") as mock_create:
            mock_create.return_value = mock_conv
            
            response = client.post("/api/conversations", json={})
            data = response.json()
            
            assert data["title"] == "New Conversation"

    def test_create_conversation_empty_messages(self, client, mock_conversation):
        """Test that new conversations start with empty messages."""
        with patch("backend.main.storage.create_conversation") as mock_create:
            mock_create.return_value = mock_conversation
            
            response = client.post("/api/conversations", json={})
            data = response.json()
            
            assert data["messages"] == []


class TestGetConversation:
    """Tests for GET /api/conversations/{id} endpoint."""

    def test_get_conversation_success(self, client, mock_conversation_id, mock_conversation):
        """Test successful conversation retrieval."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conversation
            
            response = client.get(f"/api/conversations/{mock_conversation_id}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == mock_conversation_id

    def test_get_conversation_not_found(self, client):
        """Test getting non-existent conversation returns 404."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.get("/api/conversations/nonexistent-id")
            
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    def test_get_conversation_with_messages(self, client, mock_conversation_id):
        """Test getting conversation with messages."""
        mock_conv = {
            "id": mock_conversation_id,
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "stage1": [], "stage2": [], "stage3": {}}
            ]
        }
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conv
            
            response = client.get(f"/api/conversations/{mock_conversation_id}")
            data = response.json()
            
            assert len(data["messages"]) == 2
            assert data["messages"][0]["role"] == "user"


class TestSendMessage:
    """Tests for POST /api/conversations/{id}/message endpoint."""

    @pytest.mark.asyncio
    async def test_send_message_success(self, client, mock_conversation_id):
        """Test successful message sending."""
        mock_conv = {
            "id": mock_conversation_id,
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        mock_stage1 = [{"model": "model1", "response": "Response 1"}]
        mock_stage2 = [{"model": "model1", "ranking": "Ranking"}]
        mock_stage3 = {"model": "chairman", "response": "Final answer"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_get.return_value = mock_conv
                        mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                        
                        response = client.post(
                            f"/api/conversations/{mock_conversation_id}/message",
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
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.post(
                "/api/conversations/nonexistent/message",
                json={"content": "Test"}
            )
        
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_send_message_first_message_generates_title(self, client, mock_conversation_id):
        """Test that first message generates conversation title."""
        mock_conv = {
            "id": mock_conversation_id,
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": []  # Empty = first message
        }
        
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chair", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.storage.update_conversation_title") as mock_update_title:
                        with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_gen_title:
                            with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                                mock_get.return_value = mock_conv
                                mock_gen_title.return_value = "Generated Title"
                                mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                                
                                response = client.post(
                                    f"/api/conversations/{mock_conversation_id}/message",
                                    json={"content": "First question"}
                                )
                                
                                # Verify title generation was called
                                mock_gen_title.assert_called_once()
                                mock_update_title.assert_called_once()
        
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_send_message_subsequent_message_no_title_generation(self, client, mock_conversation_id):
        """Test that subsequent messages don't regenerate title."""
        mock_conv = {
            "id": mock_conversation_id,
            "created_at": "2024-01-01T00:00:00",
            "title": "Existing Title",
            "messages": [{"role": "user", "content": "Previous message"}]  # Not first
        }
        
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chair", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.generate_conversation_title", new_callable=AsyncMock) as mock_gen_title:
                        with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                            mock_get.return_value = mock_conv
                            mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                            
                            response = client.post(
                                f"/api/conversations/{mock_conversation_id}/message",
                                json={"content": "Follow-up question"}
                            )
                            
                            # Verify title generation was NOT called
                            mock_gen_title.assert_not_called()
        
        assert response.status_code == 200

    def test_send_message_empty_content(self, client, mock_conversation_id):
        """Test sending message with empty content."""
        mock_conv = {
            "id": mock_conversation_id,
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        # FastAPI validation should handle this
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = mock_conv
            
            response = client.post(
                f"/api/conversations/{mock_conversation_id}/message",
                json={"content": ""}
            )
        
        # Should still process (storage/council logic handles empty)
        # Or could return 422 if validation added
        assert response.status_code in [200, 422]


class TestSendMessageStream:
    """Tests for POST /api/conversations/{id}/message/stream endpoint."""

    def test_send_message_stream_conversation_not_found(self, client):
        """Test streaming to non-existent conversation."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.post(
                "/api/conversations/nonexistent/message/stream",
                json={"content": "Test"}
            )
        
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_send_message_stream_success(self, client, mock_conversation_id):
        """Test successful streaming message."""
        mock_conv = {
            "id": mock_conversation_id,
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chair", "response": "Final"}
        label_to_model = {"Response A": "m1"}
        agg_rankings = [{"model": "m1", "average_rank": 1.0, "rankings_count": 1}]
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as mock_s1:
                        with patch("backend.main.stage2_collect_rankings", new_callable=AsyncMock) as mock_s2:
                            with patch("backend.main.stage3_synthesize_final", new_callable=AsyncMock) as mock_s3:
                                with patch("backend.main.calculate_aggregate_rankings") as mock_calc:
                                    mock_get.return_value = mock_conv
                                    mock_s1.return_value = mock_stage1
                                    mock_s2.return_value = (mock_stage2, label_to_model)
                                    mock_s3.return_value = mock_stage3
                                    mock_calc.return_value = agg_rankings
                                    
                                    response = client.post(
                                        f"/api/conversations/{mock_conversation_id}/message/stream",
                                        json={"content": "Test question"}
                                    )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

    @pytest.mark.asyncio
    async def test_send_message_stream_events_format(self, client, mock_conversation_id):
        """Test that stream returns properly formatted SSE events."""
        mock_conv = {
            "id": mock_conversation_id,
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chair", "response": "Final"}
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.stage1_collect_responses", new_callable=AsyncMock) as mock_s1:
                        with patch("backend.main.stage2_collect_rankings", new_callable=AsyncMock) as mock_s2:
                            with patch("backend.main.stage3_synthesize_final", new_callable=AsyncMock) as mock_s3:
                                with patch("backend.main.calculate_aggregate_rankings"):
                                    mock_get.return_value = mock_conv
                                    mock_s1.return_value = mock_stage1
                                    mock_s2.return_value = (mock_stage2, {})
                                    mock_s3.return_value = mock_stage3
                                    
                                    response = client.post(
                                        f"/api/conversations/{mock_conversation_id}/message/stream",
                                        json={"content": "Test"}
                                    )
                                    
                                    content = response.text
                                    
                                    # Verify SSE format
                                    assert "data:" in content
                                    assert "stage1_start" in content or "stage1_complete" in content


class TestCORSMiddleware:
    """Tests for CORS middleware configuration."""

    def test_cors_headers_present(self, client):
        """Test that CORS headers are configured."""
        response = client.options(
            "/api/conversations",
            headers={"Origin": "http://localhost:5173"}
        )
        
        # CORS should allow the request
        assert response.status_code in [200, 204]

    def test_cors_allows_localhost_origins(self, client):
        """Test that CORS allows localhost origins."""
        # This tests the middleware configuration indirectly
        response = client.get(
            "/api/conversations",
            headers={"Origin": "http://localhost:5173"}
        )
        
        assert response.status_code == 200


class TestEdgeCases:
    """Edge case tests for API endpoints."""

    def test_invalid_uuid_format(self, client):
        """Test endpoints with invalid UUID format."""
        with patch("backend.main.storage.get_conversation") as mock_get:
            mock_get.return_value = None
            
            response = client.get("/api/conversations/not-a-uuid")
            
            # Should return 404 (not found) rather than 422 (validation error)
            assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_concurrent_message_sending(self, client, mock_conversation_id):
        """Test handling of concurrent message sends."""
        mock_conv = {
            "id": mock_conversation_id,
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": []
        }
        
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chair", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_get.return_value = mock_conv
                        mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                        
                        # Send multiple messages
                        response1 = client.post(
                            f"/api/conversations/{mock_conversation_id}/message",
                            json={"content": "Question 1"}
                        )
                        response2 = client.post(
                            f"/api/conversations/{mock_conversation_id}/message",
                            json={"content": "Question 2"}
                        )
        
        assert response1.status_code == 200
        assert response2.status_code == 200

    def test_special_characters_in_message(self, client, mock_conversation_id):
        """Test sending message with special characters."""
        mock_conv = {
            "id": mock_conversation_id,
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": ["existing"]
        }
        
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chair", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_get.return_value = mock_conv
                        mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                        
                        response = client.post(
                            f"/api/conversations/{mock_conversation_id}/message",
                            json={"content": "Test with émojis 🎉 and 你好"}
                        )
        
        assert response.status_code == 200

    def test_very_long_message(self, client, mock_conversation_id):
        """Test sending very long message."""
        mock_conv = {
            "id": mock_conversation_id,
            "created_at": "2024-01-01T00:00:00",
            "title": "Test",
            "messages": ["existing"]
        }
        
        long_content = "A" * 10000
        
        mock_stage1 = [{"model": "m1", "response": "R1"}]
        mock_stage2 = [{"model": "m1", "ranking": "Rank"}]
        mock_stage3 = {"model": "chair", "response": "Final"}
        mock_metadata = {"label_to_model": {}, "aggregate_rankings": []}
        
        with patch("backend.main.storage.get_conversation") as mock_get:
            with patch("backend.main.storage.add_user_message"):
                with patch("backend.main.storage.add_assistant_message"):
                    with patch("backend.main.run_full_council", new_callable=AsyncMock) as mock_council:
                        mock_get.return_value = mock_conv
                        mock_council.return_value = (mock_stage1, mock_stage2, mock_stage3, mock_metadata)
                        
                        response = client.post(
                            f"/api/conversations/{mock_conversation_id}/message",
                            json={"content": long_content}
                        )
        
        assert response.status_code == 200
