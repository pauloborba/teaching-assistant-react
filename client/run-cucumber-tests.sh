#!/bin/bash

# Script to run Cucumber tests for the student management system

echo "🧪 Starting Cucumber Tests for Student Management System"
echo "========================================================"

# Check if both client and server are running
check_server() {
    if curl -s http://localhost:3005/api/students > /dev/null 2>&1; then
        echo "✅ Server is running on port 3005"
        return 0
    else
        echo "❌ Server is not running on port 3005"
        echo "Please start the server with: npm run dev (from server directory)"
        return 1
    fi
}

check_client() {
    if curl -s http://localhost:3004 > /dev/null 2>&1; then
        echo "✅ Client is running on port 3004"
        return 0
    else
        echo "❌ Client is not running on port 3004"
        echo "Please start the client with: npm start (from client directory)"
        return 1
    fi
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! check_server; then
    exit 1
fi

if ! check_client; then
    exit 1
fi

echo ""
echo "🚀 Running Cucumber tests..."
echo ""

# Run the tests
npm run test:cucumber

echo ""
echo "📊 Test reports generated in the 'reports' directory"
echo "🎯 Check cucumber_report.html for detailed results"