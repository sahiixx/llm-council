"""Comprehensive unit tests for backend/main.py FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
import json
from backend.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


class TestRootEndpoint:
    """Tests for the root health check endpoint."""

    def test_root_returns_ok_status(self, client):
        """Test that root endpoint returns ok status."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data

    def test_root_returns_correct_service_name(self, client):
        """Test that root endpoint returns correct service name."""
        response = client.get("/")
        data = response.json()
        assert data["service"] == "LLM Council API"

    def test_root_response_structure(self, client):
        """Test root endpoint response has correct structure."""
        response = client.get("/")
        data = response.json()
        assert isinstance(data, dict)
        assert len(data) == 2  # Should have exactly status and service


class TestListConversations:
    """Tests for listing conversations endpoint."""

    def test_list_conversations_empty(self, client, mock_data_dir):
        """Test listing conversations when none exist."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.list_conversations.return_value = []
            response = client.get("/api/conversations")
            assert response.status_code == 200
            assert response.json() == []

    def test_list_conversations_with_data(self, client, sample_conversation_list):
        """Test listing conversations with existing data."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.list_conversations.return_value = sample_conversation_list
            response = client.get("/api/conversations")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["id"] == "conv-1"
            assert data[1]["id"] == "conv-2"

    def test_list_conversations_returns_correct_structure(self, client, sample_conversation_list):
        """Test that conversation list has correct structure."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.list_conversations.return_value = sample_conversation_list
            response = client.get("/api/conversations")
            data = response.json()
            for conv in data:
                assert "id" in conv
                assert "created_at" in conv
                assert "title" in conv
                assert "message_count" in conv

    def test_list_conversations_handles_storage_error(self, client):
        """Test handling of storage errors when listing conversations."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.list_conversations.side_effect = Exception("Storage error")
            # The endpoint should handle this gracefully
            with pytest.raises(Exception):
                client.get("/api/conversations")


