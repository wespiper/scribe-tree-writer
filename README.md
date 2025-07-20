# Scribe Tree Writer

> An AI writing partner that enhances thinking through Socratic questioning

## Vision

Scribe Tree Writer demonstrates how AI should work in education—not as a shortcut that bypasses thinking, but as a partner that deepens it. Through carefully designed friction and progressive enhancement, students develop stronger writing and critical thinking skills while learning to collaborate effectively with AI.

## Core Philosophy

-   **Questions, Not Answers**: AI guides through inquiry rather than providing solutions
-   **Productive Friction**: Strategic challenges that build capability
-   **Progressive Enhancement**: Better thinking unlocks more sophisticated AI assistance
-   **Transparency**: All AI interactions are visible and educational

## Technical Stack

### Backend (Python)

-   **Framework**: FastAPI with async support
-   **Database**: PostgreSQL with SQLAlchemy ORM
-   **AI Integration**: OpenAI/Anthropic APIs
-   **Authentication**: JWT with secure password hashing
-   **Analytics**: Custom learning metrics tracking

### Frontend (React)

-   **Framework**: React 18 with TypeScript
-   **Styling**: Tailwind CSS + ShadCN UI
-   **Editor**: Tiptap for rich text editing
-   **State Management**: React Context + hooks
-   **Build Tool**: Vite for fast development

## Key Features

1. **Reflection Gates**: Students must reflect before accessing AI assistance
2. **Socratic AI**: Responds with thoughtful questions, not direct answers
3. **Progressive Levels**: AI sophistication increases with reflection quality
4. **Learning Analytics**: Track thinking development over time
5. **Version History**: See how writing and thinking evolve

## Getting Started

### Prerequisites

-   Python 3.11+
-   Node.js 18+
-   PostgreSQL 14+

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database and API keys
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with API endpoint
npm run dev
```

## Project Structure

```
scribe-tree-writer/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── models/         # SQLAlchemy models
│   │   ├── services/       # Business logic
│   │   ├── core/           # Core utilities
│   │   └── prompts/        # AI prompt templates
│   └── tests/              # Backend tests
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API clients
│   │   └── hooks/          # Custom React hooks
│   └── public/             # Static assets
└── docs/                   # Documentation
```

## Development Philosophy

This project embodies the belief that AI should enhance human capabilities, not replace them. Every design decision prioritizes learning outcomes over convenience, ensuring students develop the critical thinking skills they'll need in an AI-integrated future.

## License

MIT License - See LICENSE file for details
