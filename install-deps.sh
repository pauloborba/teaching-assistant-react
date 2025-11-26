#!/bin/bash

echo "🚀 Installing Student Management System Dependencies..."
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies (backend/)..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Server installation failed"
    exit 1
fi
echo "✅ Server dependencies installed successfully"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies (frontend/)..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Frontend installation failed"
    exit 1
fi
echo "✅ Client dependencies installed successfully"
echo ""

echo "🎉 All dependencies installed successfully!"
echo ""
echo "To start the application:"
echo "1. Open in VS Code"
echo "2. Go to Run & Debug (Ctrl+Shift+D / Cmd+Shift+D)"
echo "3. Select 'Launch Full Stack'"
echo "4. Press F5 or click the play button"
echo ""
echo "Or start manually:"
echo "Backend: cd backend && npm run dev"
echo "Frontend: cd frontend && npm start"
echo ""
echo "URLs:"
echo "Frontend: http://localhost:3004"
echo "Backend: http://localhost:3005"

cat <<'NOTE'
⚠️ Windows / OneDrive notes:
 - If you run into 'EPERM' or permission errors during npm install under a OneDrive path, try moving this repository outside OneDrive (e.g. C:\projects) or disable OneDrive sync for the project folder.
 - On Windows PowerShell the start script might need a different env syntax (use a separate terminal or set PORT before running).
NOTE