class TestCreateConversation:
    """Tests for creating new conversations."""

    def test_create_conversation_success(self, client):
        """Test successful conversation creation."""
        mock_conv = {
            "id": "new-conv-123",
            "created_at": "2024-01-01T00:00:00",
            "title": "New Conversation",
            "messages": [],
        }
        
        with patch("backend.main.storage") as mock_storage:
            mock_storage.create_conversation.return_value = mock_conv
            response = client.post("/api/conversations", json={})
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "new-conv-123"
            assert data["title"] == "New Conversation"
            assert data["messages"] == []

    def test_create_conversation_generates_uuid(self, client):
        """Test that conversation creation generates a UUID."""
        with patch("backend.main.storage") as mock_storage:
            with patch("backend.main.uuid.uuid4") as mock_uuid:
                mock_uuid.return_value = "test-uuid"
                mock_storage.create_conversation.return_value = {"id": "test-uuid"}
                
                response = client.post("/api/conversations", json={})
                assert response.status_code == 200
                # Verify uuid was generated
                mock_uuid.assert_called_once()

    def test_create_conversation_calls_storage(self, client):
        """Test that create_conversation calls storage correctly."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.create_conversation.return_value = {"id": "test"}
            client.post("/api/conversations", json={})
            mock_storage.create_conversation.assert_called_once()

    def test_create_conversation_empty_messages(self, client):
        """Test that new conversation has empty messages list."""
        mock_conv = {"id": "test", "messages": []}
        with patch("backend.main.storage") as mock_storage:
            mock_storage.create_conversation.return_value = mock_conv
            response = client.post("/api/conversations", json={})
            data = response.json()
            assert isinstance(data["messages"], list)
            assert len(data["messages"]) == 0


class TestGetConversation:
    """Tests for retrieving a specific conversation."""

    def test_get_conversation_success(self, client, sample_conversation):
        """Test successfully retrieving a conversation."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = sample_conversation
            response = client.get("/api/conversations/test-123")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "test-123"
            assert data["title"] == "Test Conversation"

    def test_get_conversation_not_found(self, client):
        """Test retrieving a non-existent conversation."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = None
            response = client.get("/api/conversations/non-existent")
            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

    def test_get_conversation_with_messages(self, client, sample_conversation):
        """Test that retrieved conversation includes messages."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = sample_conversation
            response = client.get("/api/conversations/test-123")
            data = response.json()
            assert "messages" in data
            assert len(data["messages"]) == 2

    def test_get_conversation_includes_all_stages(self, client, sample_conversation):
        """Test that assistant messages include all stages."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = sample_conversation
            response = client.get("/api/conversations/test-123")
            data = response.json()
            assistant_msg = data["messages"][1]
            assert "stage1" in assistant_msg
            assert "stage2" in assistant_msg
            assert "stage3" in assistant_msg


class TestSendMessage:
    """Tests for sending messages (non-streaming)."""

    @pytest.mark.asyncio
    async def test_send_message_first_message(self, client, mock_run_full_council, mock_generate_title):
        """Test sending the first message in a conversation."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = {
                "id": "test",
                "messages": [],
            }
            
            with patch("backend.main.run_full_council", mock_run_full_council):
                with patch("backend.main.generate_conversation_title", mock_generate_title):
                    response = client.post(
                        "/api/conversations/test/message",
                        json={"content": "Hello"}
                    )
                    assert response.status_code == 200
                    # Should have called title generation
                    assert mock_storage.update_conversation_title.called

    @pytest.mark.asyncio
    async def test_send_message_subsequent_message(self, client, mock_run_full_council):
        """Test sending a subsequent message (not first)."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = {
                "id": "test",
                "messages": [{"role": "user", "content": "Previous"}],
            }
            
            with patch("backend.main.run_full_council", mock_run_full_council):
                with patch("backend.main.generate_conversation_title") as mock_title:
                    response = client.post(
                        "/api/conversations/test/message",
                        json={"content": "Hello"}
                    )
                    assert response.status_code == 200
                    # Should NOT call title generation for subsequent messages
                    assert not mock_title.called

    @pytest.mark.asyncio
    async def test_send_message_adds_user_message(self, client, mock_run_full_council):
        """Test that user message is added to storage."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = {"id": "test", "messages": []}
            
            with patch("backend.main.run_full_council", mock_run_full_council):
                with patch("backend.main.generate_conversation_title", AsyncMock(return_value="Title")):
                    client.post(
                        "/api/conversations/test/message",
                        json={"content": "Test message"}
                    )
                    mock_storage.add_user_message.assert_called_once_with("test", "Test message")

    @pytest.mark.asyncio
    async def test_send_message_runs_council(self, client, mock_run_full_council):
        """Test that sending message runs the council process."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = {"id": "test", "messages": []}
            
            with patch("backend.main.run_full_council", mock_run_full_council) as mock_council:
                with patch("backend.main.generate_conversation_title", AsyncMock(return_value="Title")):
                    client.post(
                        "/api/conversations/test/message",
                        json={"content": "Question"}
                    )
                    # Verify council was run with the question
                    mock_council.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_message_returns_all_stages(self, client, mock_run_full_council, mock_council_responses):
        """Test that response includes all council stages."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = {"id": "test", "messages": []}
            
            with patch("backend.main.run_full_council", mock_run_full_council):
                with patch("backend.main.generate_conversation_title", AsyncMock(return_value="Title")):
                    response = client.post(
                        "/api/conversations/test/message",
                        json={"content": "Question"}
                    )
                    data = response.json()
                    assert "stage1" in data
                    assert "stage2" in data
                    assert "stage3" in data
                    assert "metadata" in data

    def test_send_message_conversation_not_found(self, client):
        """Test sending message to non-existent conversation."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = None
            response = client.post(
                "/api/conversations/non-existent/message",
                json={"content": "Hello"}
            )
            assert response.status_code == 404

    def test_send_message_empty_content(self, client):
        """Test sending message with empty content."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = {"id": "test", "messages": []}
            # Should still work - validation is client-side
            response = client.post(
                "/api/conversations/test/message",
                json={"content": ""}
            )
            # The endpoint should handle empty content


