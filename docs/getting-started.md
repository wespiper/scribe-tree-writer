# Getting Started with Scribe Tree Writer

This guide will help you set up and start using Scribe Tree Writer.

## System Requirements

Before you begin, ensure you have:

- Python 3.9 or higher
- Node.js 18 or higher
- PostgreSQL 14 or higher
- Git
- A text editor (VS Code recommended)
- 4GB RAM minimum
- 2GB free disk space

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/scribe-tree-writer.git
cd scribe-tree-writer
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create and activate a Python virtual environment:

```bash
# Create virtual environment
python -m venv venv

# Activate it
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Database Setup

Install PostgreSQL if you haven't already:

- macOS: `brew install postgresql`
- Ubuntu: `sudo apt-get install postgresql`
- Windows: Download from https://www.postgresql.org/download/windows/

Create a database:

```bash
createdb scribe_tree_writer
```

### 4. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```
DATABASE_URL=postgresql://username:password@localhost/scribe_tree_writer
SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

Generate a secure secret key:

```python
import secrets
print(secrets.token_urlsafe(32))
```

### 5. Initialize Database

Run database migrations:

```bash
alembic upgrade head
```

### 6. Start Backend Server

```bash
uvicorn app.main:app --reload
```

The backend API will be available at http://localhost:8000

### 7. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create frontend environment file:

```bash
echo "VITE_API_URL=http://localhost:8000" > .env.local
```

Start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:5173

## Creating Your First Account

1. Open http://localhost:5173 in your browser
2. Click "Register"
3. Enter your email and password
4. Click "Create Account"
5. You'll be automatically logged in

## Writing Your First Document

1. Click "New Document" on the dashboard
2. Give your document a title
3. Start writing in the editor
4. Your work saves automatically every 30 seconds

## Using the AI Assistant

1. Click the "AI Assistant" button in the editor
2. Write a reflection about your current thinking (minimum 50 words)
3. Submit your reflection
4. The AI will respond with thoughtful questions to guide your thinking
5. Continue the conversation to develop your ideas

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Ensure PostgreSQL is running: `pg_isready`
2. Check your DATABASE_URL in `.env`
3. Verify the database exists: `psql -l`

### API Key Issues

If AI features aren't working:

1. Verify your API keys are correct in `.env`
2. Ensure you have credits on your OpenAI/Anthropic account
3. Check the backend logs for specific error messages

### Port Conflicts

If ports 8000 or 5173 are already in use:

- Backend: `uvicorn app.main:app --reload --port 8001`
- Frontend: Update `package.json` to use a different port

### Missing Dependencies

If you encounter module not found errors:

- Backend: `pip install -r requirements.txt`
- Frontend: `npm install`

## Next Steps

- Read the [User Guide](user-guide.md) to learn about all features
- Review the [Educational Philosophy](PHILOSOPHY.md) to understand the pedagogical approach
- Check the [API Reference](api-reference.md) if you're interested in integrations

## Getting Help

If you encounter issues not covered here:

1. Check the [FAQ](faq.md)
2. Review existing issues on GitHub
3. Create a new issue with details about your problem

## Development Setup

If you plan to contribute to the project:

1. Install pre-commit hooks:

```bash
pre-commit install
```

2. Run tests before committing:

```bash
# Backend tests
cd backend && ./run_tests.sh

# Frontend tests
cd frontend && npm test
```

3. Follow the [Contributing Guidelines](../CONTRIBUTING.md)
