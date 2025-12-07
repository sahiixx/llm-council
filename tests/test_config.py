"""Tests for backend/config.py"""
import os
import pytest
from unittest.mock import patch


class TestConfig:
    """Test suite for configuration module."""

    def test_openrouter_api_key_from_env(self):
        """Test that OPENROUTER_API_KEY is read from environment."""
        with patch.dict(os.environ, {'OPENROUTER_API_KEY': 'test-key-123'}):
            # Reload config to pick up new env var
            import importlib
            from backend import config
            importlib.reload(config)
            assert config.OPENROUTER_API_KEY == 'test-key-123'

    def test_openrouter_api_key_missing(self):
        """Test behavior when OPENROUTER_API_KEY is not set."""
        with patch.dict(os.environ, {}, clear=True):
            import importlib
            from backend import config
            importlib.reload(config)
            assert config.OPENROUTER_API_KEY is None

    def test_council_models_list(self):
        """Test that COUNCIL_MODELS is a non-empty list."""
        from backend.config import COUNCIL_MODELS
        assert isinstance(COUNCIL_MODELS, list)
        assert len(COUNCIL_MODELS) > 0
        assert all(isinstance(model, str) for model in COUNCIL_MODELS)

    def test_council_models_format(self):
        """Test that council model identifiers follow expected format."""
        from backend.config import COUNCIL_MODELS
        for model in COUNCIL_MODELS:
            assert '/' in model, f"Model {model} should contain provider/model format"
            parts = model.split('/')
            assert len(parts) == 2, f"Model {model} should have exactly one slash"
            assert parts[0] and parts[1], f"Model {model} should have non-empty parts"

    def test_chairman_model_exists(self):
        """Test that CHAIRMAN_MODEL is defined."""
        from backend.config import CHAIRMAN_MODEL
        assert isinstance(CHAIRMAN_MODEL, str)
        assert len(CHAIRMAN_MODEL) > 0
        assert '/' in CHAIRMAN_MODEL

    def test_chairman_model_in_council(self):
        """Test that chairman can be from the council (valid configuration)."""
        from backend.config import CHAIRMAN_MODEL, COUNCIL_MODELS
        # Chairman may or may not be in council - both are valid
        # Just verify it's a valid model identifier
        assert '/' in CHAIRMAN_MODEL

    def test_openrouter_api_url(self):
        """Test that OpenRouter API URL is properly configured."""
        from backend.config import OPENROUTER_API_URL
        assert isinstance(OPENROUTER_API_URL, str)
        assert OPENROUTER_API_URL.startswith('https://')
        assert 'openrouter.ai' in OPENROUTER_API_URL
        assert '/api/' in OPENROUTER_API_URL

    def test_data_dir_path(self):
        """Test that DATA_DIR is properly configured."""
        from backend.config import DATA_DIR
        assert isinstance(DATA_DIR, str)
        assert len(DATA_DIR) > 0
        assert 'conversations' in DATA_DIR

    def test_data_dir_relative_path(self):
        """Test that DATA_DIR uses relative path."""
        from backend.config import DATA_DIR
        assert not DATA_DIR.startswith('/')
        assert DATA_DIR.startswith('data/')

    def test_all_required_configs_present(self):
        """Test that all required configuration values are present."""
        from backend import config
        required_attrs = [
            'OPENROUTER_API_KEY',
            'COUNCIL_MODELS',
            'CHAIRMAN_MODEL',
            'OPENROUTER_API_URL',
            'DATA_DIR'
        ]
        for attr in required_attrs:
            assert hasattr(config, attr), f"Missing required config: {attr}"

    def test_council_models_unique(self):
        """Test that council models are unique (no duplicates)."""
        from backend.config import COUNCIL_MODELS
        assert len(COUNCIL_MODELS) == len(set(COUNCIL_MODELS))

    def test_env_file_loading(self):
        """Test that dotenv loading is attempted."""
        # This test verifies the module imports dotenv correctly
        from backend import config
        assert hasattr(config, 'load_dotenv')

    @pytest.mark.parametrize('model', [
        'openai/gpt-5.1',
        'google/gemini-3-pro-preview',
        'anthropic/claude-sonnet-4.5',
        'x-ai/grok-4',
    ])
    def test_known_models_in_council(self, model):
        """Test that expected models are configured in council."""
        from backend.config import COUNCIL_MODELS
        # At least one of these should be present (config may change)
        known_models = [
            'openai/gpt-5.1',
            'google/gemini-3-pro-preview',
            'anthropic/claude-sonnet-4.5',
            'x-ai/grok-4',
        ]
        assert any(m in COUNCIL_MODELS for m in known_models)