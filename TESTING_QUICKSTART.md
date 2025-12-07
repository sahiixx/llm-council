# Testing Quick Start Guide

## Backend Tests (Python)

### Setup
```bash
# Install test dependencies
uv pip install -e ".[dev]"
```

### Run Tests
```bash
# All tests
pytest

# With coverage
pytest --cov=backend --cov-report=html

# Specific file
pytest tests/test_storage.py
```

## Frontend Tests (JavaScript)

### Setup
```bash
cd frontend
npm install
```

### Run Tests
```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage
```

## Tips

1. Write tests first (TDD)
2. Keep tests fast (mock external calls)
3. Test behavior, not implementation
4. Use descriptive test names
5. Clean up after tests

See TEST_SUMMARY.md for complete documentation.