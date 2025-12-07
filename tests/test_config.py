"""Tests for backend/config.py module."""

import pytest
from unittest.mock import patch
import os


def test_config_loads_environment_variables(mock_env_vars):
    """Test that configuration loads environment variables correctly."""
    # Import after setting environment variables
    from backend import config
    
    # Reload to pick up mocked environment
    import importlib
    importlib.reload(config)
    
    assert config.OPENROUTER_API_KEY == "test-api-key-12345"


def test_config_has_correct_council_models():
    """Test that council models list is properly defined."""
    from backend import config
    
    assert isinstance(config.COUNCIL_MODELS, list)
    assert len(config.COUNCIL_MODELS) > 0
    assert all(isinstance(model, str) for model in config.COUNCIL_MODELS)
    
    # Check for expected models
    assert "openai/gpt-5.1" in config.COUNCIL_MODELS
    assert "google/gemini-3-pro-preview" in config.COUNCIL_MODELS
    assert "anthropic/claude-sonnet-4.5" in config.COUNCIL_MODELS
    assert "x-ai/grok-4" in config.COUNCIL_MODELS


def test_config_has_chairman_model():
    """Test that chairman model is defined."""
    from backend import config
    
    assert isinstance(config.CHAIRMAN_MODEL, str)
    assert len(config.CHAIRMAN_MODEL) > 0
    assert config.CHAIRMAN_MODEL == "google/gemini-3-pro-preview"


def test_config_has_openrouter_api_url():
    """Test that OpenRouter API URL is correctly defined."""
    from backend import config
    
    assert config.OPENROUTER_API_URL == "https://openrouter.ai/api/v1/chat/completions"
    assert config.OPENROUTER_API_URL.startswith("https://")


def test_config_has_data_directory():
    """Test that data directory is defined."""
    from backend import config
    
    assert isinstance(config.DATA_DIR, str)
    assert config.DATA_DIR == "data/conversations"


def test_config_missing_api_key_returns_none(monkeypatch):
    """Test behavior when OPENROUTER_API_KEY is not set."""
    # Remove the environment variable
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    
    # Reimport config
    import importlib
    from backend import config
    importlib.reload(config)
    
    assert config.OPENROUTER_API_KEY is None


def test_council_models_are_unique():
    """Test that council models list contains no duplicates."""
    from backend import config
    
    assert len(config.COUNCIL_MODELS) == len(set(config.COUNCIL_MODELS))


def test_chairman_model_in_valid_format():
    """Test that chairman model follows provider/model format."""
    from backend import config
    
    assert "/" in config.CHAIRMAN_MODEL
    parts = config.CHAIRMAN_MODEL.split("/")
    assert len(parts) == 2
    assert len(parts[0]) > 0  # Provider
    assert len(parts[1]) > 0  # Model name