"""Tests for backend/openrouter.py"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.openrouter import query_model, query_models_parallel


class TestQueryModel:
    """Test suite for query_model function."""

    @pytest.mark.asyncio
    async def test_successful_query(self):
        """Test successful model query."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'choices': [{
                'message': {
                    'content': 'Test response',
                    'reasoning_details': None
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()

        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )

            result = await query_model(
                'openai/gpt-4',
                [{'role': 'user', 'content': 'test'}]
            )

            assert result is not None
            assert result['content'] == 'Test response'
            assert result['reasoning_details'] is None

    @pytest.mark.asyncio
    async def test_query_with_reasoning_details(self):
        """Test query that returns reasoning details."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'choices': [{
                'message': {
                    'content': 'Answer with reasoning',
                    'reasoning_details': {'steps': ['step1', 'step2']}
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()

        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )

            result = await query_model(
                'openai/o1',
                [{'role': 'user', 'content': 'test'}]
            )

            assert result['reasoning_details'] is not None
            assert 'steps' in result['reasoning_details']

    @pytest.mark.asyncio
    async def test_query_failure_returns_none(self):
        """Test that query failures return None gracefully."""
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=Exception('Network error')
            )

            result = await query_model(
                'openai/gpt-4',
                [{'role': 'user', 'content': 'test'}]
            )

            assert result is None

    @pytest.mark.asyncio
    async def test_query_http_error(self):
        """Test handling of HTTP errors."""
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = Exception('HTTP 500')

        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )

            result = await query_model(
                'openai/gpt-4',
                [{'role': 'user', 'content': 'test'}]
            )

            assert result is None

    @pytest.mark.asyncio
    async def test_query_malformed_response(self):
        """Test handling of malformed API responses."""
        mock_response = MagicMock()
        mock_response.json.return_value = {'invalid': 'structure'}
        mock_response.raise_for_status = MagicMock()

        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response
            )

            result = await query_model(
                'openai/gpt-4',
                [{'role': 'user', 'content': 'test'}]
            )

            assert result is None

    @pytest.mark.asyncio
    async def test_query_custom_timeout(self):
        """Test query with custom timeout."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'choices': [{'message': {'content': 'response'}}]
        }
        mock_response.raise_for_status = MagicMock()

        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value = mock_instance

            await query_model(
                'openai/gpt-4',
                [{'role': 'user', 'content': 'test'}],
                timeout=60.0
            )

            # Verify timeout was passed
            mock_client.assert_called_once()
            call_kwargs = mock_client.call_args[1]
            assert call_kwargs['timeout'] == 60.0

    @pytest.mark.asyncio
    async def test_query_correct_headers(self):
        """Test that query includes correct headers."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'choices': [{'message': {'content': 'response'}}]
        }
        mock_response.raise_for_status = MagicMock()

        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value = mock_instance
            
            with patch('backend.openrouter.OPENROUTER_API_KEY', 'test-key'):
                await query_model(
                    'openai/gpt-4',
                    [{'role': 'user', 'content': 'test'}]
                )

                # Verify post was called with correct headers
                call_args = mock_instance.post.call_args
                headers = call_args[1]['headers']
                assert 'Authorization' in headers
                assert headers['Authorization'] == 'Bearer test-key'
                assert headers['Content-Type'] == 'application/json'

    @pytest.mark.asyncio
    async def test_query_correct_payload(self):
        """Test that query sends correct payload."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'choices': [{'message': {'content': 'response'}}]
        }
        mock_response.raise_for_status = MagicMock()

        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value = mock_instance

            messages = [
                {'role': 'user', 'content': 'Hello'},
                {'role': 'assistant', 'content': 'Hi'},
                {'role': 'user', 'content': 'How are you?'}
            ]

            await query_model('openai/gpt-4', messages)

            call_args = mock_instance.post.call_args
            payload = call_args[1]['json']
            assert payload['model'] == 'openai/gpt-4'
            assert payload['messages'] == messages


class TestQueryModelsParallel:
    """Test suite for query_models_parallel function."""

    @pytest.mark.asyncio
    async def test_parallel_query_all_success(self):
        """Test parallel queries when all models succeed."""
        async def mock_query(model, messages):
            return {'content': f'Response from {model}'}

        with patch('backend.openrouter.query_model', side_effect=mock_query):
            models = ['model1', 'model2', 'model3']
            messages = [{'role': 'user', 'content': 'test'}]

            results = await query_models_parallel(models, messages)

            assert len(results) == 3
            assert all(model in results for model in models)
            assert results['model1']['content'] == 'Response from model1'
            assert results['model2']['content'] == 'Response from model2'
            assert results['model3']['content'] == 'Response from model3'

    @pytest.mark.asyncio
    async def test_parallel_query_some_failures(self):
        """Test parallel queries with some failures."""
        async def mock_query(model, messages):
            if model == 'failing-model':
                return None
            return {'content': f'Response from {model}'}

        with patch('backend.openrouter.query_model', side_effect=mock_query):
            models = ['model1', 'failing-model', 'model2']
            messages = [{'role': 'user', 'content': 'test'}]

            results = await query_models_parallel(models, messages)

            assert len(results) == 3
            assert results['model1'] is not None
            assert results['failing-model'] is None
            assert results['model2'] is not None

    @pytest.mark.asyncio
    async def test_parallel_query_empty_models(self):
        """Test parallel queries with empty model list."""
        messages = [{'role': 'user', 'content': 'test'}]
        results = await query_models_parallel([], messages)
        assert results == {}

    @pytest.mark.asyncio
    async def test_parallel_query_single_model(self):
        """Test parallel queries with single model."""
        async def mock_query(model, messages):
            return {'content': 'response'}

        with patch('backend.openrouter.query_model', side_effect=mock_query):
            models = ['single-model']
            messages = [{'role': 'user', 'content': 'test'}]

            results = await query_models_parallel(models, messages)

            assert len(results) == 1
            assert 'single-model' in results

    @pytest.mark.asyncio
    async def test_parallel_query_preserves_order(self):
        """Test that parallel queries preserve model order in results."""
        async def mock_query(model, messages):
            return {'content': f'Response {model}'}

        with patch('backend.openrouter.query_model', side_effect=mock_query):
            models = ['z-model', 'a-model', 'm-model']
            messages = [{'role': 'user', 'content': 'test'}]

            results = await query_models_parallel(models, messages)

            # Results should be keyed by model name
            result_keys = list(results.keys())
            assert result_keys == models  # Order preserved

    @pytest.mark.asyncio
    async def test_parallel_query_all_failures(self):
        """Test parallel queries when all models fail."""
        async def mock_query(model, messages):
            return None

        with patch('backend.openrouter.query_model', side_effect=mock_query):
            models = ['model1', 'model2', 'model3']
            messages = [{'role': 'user', 'content': 'test'}]

            results = await query_models_parallel(models, messages)

            assert len(results) == 3
            assert all(results[model] is None for model in models)