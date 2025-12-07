# LLM Council - Comprehensive Test Suite

This document provides an overview of the comprehensive test suite generated for the LLM Council project.

## Overview

A complete test suite has been created covering both the Python backend and JavaScript frontend, with emphasis on:
- Happy path scenarios
- Edge cases and error conditions
- Async operation handling
- API mocking and isolation
- Data validation
- Integration testing approaches

## Backend Tests (Python)

### Test Framework
- **pytest** - Primary testing framework
- **pytest-asyncio** - For async test support
- **pytest-cov** - Code coverage reporting
- **pytest-mock** - Enhanced mocking capabilities

### Test Files

#### `tests/test_config.py` (9 tests)
Tests for configuration management:
- Environment variable loading
- Model configuration validation
- API endpoint configuration
- Missing configuration handling
- Council model uniqueness
- Data directory configuration

#### `tests/test_storage.py` (26 tests)
Tests for JSON-based conversation storage:
- Directory creation and management
- Conversation CRUD operations
- Message addition (user and assistant)
- Title updates
- Conversation listing and sorting
- Error handling for non-existent conversations
- File persistence across operations
- Integration workflow tests

#### `tests/test_openrouter.py` (16 tests)
Tests for OpenRouter API client:
- Successful model queries
- Request header validation
- Payload structure validation
- HTTP error handling
- Timeout handling
- JSON decode error handling
- Parallel model querying
- Response field extraction
- Mixed success/failure scenarios
- Empty model list handling

#### `tests/test_council.py` (25 tests)
Tests for 3-stage council orchestration:
- **Ranking Parser Tests**:
  - Standard FINAL RANKING format parsing
  - Various formatting edge cases
  - Fallback parsing strategies
  - Empty and malformed input handling
  
- **Aggregate Ranking Tests**:
  - Simple unanimous rankings
  - Mixed model rankings
  - Average calculation accuracy
  - Ranking count tracking
  
- **Stage 1 Tests**:
  - Response collection from all models
  - Failed model filtering
  - Empty content handling
  
- **Stage 2 Tests**:
  - Anonymous label creation
  - Ranking prompt construction
  - Ranking parsing integration
  
- **Stage 3 Tests**:
  - Chairman model usage
  - Context aggregation
  - Failure handling
  
- **Title Generation Tests**:
  - Short title creation
  - Quote stripping
  - Long title truncation
  - Fallback handling
  
- **Full Council Tests**:
  - Complete 3-stage execution
  - Early failure handling
  - Metadata generation

#### `tests/test_main.py` (20 tests)
Tests for FastAPI endpoints:
- Root health check endpoint
- Conversation listing (empty and populated)
- Conversation creation
- Conversation retrieval (success and 404)
- Message sending:
  - First message with title generation
  - Subsequent messages
  - User message persistence
  - Council process execution
  - Assistant message storage
  - Complete response structure
- Streaming endpoint tests
- Pydantic model validation
- CORS middleware configuration
- Error handling (404, 422 validation errors)

### Test Configuration

**pytest.ini:**
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
addopts = 
    -v
    --tb=short
    --strict-markers
    --cov=backend
    --cov-report=term-missing
    --cov-report=html
```

**Shared Fixtures (conftest.py):**
- `mock_env_vars` - Mock environment variables
- `temp_data_dir` - Temporary data directory
- `sample_conversation` - Sample conversation data
- `sample_messages` - Sample message lists
- `mock_openrouter_response` - Mock API responses
- `mock_httpx_client` - Mock HTTP client
- `sample_stage1_results` - Stage 1 test data
- `sample_stage2_results` - Stage 2 test data
- `sample_label_to_model` - Label mapping data

### Running Backend Tests

```bash
# Install dependencies
uv pip install -e ".[dev]"

# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov-report=html

# Run specific test file
pytest tests/test_storage.py

# Run specific test
pytest tests/test_storage.py::test_create_conversation_creates_file

# Run with verbose output
pytest -v

