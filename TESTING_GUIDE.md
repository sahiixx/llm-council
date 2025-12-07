# Testing Guide for LLM Council

## Quick Start

### Backend Tests
```bash
# Install test dependencies
pip install -e ".[dev]"

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_main.py -v

# Run with coverage
pytest --cov=backend --cov-report=html --cov-report=term

# Run only tests matching a pattern
pytest -k "test_send_message"
```

### Frontend Tests
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already done)
npm install

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/api.test.js
```

## Test Files Overview

### Backend Tests (Python/pytest)

| File | Lines | Purpose |
|------|-------|---------|
| `tests/test_main.py` | 682 | FastAPI endpoints (NEW) |
| `tests/test_pyproject_toml.py` | 189 | Configuration validation (NEW) |
| `tests/test_config.py` | 118 | Config module |
| `tests/test_council.py` | 536 | Council logic |
| `tests/test_openrouter.py` | 412 | API integration |
| `tests/test_storage.py` | 525 | Storage layer |

**Total Backend Tests**: ~2,462 lines

### Frontend Tests (JavaScript/Vitest)

| File | Lines | Purpose |
|------|-------|---------|
| `frontend/src/api.test.js` | 387 | API client (NEW) |
| `frontend/src/components/Sidebar.test.jsx` | 389 | Sidebar component (NEW) |
| `frontend/src/components/Stage1.test.jsx` | 118 | Stage1 component (NEW) |
| `frontend/src/components/Stage2.test.jsx` | 107 | Stage2 component (NEW) |
| `frontend/src/components/Stage3.test.jsx` | 119 | Stage3 component (NEW) |
| `frontend/src/package.test.js` | 250 | package.json validation (NEW) |
| `frontend/src/vitest-config.test.js` | 97 | vitest config validation (NEW) |

**Total Frontend Tests**: ~1,467 lines

## What's Being Tested

### Backend Coverage
- ✅ **API Endpoints**: All REST endpoints with success/error cases
- ✅ **Authentication**: CORS middleware configuration
- ✅ **Business Logic**: Council stages 1-3, ranking aggregation
- ✅ **Storage**: File-based conversation persistence
- ✅ **External APIs**: OpenRouter integration
- ✅ **Configuration**: Environment variables, model selection
- ✅ **Edge Cases**: Unicode, long inputs, concurrent requests
- ✅ **Error Handling**: 404s, validation errors, timeouts

### Frontend Coverage
- ✅ **API Client**: All HTTP methods, streaming, error handling
- ✅ **Components**: Rendering, user interactions, edge cases
- ✅ **Props Validation**: Required/optional props, type checking
- ✅ **Accessibility**: Keyboard navigation, ARIA roles
- ✅ **Configuration**: Build config, test setup validation
- ✅ **Edge Cases**: Empty states, long content, special characters

## Test Patterns

### Backend Patterns
```python
# Using fixtures
@pytest.fixture
def client():
    return TestClient(app)

# Async tests
@pytest.mark.asyncio
async def test_async_function():
    result = await async_function()
    assert result is not None

# Mocking
with patch("module.function", new_callable=AsyncMock) as mock:
    mock.return_value = expected_value
    result = await function_under_test()
```

### Frontend Patterns
```javascript
// Component testing
import { render, screen, fireEvent } from '@testing-library/react';

test('renders component', () => {
  render(<Component prop="value" />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});

// User interactions
test('handles click', () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick} />);
  fireEvent.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalled();
});

// Async operations
test('fetches data', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'value' })
  });
  const result = await fetchData();
  expect(result).toEqual({ data: 'value' });
});
```

## Coverage Targets

### Current Status
- Backend: Comprehensive coverage of all modules
- Frontend: Core components and API client covered

### Recommended Thresholds
```bash
# Backend
pytest --cov=backend --cov-fail-under=80

# Frontend (in package.json)
"test:coverage": "vitest --coverage --coverage.lines=80"
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - run: pip install -e ".[dev]"
      - run: pytest --cov=backend --cov-report=xml
      
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm test
```

## Troubleshooting

### Backend Issues

**Import errors**
```bash
# Ensure pythonpath is set
export PYTHONPATH="${PYTHONPATH}:."
pytest
```

**Async warnings**
```bash
# Already configured in pyproject.toml
# asyncio_mode = "auto"
```

### Frontend Issues

**Module not found**
```bash
cd frontend
npm install
```

**Test timeouts**
```bash
# Increase timeout in test
test('slow test', async () => {
  // test code
}, 10000); // 10 second timeout
```

## Best Practices

1. **Write tests first** (TDD) when adding new features
2. **Test edge cases**: empty inputs, null values, unicode
3. **Mock external dependencies**: APIs, file system, time
4. **Use descriptive names**: `test_send_message_creates_conversation_title`
5. **Keep tests isolated**: No shared state between tests
6. **Test user behavior**: Not implementation details
7. **Maintain fast tests**: Mock slow operations
8. **Update tests with code**: Tests are documentation

## Resources

- [pytest documentation](https://docs.pytest.org/)
- [Vitest documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing best practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)