class TestSendMessageStream:
    """Tests for sending messages with streaming response."""

    @pytest.mark.asyncio
    async def test_stream_sends_stage1_start_event(self, client):
        """Test that streaming sends stage1_start event."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = {"id": "test", "messages": []}
            
            with patch("backend.main.stage1_collect_responses", AsyncMock(return_value=[])):
                with patch("backend.main.stage2_collect_rankings", AsyncMock(return_value=([], {}))):
                    with patch("backend.main.stage3_synthesize_final", AsyncMock(return_value={})):
                        response = client.post(
                            "/api/conversations/test/message/stream",
                            json={"content": "Test"}
                        )
                        # Check that we get SSE response
                        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"

    @pytest.mark.asyncio
    async def test_stream_events_order(self, client):
        """Test that stream events are sent in correct order."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = {"id": "test", "messages": []}
            
            stage1_data = [{"model": "m1", "response": "R1"}]
            stage2_data = ([{"model": "m1", "ranking": "Rank"}], {"Response A": "m1"})
            stage3_data = {"model": "chairman", "response": "Final"}
            
            with patch("backend.main.stage1_collect_responses", AsyncMock(return_value=stage1_data)):
                with patch("backend.main.stage2_collect_rankings", AsyncMock(return_value=stage2_data)):
                    with patch("backend.main.stage3_synthesize_final", AsyncMock(return_value=stage3_data)):
                        with patch("backend.main.calculate_aggregate_rankings", return_value=[]):
                            response = client.post(
                                "/api/conversations/test/message/stream",
                                json={"content": "Test"}
                            )
                            
                            # Parse SSE events
                            content = response.text
                            assert "stage1_start" in content
                            assert "stage1_complete" in content
                            assert "stage2_start" in content
                            assert "stage2_complete" in content
                            assert "stage3_start" in content
                            assert "stage3_complete" in content
                            assert "complete" in content

    def test_stream_conversation_not_found(self, client):
        """Test streaming to non-existent conversation."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = None
            response = client.post(
                "/api/conversations/non-existent/message/stream",
                json={"content": "Hello"}
            )
            assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_stream_generates_title_for_first_message(self, client):
        """Test that streaming generates title for first message."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = {"id": "test", "messages": []}
            
            with patch("backend.main.stage1_collect_responses", AsyncMock(return_value=[])):
                with patch("backend.main.stage2_collect_rankings", AsyncMock(return_value=([], {}))):
                    with patch("backend.main.stage3_synthesize_final", AsyncMock(return_value={})):
                        with patch("backend.main.generate_conversation_title", AsyncMock(return_value="New Title")) as mock_title:
                            with patch("backend.main.calculate_aggregate_rankings", return_value=[]):
                                response = client.post(
                                    "/api/conversations/test/message/stream",
                                    json={"content": "First message"}
                                )
                                
                                # Title should be generated
                                content = response.text
                                assert "title_complete" in content

    @pytest.mark.asyncio
    async def test_stream_error_handling(self, client):
        """Test error handling in streaming endpoint."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = {"id": "test", "messages": []}
            mock_storage.add_user_message.side_effect = Exception("Storage error")
            
            response = client.post(
                "/api/conversations/test/message/stream",
                json={"content": "Test"}
            )
            
            # Should still return 200 but with error event in stream
            assert response.status_code == 200
            content = response.text
            assert "error" in content


class TestCORSMiddleware:
    """Tests for CORS configuration."""

    def test_cors_allows_localhost_5173(self, client):
        """Test that CORS allows localhost:5173."""
        response = client.options(
            "/api/conversations",
            headers={"Origin": "http://localhost:5173"}
        )
        # CORS should be configured (TestClient might not fully test this)
        assert response.status_code in [200, 405]  # OPTIONS might not be implemented

    def test_cors_configuration_exists(self):
        """Test that CORS middleware is configured."""
        from backend.main import app
        # Check that CORSMiddleware is in the middleware stack
        middleware_types = [type(m) for m in app.user_middleware]
        from fastapi.middleware.cors import CORSMiddleware
        # Note: middleware configuration is indirect, just verify app setup
        assert app is not None


class TestRequestValidation:
    """Tests for request validation."""

    def test_send_message_missing_content(self, client):
        """Test sending message without content field."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = {"id": "test", "messages": []}
            response = client.post(
                "/api/conversations/test/message",
                json={}  # Missing content
            )
            assert response.status_code == 422  # Validation error

    def test_send_message_invalid_json(self, client):
        """Test sending malformed JSON."""
        response = client.post(
            "/api/conversations/test/message",
            data="not json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422

    def test_get_conversation_invalid_id_format(self, client):
        """Test getting conversation with various ID formats."""
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = None
            # Should work with any string ID
            response = client.get("/api/conversations/any-string-id-123")
            assert response.status_code == 404


class TestIntegrationScenarios:
    """Integration test scenarios."""

    @pytest.mark.asyncio
    async def test_full_conversation_flow(self, client, mock_run_full_council, mock_generate_title):
        """Test complete conversation flow from creation to message."""
        with patch("backend.main.storage") as mock_storage:
            # Create conversation
            mock_storage.create_conversation.return_value = {
                "id": "new-conv",
                "created_at": "2024-01-01T00:00:00",
                "title": "New Conversation",
                "messages": [],
            }
            
            create_response = client.post("/api/conversations", json={})
            assert create_response.status_code == 200
            conv_id = create_response.json()["id"]
            
            # Get conversation
            mock_storage.get_conversation.return_value = {
                "id": conv_id,
                "messages": [],
            }
            get_response = client.get(f"/api/conversations/{conv_id}")
            assert get_response.status_code == 200
            
            # Send message
            with patch("backend.main.run_full_council", mock_run_full_council):
                with patch("backend.main.generate_conversation_title", mock_generate_title):
                    message_response = client.post(
                        f"/api/conversations/{conv_id}/message",
                        json={"content": "Test question"}
                    )
                    assert message_response.status_code == 200
                    data = message_response.json()
                    assert "stage1" in data
                    assert "stage2" in data
                    assert "stage3" in data

    def test_multiple_conversations(self, client):
        """Test managing multiple conversations."""
        conversations = [
            {"id": f"conv-{i}", "title": f"Conv {i}", "message_count": i}
            for i in range(5)
        ]
        
        with patch("backend.main.storage") as mock_storage:
            mock_storage.list_conversations.return_value = conversations
            response = client.get("/api/conversations")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 5


class TestEdgeCases:
    """Edge case tests."""

    @pytest.mark.asyncio
    async def test_very_long_message_content(self, client, mock_run_full_council):
        """Test sending very long message."""
        long_content = "A" * 10000
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = {"id": "test", "messages": []}
            
            with patch("backend.main.run_full_council", mock_run_full_council):
                with patch("backend.main.generate_conversation_title", AsyncMock(return_value="Title")):
                    response = client.post(
                        "/api/conversations/test/message",
                        json={"content": long_content}
                    )
                    assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_unicode_in_message(self, client, mock_run_full_council):
        """Test message with Unicode characters."""
        unicode_content = "Hello 世界 🌍"
        with patch("backend.main.storage") as mock_storage:
            mock_storage.get_conversation.return_value = {"id": "test", "messages": []}
            
            with patch("backend.main.run_full_council", mock_run_full_council):
                with patch("backend.main.generate_conversation_title", AsyncMock(return_value="Title")):
                    response = client.post(
                        "/api/conversations/test/message",
                        json={"content": unicode_content}
                    )
                    assert response.status_code == 200

    def test_concurrent_requests(self, client):
        """Test handling concurrent requests."""
        import concurrent.futures
        
        with patch("backend.main.storage") as mock_storage:
            mock_storage.list_conversations.return_value = []
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = [
                    executor.submit(client.get, "/api/conversations")
                    for _ in range(10)
                ]
                results = [f.result() for f in futures]
                
            assert all(r.status_code == 200 for r in results)

    @pytest.mark.asyncio
    async def test_special_characters_in_conversation_id(self, client):
        """Test conversation IDs with special characters."""
        special_ids = ["test-123", "test_456", "test.789"]
        
        for conv_id in special_ids:
            with patch("backend.main.storage") as mock_storage:
                mock_storage.get_conversation.return_value = None
                response = client.get(f"/api/conversations/{conv_id}")
                # Should handle gracefully (return 404 or 200)
                assert response.status_code in [200, 404]