# Run and show print statements
pytest -s
```

## Frontend Tests (JavaScript)

### Test Framework
- **Vitest** - Fast unit test framework
- **@testing-library/react** - React component testing
- **jsdom** - DOM environment simulation

### Test Files

#### `frontend/src/__tests__/api.test.js` (Multiple test suites)

**api.listConversations (3 tests):**
- Successful conversation list fetch
- Failed request error handling
- Network error handling

**api.createConversation (2 tests):**
- Successful conversation creation
- Creation failure handling

**api.getConversation (2 tests):**
- Specific conversation retrieval
- 404 error handling for non-existent conversations

**api.sendMessage (3 tests):**
- Successful message sending
- Empty message content handling
- Send failure error handling

**api.sendMessageStream (5 tests):**
- Streaming event handling
- Malformed SSE data handling
- Streaming failure errors
- Multiple events in single chunk
- Empty line handling

### Test Configuration

**vitest.config.js:**
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### Running Frontend Tests

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

## Test Coverage Summary

### Backend Coverage Targets
- **config.py**: 100% (configuration loading and validation)
- **storage.py**: 95%+ (comprehensive CRUD and edge cases)
- **openrouter.py**: 90%+ (API interactions with mocking)
- **council.py**: 85%+ (complex orchestration logic)
- **main.py**: 85%+ (FastAPI endpoints)

### Frontend Coverage Targets
- **api.js**: 90%+ (all API methods and error paths)

## Key Testing Patterns

### 1. Isolation with Mocking
All external dependencies (API calls, file I/O, environment variables) are properly mocked to ensure test isolation and speed.

### 2. Async/Await Handling
All async operations are properly tested with `pytest.mark.asyncio` and proper async/await patterns.

### 3. Error Scenarios
Every test file includes comprehensive error handling tests:
- Network failures
- HTTP errors
- Invalid data
- Missing resources
- Timeout conditions

### 4. Edge Cases
Tests cover edge cases like:
- Empty inputs
- Malformed data
- Concurrent operations
- Large data sets
- Unicode/special characters

### 5. Integration Tests
Some tests verify complete workflows:
- Full conversation lifecycle
- Complete 3-stage council execution
- End-to-end message flows

## Test Statistics

- **Total Python test files**: 5
- **Total Python tests**: 96+
- **Total Python test lines**: 1,665+
- **Total JavaScript test suites**: 5+
- **Total JavaScript tests**: 15+

## Adding New Tests

### Backend (Python)

1. Create test file: `tests/test_<module>.py`
2. Import required fixtures from conftest.py
3. Follow naming convention: `test_<functionality>_<scenario>`
4. Use descriptive docstrings
5. Mock external dependencies
6. Run tests to verify

Example:
```python
def test_new_feature_happy_path(temp_data_dir):
    """Test that new feature works correctly."""
    # Arrange
    # Act
    # Assert
```

### Frontend (JavaScript)

1. Create test file: `frontend/src/__tests__/<component>.test.js`
2. Import Vitest functions and component
3. Follow naming convention: `describe` and `it` blocks
4. Mock fetch and external dependencies
5. Run tests to verify

Example:
```javascript
describe('NewComponent', () => {
  it('should render correctly', () => {
    // Arrange, Act, Assert
  });
});
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Backend Tests
  run: |
    uv pip install -e ".[dev]"
    pytest --cov=backend --cov-report=xml

- name: Run Frontend Tests
  run: |
    cd frontend
    npm install
    npm test -- --coverage
```

## Maintenance

- **Keep tests updated** when code changes
- **Add tests for new features** before merging
- **Maintain high coverage** (aim for 80%+ overall)
- **Review failing tests** immediately
- **Update fixtures** when data structures change
- **Document complex test scenarios**

## Resources

- [pytest documentation](https://docs.pytest.org/)
- [Vitest documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)

---

**Generated**: December 2025
**Test Framework Versions**: pytest 8.0+, Vitest 1.0+