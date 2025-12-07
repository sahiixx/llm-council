# Test Suite for LLM Council Backend

This directory contains comprehensive unit tests for the LLM Council backend.

## Test Structure

- `conftest.py` - Shared pytest fixtures and configuration
- `test_config.py` - Tests for configuration module
- `test_storage.py` - Tests for JSON storage functionality
- `test_openrouter.py` - Tests for OpenRouter API client
- `test_council.py` - Tests for 3-stage council orchestration
- `test_main.py` - Tests for FastAPI endpoints

## Running Tests

### Run all tests:
```bash
pytest
```

### Run specific test file:
```bash
pytest tests/test_storage.py
```

### Run with coverage report:
```bash
pytest --cov=backend --cov-report=html
```

### Run specific test function:
```bash
pytest tests/test_storage.py::test_create_conversation_creates_file
```

## Test Coverage

The test suite aims for comprehensive coverage including:
- Happy path scenarios
- Edge cases
- Error handling
- Async operations
- API mocking
- File I/O operations
- Data validation

## Dependencies

Required packages (install with `uv pip install -e ".[dev]"`):
- pytest
- pytest-asyncio
- pytest-cov
- pytest-mock
- httpx (for testing)