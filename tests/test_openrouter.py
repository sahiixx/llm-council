"""Tests for backend/openrouter.py module."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
import httpx
from backend import openrouter


@pytest.mark.asyncio
async def test_query_model_successful_request(mock_env_vars, mock_openrouter_response):
    """Test successful model query returns expected response."""
    model = "openai/gpt-4o"
    messages = [{"role": "user", "content": "Test question"}]
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_response.json = Mock(return_value=mock_openrouter_response)
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client
        
        result = await openrouter.query_model(model, messages)
        
        assert result is not None
        assert "content" in result
        assert result["content"] == "The capital of France is Paris."
        assert "reasoning_details" in result


@pytest.mark.asyncio
async def test_query_model_includes_correct_headers(mock_env_vars):
    """Test that query_model sends correct authorization headers."""
    model = "test/model"
    messages = [{"role": "user", "content": "Test"}]
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_response.json = Mock(return_value={
            "choices": [{"message": {"content": "test"}}]
        })
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client
        
        await openrouter.query_model(model, messages)
        
        # Check that post was called with correct headers
        call_args = mock_client.post.call_args
        headers = call_args[1]["headers"]
        assert "Authorization" in headers
        assert headers["Authorization"].startswith("Bearer ")
        assert "Content-Type" in headers
        assert headers["Content-Type"] == "application/json"


@pytest.mark.asyncio
async def test_query_model_sends_correct_payload(mock_env_vars):
    """Test that query_model sends the correct request payload."""
    model = "test/model"
    messages = [{"role": "user", "content": "Question"}]
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_response.json = Mock(return_value={
            "choices": [{"message": {"content": "answer"}}]
        })
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client
        
        await openrouter.query_model(model, messages)
        
        call_args = mock_client.post.call_args
        payload = call_args[1]["json"]
        assert payload["model"] == model
        assert payload["messages"] == messages


@pytest.mark.asyncio
async def test_query_model_handles_http_error(mock_env_vars):
    """Test that query_model handles HTTP errors gracefully."""
    model = "test/model"
    messages = [{"role": "user", "content": "Test"}]
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.raise_for_status = Mock(side_effect=httpx.HTTPStatusError(
            "Error", request=Mock(), response=Mock()
        ))
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client
        
        result = await openrouter.query_model(model, messages)
        
        assert result is None


@pytest.mark.asyncio
async def test_query_model_handles_timeout(mock_env_vars):
    """Test that query_model handles timeout errors."""
    model = "test/model"
    messages = [{"role": "user", "content": "Test"}]
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("Timeout"))
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client
        
        result = await openrouter.query_model(model, messages, timeout=1.0)
        
        assert result is None


@pytest.mark.asyncio
async def test_query_model_handles_json_decode_error(mock_env_vars):
    """Test that query_model handles JSON decode errors."""
    model = "test/model"
    messages = [{"role": "user", "content": "Test"}]
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_response.json = Mock(side_effect=ValueError("Invalid JSON"))
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client
        
        result = await openrouter.query_model(model, messages)
        
        assert result is None


@pytest.mark.asyncio
async def test_query_model_respects_timeout_parameter(mock_env_vars):
    """Test that query_model uses the specified timeout."""
    model = "test/model"
    messages = [{"role": "user", "content": "Test"}]
    custom_timeout = 60.0
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_response.json = Mock(return_value={
            "choices": [{"message": {"content": "test"}}]
        })
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client
        
        await openrouter.query_model(model, messages, timeout=custom_timeout)
        
        # Verify timeout was used
        mock_client_class.assert_called_once_with(timeout=custom_timeout)


@pytest.mark.asyncio
async def test_query_model_extracts_reasoning_details(mock_env_vars):
    """Test that query_model extracts reasoning_details if present."""
    model = "test/model"
    messages = [{"role": "user", "content": "Test"}]
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_response.json = Mock(return_value={
            "choices": [{
                "message": {
                    "content": "Response",
                    "reasoning_details": {"steps": ["step1", "step2"]}
                }
            }]
        })
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client
        
        result = await openrouter.query_model(model, messages)
        
        assert result["reasoning_details"] == {"steps": ["step1", "step2"]}


@pytest.mark.asyncio
async def test_query_models_parallel_queries_all_models(mock_env_vars):
    """Test that query_models_parallel queries all models."""
    models = ["model1", "model2", "model3"]
    messages = [{"role": "user", "content": "Test"}]
    
    with patch('backend.openrouter.query_model') as mock_query:
        mock_query.return_value = {"content": "response"}
        
        result = await openrouter.query_models_parallel(models, messages)
        
        assert len(result) == 3
        assert "model1" in result
        assert "model2" in result
        assert "model3" in result
        assert mock_query.call_count == 3


@pytest.mark.asyncio
async def test_query_models_parallel_handles_mixed_results(mock_env_vars):
    """Test that query_models_parallel handles some failures."""
    models = ["model1", "model2", "model3"]
    messages = [{"role": "user", "content": "Test"}]
    
    async def mock_query_model(model, msgs):
        if model == "model2":
            return None  # Simulate failure
        return {"content": f"response from {model}"}
    
    with patch('backend.openrouter.query_model', side_effect=mock_query_model):
        result = await openrouter.query_models_parallel(models, messages)
        
        assert result["model1"] is not None
        assert result["model2"] is None
        assert result["model3"] is not None


@pytest.mark.asyncio
async def test_query_models_parallel_returns_dict_mapping(mock_env_vars):
    """Test that query_models_parallel returns correct model-to-response mapping."""
    models = ["modelA", "modelB"]
    messages = [{"role": "user", "content": "Test"}]
    
    async def mock_query_model(model, msgs):
        return {"content": f"Response from {model}"}
    
    with patch('backend.openrouter.query_model', side_effect=mock_query_model):
        result = await openrouter.query_models_parallel(models, messages)
        
        assert result["modelA"]["content"] == "Response from modelA"
        assert result["modelB"]["content"] == "Response from modelB"


@pytest.mark.asyncio
async def test_query_models_parallel_with_empty_models_list(mock_env_vars):
    """Test that query_models_parallel handles empty models list."""
    models = []
    messages = [{"role": "user", "content": "Test"}]
    
    result = await openrouter.query_models_parallel(models, messages)
    
    assert result == {}
    assert isinstance(result, dict)


@pytest.mark.asyncio
async def test_query_model_handles_missing_content_field(mock_env_vars):
    """Test that query_model handles response without content field."""
    model = "test/model"
    messages = [{"role": "user", "content": "Test"}]
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_response.json = Mock(return_value={
            "choices": [{"message": {}}]  # No content field
        })
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client
        
        result = await openrouter.query_model(model, messages)
        
        # Should handle gracefully
        assert result is not None
        assert result["content"] is None


@pytest.mark.asyncio
async def test_query_model_uses_correct_api_url(mock_env_vars):
    """Test that query_model uses the configured API URL."""
    from backend.config import OPENROUTER_API_URL
    
    model = "test/model"
    messages = [{"role": "user", "content": "Test"}]
    
    with patch('httpx.AsyncClient') as mock_client_class:
        mock_client = AsyncMock()
        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_response.json = Mock(return_value={
            "choices": [{"message": {"content": "test"}}]
        })
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_class.return_value = mock_client
        
        await openrouter.query_model(model, messages)
        
        # Verify URL
        call_args = mock_client.post.call_args
        assert call_args[0][0] == OPENROUTER_API_URL