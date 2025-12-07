"""Comprehensive unit tests for backend/openrouter.py."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
from backend.openrouter import query_model, query_models_parallel


class TestQueryModel:
    """Tests for query_model function."""

    @pytest.mark.asyncio
    async def test_successful_query(self):
        """Test successful model query."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "This is the response",
                        "reasoning_details": None
                    }
                }
            ]
        }
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            result = await query_model(
                "openai/gpt-4",
                [{"role": "user", "content": "Hello"}]
            )
        
        assert result is not None
        assert result["content"] == "This is the response"
        assert result["reasoning_details"] is None

    @pytest.mark.asyncio
    async def test_query_with_reasoning_details(self):
        """Test query that returns reasoning details."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "Response with reasoning",
                        "reasoning_details": {"steps": ["step1", "step2"]}
                    }
                }
            ]
        }
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            result = await query_model("model", [{"role": "user", "content": "Q"}])
        
        assert result["reasoning_details"] == {"steps": ["step1", "step2"]}

    @pytest.mark.asyncio
    async def test_http_error(self):
        """Test handling of HTTP errors."""
        mock_client = MagicMock()
        mock_client.post = AsyncMock(side_effect=httpx.HTTPStatusError(
            "Error", request=MagicMock(), response=MagicMock()
        ))
        
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            result = await query_model("model", [{"role": "user", "content": "Q"}])
        
        assert result is None

    @pytest.mark.asyncio
    async def test_timeout_error(self):
        """Test handling of timeout errors."""
        mock_client = MagicMock()
        mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("Timeout"))
        
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            result = await query_model("model", [{"role": "user", "content": "Q"}])
        
        assert result is None

    @pytest.mark.asyncio
    async def test_network_error(self):
        """Test handling of network errors."""
        mock_client = MagicMock()
        mock_client.post = AsyncMock(side_effect=httpx.NetworkError("Network error"))
        
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            result = await query_model("model", [{"role": "user", "content": "Q"}])
        
        assert result is None

    @pytest.mark.asyncio
    async def test_custom_timeout(self):
        """Test query with custom timeout."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Response"}}]
        }
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            await query_model("model", [{"role": "user", "content": "Q"}], timeout=30.0)
            
            # Verify AsyncClient was created with correct timeout
            mock_async_client.assert_called_once_with(timeout=30.0)

    @pytest.mark.asyncio
    async def test_correct_headers_sent(self):
        """Test that correct headers are sent in request."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Response"}}]
        }
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch("httpx.AsyncClient") as mock_async_client:
            with patch("backend.openrouter.OPENROUTER_API_KEY", "test-api-key"):
                mock_async_client.return_value.__aenter__.return_value = mock_client
                
                await query_model("model", [{"role": "user", "content": "Q"}])
                
                # Check that post was called with correct headers
                call_args = mock_client.post.call_args
                assert "headers" in call_args.kwargs
                headers = call_args.kwargs["headers"]
                assert headers["Authorization"] == "Bearer test-api-key"
                assert headers["Content-Type"] == "application/json"

    @pytest.mark.asyncio
    async def test_correct_payload_structure(self):
        """Test that payload is structured correctly."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Response"}}]
        }
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            messages = [{"role": "user", "content": "Test question"}]
            await query_model("test-model", messages)
            
            call_args = mock_client.post.call_args
            payload = call_args.kwargs["json"]
            assert payload["model"] == "test-model"
            assert payload["messages"] == messages

    @pytest.mark.asyncio
    async def test_multiple_messages(self):
        """Test query with multiple messages in conversation."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Response"}}]
        }
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            messages = [
                {"role": "user", "content": "First"},
                {"role": "assistant", "content": "Reply"},
                {"role": "user", "content": "Second"}
            ]
            result = await query_model("model", messages)
        
        assert result is not None


class TestQueryModelsParallel:
    """Tests for query_models_parallel function."""

    @pytest.mark.asyncio
    async def test_queries_multiple_models(self):
        """Test querying multiple models in parallel."""
        models = ["model1", "model2", "model3"]
        messages = [{"role": "user", "content": "Test"}]
        
        mock_responses = {
            "model1": {"content": "Response 1"},
            "model2": {"content": "Response 2"},
            "model3": {"content": "Response 3"},
        }
        
        async def mock_query_model(model, msgs):
            return mock_responses.get(model)
        
        with patch("backend.openrouter.query_model", side_effect=mock_query_model):
            result = await query_models_parallel(models, messages)
        
        assert len(result) == 3
        assert result["model1"]["content"] == "Response 1"
        assert result["model2"]["content"] == "Response 2"
        assert result["model3"]["content"] == "Response 3"

    @pytest.mark.asyncio
    async def test_handles_partial_failures(self):
        """Test handling when some models fail."""
        models = ["model1", "model2", "model3"]
        messages = [{"role": "user", "content": "Test"}]
        
        async def mock_query_model(model, msgs):
            if model == "model2":
                return None  # Simulate failure
            return {"content": f"Response from {model}"}
        
        with patch("backend.openrouter.query_model", side_effect=mock_query_model):
            result = await query_models_parallel(models, messages)
        
        assert len(result) == 3
        assert result["model1"] is not None
        assert result["model2"] is None
        assert result["model3"] is not None

    @pytest.mark.asyncio
    async def test_all_models_fail(self):
        """Test when all models fail."""
        models = ["model1", "model2"]
        messages = [{"role": "user", "content": "Test"}]
        
        async def mock_query_model(model, msgs):
            return None
        
        with patch("backend.openrouter.query_model", side_effect=mock_query_model):
            result = await query_models_parallel(models, messages)
        
        assert len(result) == 2
        assert all(v is None for v in result.values())

    @pytest.mark.asyncio
    async def test_empty_model_list(self):
        """Test with empty model list."""
        result = await query_models_parallel([], [{"role": "user", "content": "Test"}])
        assert result == {}

    @pytest.mark.asyncio
    async def test_preserves_model_order(self):
        """Test that result dictionary maintains model associations."""
        models = ["modelA", "modelB", "modelC"]
        messages = [{"role": "user", "content": "Test"}]
        
        async def mock_query_model(model, msgs):
            return {"content": f"From {model}"}
        
        with patch("backend.openrouter.query_model", side_effect=mock_query_model):
            result = await query_models_parallel(models, messages)
        
        assert "modelA" in result
        assert "modelB" in result
        assert "modelC" in result
        assert result["modelA"]["content"] == "From modelA"

    @pytest.mark.asyncio
    async def test_concurrent_execution(self):
        """Test that models are actually queried concurrently."""
        import asyncio
        import time
        
        models = ["model1", "model2", "model3"]
        messages = [{"role": "user", "content": "Test"}]
        
        call_times = []
        
        async def mock_query_model(model, msgs):
            call_times.append(time.time())
            await asyncio.sleep(0.1)  # Simulate API call
            return {"content": f"Response from {model}"}
        
        with patch("backend.openrouter.query_model", side_effect=mock_query_model):
            start = time.time()
            await query_models_parallel(models, messages)
            duration = time.time() - start
        
        # If truly parallel, should take ~0.1s not ~0.3s
        assert duration < 0.2  # Allow some overhead

    @pytest.mark.asyncio
    async def test_single_model(self):
        """Test with single model (edge case)."""
        models = ["solo-model"]
        messages = [{"role": "user", "content": "Test"}]
        
        async def mock_query_model(model, msgs):
            return {"content": "Solo response"}
        
        with patch("backend.openrouter.query_model", side_effect=mock_query_model):
            result = await query_models_parallel(models, messages)
        
        assert len(result) == 1
        assert result["solo-model"]["content"] == "Solo response"


class TestEdgeCases:
    """Edge case tests."""

    @pytest.mark.asyncio
    async def test_malformed_json_response(self):
        """Test handling of malformed JSON response."""
        mock_response = MagicMock()
        mock_response.json.side_effect = ValueError("Invalid JSON")
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            result = await query_model("model", [{"role": "user", "content": "Q"}])
        
        assert result is None

    @pytest.mark.asyncio
    async def test_missing_choices_in_response(self):
        """Test handling when 'choices' key is missing."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"error": "No choices"}
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            result = await query_model("model", [{"role": "user", "content": "Q"}])
        
        assert result is None

    @pytest.mark.asyncio
    async def test_empty_content_in_response(self):
        """Test handling of empty content in response."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": ""}}]
        }
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            result = await query_model("model", [{"role": "user", "content": "Q"}])
        
        assert result is not None
        assert result["content"] == ""

    @pytest.mark.asyncio
    async def test_unicode_in_messages(self):
        """Test handling of Unicode characters in messages."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Response with émojis 🎉"}}]
        }
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            messages = [{"role": "user", "content": "Question with 你好 and café"}]
            result = await query_model("model", messages)
        
        assert result is not None
        assert "émojis" in result["content"]

    @pytest.mark.asyncio
    async def test_very_long_response(self):
        """Test handling of very long responses."""
        long_content = "A" * 100000
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": long_content}}]
        }
        
        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_response)
        
        with patch("httpx.AsyncClient") as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client
            
            result = await query_model("model", [{"role": "user", "content": "Q"}])
        
        assert result is not None
        assert len(result["content"]) == 100000