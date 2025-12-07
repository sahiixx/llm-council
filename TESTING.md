# Testing Documentation

This document provides an overview of the comprehensive test suite for the LLM Council project.

## Test Coverage Summary

### Python Backend Tests (pytest)

Located in `tests/` directory:

1. **test_main.py** - Tests for the simple main.py entry point
   - Function existence and behavior
   - Output validation
   - Import behavior
   - Multiple execution scenarios

2. **test_backend_main.py** - Tests for FastAPI application (backend/main.py)
   - Root health check endpoint
   - Conversation listing and creation
   - Individual conversation retrieval
   - Message sending (non-streaming)
   - Streaming message endpoint with SSE
   - CORS configuration
   - Request validation
   - Error handling and edge cases

3. **test_config.py** - Configuration module tests
   - Environment variable loading
   - Model configuration validation
   - API URL configuration
   - Data directory setup

4. **test_council.py** - Council orchestration tests
   - Stage 1: Collecting model responses
   - Stage 2: Peer ranking collection
   - Stage 3: Final synthesis
   - Ranking parsing logic
   - Aggregate ranking calculations
   - Title generation
   - Full council workflow
   - Edge cases and error handling

5. **test_openrouter.py** - OpenRouter API client tests
   - Single model querying
   - Parallel model querying
   - HTTP error handling
   - Timeout handling
   - Network error handling
   - Response parsing
   - Edge cases (malformed JSON, Unicode, etc.)

6. **test_storage.py** - Storage system tests
   - Directory management
   - Conversation creation and retrieval
   - Conversation listing and sorting
   - Message addition (user and assistant)
   - Title updates
   - Error handling
   - Edge cases

### Frontend Tests (Vitest + React Testing Library)

Located in `frontend/src/__tests__/` and `frontend/src/components/__tests__/`:

1. **api.test.js** - API client tests
   - Conversation listing
   - Conversation creation
   - Conversation retrieval
   - Message sending
   - Streaming message handling
   - Error handling
   - SSE parsing

2. **App.test.jsx** - Root application component tests
   - Component rendering
   - Conversation loading on mount
   - New conversation creation
   - Conversation selection
   - Error handling
   - Streaming message updates

3. **Sidebar.test.jsx** - Sidebar component tests
   - Rendering with/without conversations
   - Active conversation highlighting
   - Conversation selection
   - New conversation button
   - Empty state handling

4. **ChatInterface.test.jsx** - Chat interface tests
   - Empty state rendering
   - Message input and submission
   - Enter/Shift+Enter behavior
   - Loading states
   - Message display (user and assistant)
   - Stage loading indicators

5. **Stage1.test.jsx** - Stage 1 component tests
   - Response display
   - Tab switching
   - Model name formatting
   - Markdown rendering

6. **Stage2.test.jsx** - Stage 2 component tests
   - Ranking display
   - Tab switching
   - Label de-anonymization
   - Parsed ranking display
   - Aggregate rankings
   - Markdown rendering

7. **Stage3.test.jsx** - Stage 3 component tests
   - Final response display
   - Chairman model display
   - Markdown rendering

## Running Tests

### Python Tests

```bash
# Install test dependencies
pip install -e ".[dev]"

# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov-report=html

# Run specific test file
pytest tests/test_council.py

# Run with verbose output
pytest -v
```

### Frontend Tests

```bash
cd frontend

# Install dependencies
npm install

# Run all tests
npm test

# Run tests in UI mode
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- Sidebar.test.jsx
```

## Test Frameworks and Libraries

### Python
- **pytest** - Main testing framework
- **pytest-asyncio** - Async test support
- **pytest-mock** - Mocking utilities
- **pytest-cov** - Coverage reporting

### Frontend
- **Vitest** - Fast test runner (Vite-native)
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Custom DOM matchers
- **@testing-library/user-event** - User interaction simulation
- **jsdom** - DOM implementation for tests

## Test Coverage Goals

The test suite aims for comprehensive coverage of:

- ✅ **Happy paths** - Normal operation scenarios
- ✅ **Edge cases** - Boundary conditions and unusual inputs
- ✅ **Error handling** - Graceful failure scenarios
- ✅ **Async operations** - Proper handling of promises and async/await
- ✅ **User interactions** - Click, type, submit actions
- ✅ **API communication** - Request/response handling
- ✅ **State management** - Component and application state
- ✅ **Mocking** - External dependencies and API calls

## Best Practices

1. **Isolation** - Each test is independent and can run in any order
2. **Descriptive names** - Test names clearly describe what they verify
3. **Arrange-Act-Assert** - Tests follow the AAA pattern
4. **Mocking** - External dependencies are mocked to ensure test reliability
5. **Coverage** - Aim for high coverage while focusing on meaningful tests
6. **Fast execution** - Tests run quickly to enable rapid feedback

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Python tests
  run: pytest --cov=backend

- name: Run Frontend tests
  run: cd frontend && npm test
```

## Adding New Tests

When adding new features:

1. Write tests first (TDD) or alongside feature development
2. Follow existing test patterns and naming conventions
3. Test both success and failure scenarios
4. Include edge cases and boundary conditions
5. Update this documentation if adding new test categories

## Test Maintenance

- Review and update tests when refactoring code
- Remove obsolete tests for removed features
- Keep tests simple and focused on single concerns
- Regularly check for flaky tests and fix them
- Monitor test execution time and optimize slow tests