# Student Management System

A full-stack TypeScript application for managing students with a React frontend and Node.js backend.

## Features

- **Add Students**: Create new student records with name, CPF, and email
- **Edit Students**: Update existing student information (name and email)
- **Delete Students**: Remove students from the system
- **View Students**: List all registered students in a clean table format
- **CPF Validation**: Ensures unique CPF numbers and proper formatting
- **Email Validation**: Validates email format
- **Modern UI**: Clean, responsive design with gradients and animations
- **Real-time Updates**: Interface updates immediately after operations

## Project Structure

```
teaching-assistant-react/
├── client/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── StudentForm.tsx
│   │   │   └── StudentList.tsx
│   │   ├── services/       # API service classes
│   │   │   └── StudentService.ts
│   │   ├── types/         # TypeScript type definitions
│   │   │   └── Student.ts
│   │   ├── App.tsx        # Main app component
│   │   ├── App.css        # Styles
│   │   └── index.tsx      # Entry point
│   ├── package.json
│   └── tsconfig.json
├── server/                # Node.js TypeScript backend
│   ├── src/
│   │   ├── models/        # Business logic classes
│   │   │   ├── Student.ts    # Student class with validation
│   │   │   └── StudentSet.ts # Student collection management
│   │   └── server.ts      # Express server with API routes
│   ├── package.json
│   └── tsconfig.json
└── .vscode/
    └── launch.json        # VS Code debug configurations
```

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- VS Code (recommended)

### Installation

#### Option 1: Use the installation script (Recommended)
```bash
./install-deps.sh
```

#### Option 2: Manual installation
1. **Install server dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Install client dependencies:**
   ```bash
   cd client
   npm install
   ```

#### Option 3: VS Code Tasks
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Tasks: Run Task"
3. Select "Install All Dependencies"

### Running the Application

#### Option 1: VS Code (Recommended)
1. Open the project in VS Code
2. Go to Run and Debug (Ctrl+Shift+D)
3. Select "Launch Full Stack" from the dropdown
4. Press F5 or click the play button

This will start both the server and client simultaneously.

#### Option 2: Manual Start

1. **Start the server:**
   ```bash
   cd server
   npm run dev
   ```
   Server runs on http://localhost:3005

2. **Start the client (in a new terminal):**
   ```bash
   cd client
   npm start
   ```
   Client runs on http://localhost:3004

### Usage

1. Open http://localhost:3004 in your browser
2. Use the form at the top to add new students
3. Fill in Name, CPF (Brazilian format: 000.000.000-00), and Email
4. Click "Add Student" to save
5. View all students in the table below
6. Use "Edit" to modify student information
7. Use "Delete" to remove students (with confirmation)

## API Endpoints

The server provides a REST API:

- `GET /api/students` - Get all students
- `POST /api/students` - Create a new student
- `GET /api/students/:cpf` - Get student by CPF
- `PUT /api/students/:cpf` - Update student by CPF
- `DELETE /api/students/:cpf` - Delete student by CPF

## Architecture Highlights

### Backend (Node.js + TypeScript)
- **Student Class**: Handles individual student data with validation
- **StudentSet Class**: Manages the collection of students with CRUD operations
- **Clean Architecture**: Separation of concerns between models and API routes
- **Type Safety**: Full TypeScript implementation
- **Error Handling**: Proper validation and error responses

### Frontend (React + TypeScript)
- **StudentService Class**: Centralizes all API communication
- **Component Architecture**: Reusable React components
- **Modern UI**: CSS Grid, Flexbox, gradients, and animations
- **Form Handling**: Real-time CPF formatting and validation
- **State Management**: React hooks for state management
- **Error Handling**: User-friendly error messages

## Technologies Used

### Backend
- Node.js
- Express.js
- TypeScript
- ts-node-dev (development)

### Frontend
- React 18
- TypeScript
- CSS3 (Grid, Flexbox, Animations)
- Fetch API

### Development Tools
- VS Code with debug configurations
- ESLint
- TypeScript compiler
- Hot reloading for both client and server

## Port Configuration

- **Server**: http://localhost:3005
- **Client**: http://localhost:3004

The application uses ports 3005 and 3004 to avoid conflicts with other applications that might be using ports 3000-3003.

## License

ISC