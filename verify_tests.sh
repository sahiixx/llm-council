#!/bin/bash
# Test verification script for LLM Council project

set -e

echo "🔍 Verifying Test Suite Integrity"
echo "=================================="
echo ""

# Check backend tests
echo "📋 Backend Test Files:"
echo "----------------------"
for file in tests/test_*.py; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        echo "✅ $file ($lines lines)"
    fi
done
echo ""

# Check conftest
if [ -f "tests/conftest.py" ]; then
    lines=$(wc -l < "tests/conftest.py")
    echo "✅ tests/conftest.py ($lines lines)"
fi
echo ""

# Check frontend tests
echo "📋 Frontend Test Files:"
echo "-----------------------"
if [ -d "frontend/src/components/__tests__" ]; then
    for file in frontend/src/components/__tests__/*.test.jsx; do
        if [ -f "$file" ]; then
            lines=$(wc -l < "$file")
            echo "✅ $file ($lines lines)"
        fi
    done
fi

if [ -d "frontend/src/__tests__" ]; then
    for file in frontend/src/__tests__/*.test.js; do
        if [ -f "$file" ]; then
            lines=$(wc -l < "$file")
            echo "✅ $file ($lines lines)"
        fi
    done
fi
echo ""

# Count total tests
echo "📊 Test Statistics:"
echo "-------------------"
backend_count=$(find tests -name "test_*.py" | wc -l)
frontend_count=$(find frontend/src -name "*.test.jsx" -o -name "*.test.js" 2>/dev/null | wc -l)
total_count=$((backend_count + frontend_count))

echo "Backend test files: $backend_count"
echo "Frontend test files: $frontend_count"
echo "Total test files: $total_count"
echo ""

# Check for test documentation
if [ -f "TEST_SUMMARY.md" ]; then
    echo "✅ Test documentation: TEST_SUMMARY.md"
else
    echo "❌ Missing: TEST_SUMMARY.md"
fi
echo ""

echo "✅ Test Suite Verification Complete!"
echo ""
echo "📚 To run tests:"
echo "   Backend:  pytest"
echo "   Frontend: cd frontend && npm test"