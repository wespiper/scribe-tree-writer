# Scribe Tree Write (MVP) - Agile Project Plan

## Project Overview

**Project Name:** Scribe Tree Writer - AI Writing Partner  
**Duration:** 5 Weeks (5 Sprints)  
**Team Size:** 1-2 developers  
**Methodology:** Agile/Scrum with 1-week sprints  
**Goal:** Build a functional MVP demonstrating AI-powered Socratic writing assistance

---

## Project Charter

### Vision Statement

Create a simplified proof-of-concept that demonstrates how AI can enhance student writing through Socratic
questioning rather than content generation.

### Success Criteria

1. Students can write documents with AI guidance (not generation)
2. AI asks questions instead of providing answers
3. Reflection required before AI access
4. Writing process is visible and trackable
5. Clean, simple UI that works on desktop

### Out of Scope for MVP

-   Multi-role permissions (educator dashboards)
-   Real-time collaboration
-   Advanced analytics
-   Mobile optimization
-   Course/assignment management

---

## User Stories & Epics

### Epic 1: User Authentication & Document Management

**Goal:** Users can create accounts and manage their documents

#### User Stories:

**US-101:** As a user, I want to create an account so I can save my work

-   **AC1:** User can register with email/password
-   **AC2:** User receives JWT token upon login
-   **AC3:** User can logout and login again
-   **Points:** 3

**US-102:** As a user, I want to see all my documents in one place

-   **AC1:** Dashboard shows list of user's documents
-   **AC2:** Documents show title, last modified, word count
-   **AC3:** User can click to open a document
-   **Points:** 2

**US-103:** As a user, I want to create and delete documents

-   **AC1:** User can create new blank document
-   **AC2:** User can delete their own documents
-   **AC3:** Deleted documents are soft-deleted
-   **Points:** 2

### Epic 2: Writing Experience

**Goal:** Users can write with a clean, distraction-free editor

#### User Stories:

**US-201:** As a user, I want a clean writing interface

-   **AC1:** Full-screen writing mode available
-   **AC2:** Auto-save every 30 seconds
-   **AC3:** Word count visible
-   **AC4:** Basic formatting (bold, italic, headers)
-   **Points:** 5

**US-202:** As a user, I want to see my document versions

-   **AC1:** Each save creates a version
-   **AC2:** User can view version history
-   **AC3:** User can restore previous version
-   **Points:** 3

**US-203:** As a user, I want to name and organize documents

-   **AC1:** User can edit document title
-   **AC2:** Title updates reflect in document list
-   **AC3:** Documents sorted by last modified
-   **Points:** 2

### Epic 3: AI Writing Partner

**Goal:** AI guides users through Socratic questioning

#### User Stories:

**US-301:** As a user, I must reflect before accessing AI help

-   **AC1:** Reflection prompt appears when requesting AI
-   **AC2:** User must write 50+ word reflection
-   **AC3:** Reflection quality determines AI access level
-   **AC4:** Poor reflections get guidance to improve
-   **Points:** 5

**US-302:** As a user, I want AI to ask me guiding questions

-   **AC1:** AI responds with questions, not statements
-   **AC2:** Questions are relevant to my writing context
-   **AC3:** AI remembers conversation context
-   **AC4:** No direct answers or text generation
-   **Points:** 8

**US-303:** As a user, I want to see my AI conversation history

-   **AC1:** Chat sidebar shows full conversation
-   **AC2:** Conversations are per-document
-   **AC3:** User can clear conversation history
-   **AC4:** Conversations saved with document
-   **Points:** 3

**US-304:** As a user, I want progressively better AI help

-   **AC1:** Basic level: Simple clarifying questions
-   **AC2:** Standard level: Analytical questions
-   **AC3:** Advanced level: Complex critical thinking
-   **AC4:** Level shown in UI
-   **Points:** 5

### Epic 4: Learning & Progress

**Goal:** Users can track their thinking development

#### User Stories:

**US-401:** As a user, I want to see my reflection history

-   **AC1:** All reflections saved with timestamps
-   **AC2:** Reflection quality scores visible
-   **AC3:** Progress over time shown
-   **Points:** 3

**US-402:** As a user, I want to track my AI usage patterns

-   **AC1:** Dashboard shows AI interactions per document
-   **AC2:** Average reflection quality displayed
-   **AC3:** Trending towards independence highlighted
-   **Points:** 3

---

## Sprint Plan

### Sprint 0: Setup & Planning (Pre-work)

**Duration:** 2-3 days  
**Goal:** Repository setup and architecture decisions

#### Tasks:

-   Create new scribe-tree-mvp repository
-   Set up Python backend structure
-   Set up React frontend structure
-   Configure development environment
-   Extract valuable assets from old codebase
-   Create project README

#### Deliverables:

-   Working development environment
-   Basic project structure
-   Extracted AI prompts and patterns

---

### Sprint 1: Foundation (Week 1) - IN PROGRESS

**Goal:** Basic auth and document CRUD  
**Velocity Target:** 15 points  
**Actual Start Date:** July 20, 2025

#### User Stories:

-   US-101: User registration/login (3 pts) - Not Started
-   US-102: Document list view (2 pts) - Not Started
-   US-103: Create/delete documents (2 pts) - Not Started
-   US-201: Basic writing interface (5 pts) - Not Started
-   US-203: Document naming (2 pts) - Not Started

#### Technical Tasks:

-   ✅ Pytest infrastructure setup (TDD foundation)
-   FastAPI backend setup with SQLAlchemy
-   JWT authentication implementation
-   Document model and API endpoints
-   React router and basic pages
-   Tiptap editor integration

#### Sprint Review Criteria:

-   ✅ Test infrastructure operational
-   User can register, login, and logout
-   User can create, list, open, and delete documents
-   Basic editor allows typing and saving

**Progress Notes:**
- Completed pytest infrastructure setup (STORY-010) to enable TDD workflow
- All future development will follow test-first approach
- Test coverage reporting configured

---

### Sprint 2: Writing Experience (Week 2)

**Goal:** Complete writing interface with versions  
**Velocity Target:** 12 points

#### User Stories:

-   US-201: Polish writing interface (remaining work)
-   US-202: Version history (3 pts)
-   Backend API for AI integration setup

#### Technical Tasks:

-   Auto-save implementation
-   Version tracking system
-   UI polish with ShadCN components
-   OpenAI/Anthropic API integration
-   Environment configuration for AI keys
-   **Learning Analytics Foundation**:
    -   Basic interaction tracking infrastructure
    -   Learning metrics data models
    -   Analytics service setup

#### Sprint Review Criteria:

-   Auto-save works reliably
-   Version history viewable and restorable
-   Editor is polished and user-friendly

---

### Sprint 3: AI Partner Core (Week 3)

**Goal:** Implement Socratic AI with reflection gates  
**Velocity Target:** 18 points

#### User Stories:

-   US-301: Reflection gate (5 pts)
-   US-302: Socratic questioning (8 pts)
-   US-304: Progressive AI levels (5 pts)

#### Technical Tasks:

-   Reflection quality assessment algorithm
-   Socratic prompt engineering
-   AI conversation context management
-   Progressive questioning logic
-   Integration with frontend
-   **Research-Oriented Features**:
    -   A/B testing framework for questioning strategies
    -   User journey mapping implementation
    -   Qualitative feedback collection system
    -   Control group mode (AI-free comparison)

#### Sprint Review Criteria:

-   Reflection gate blocks AI access
-   AI asks relevant questions based on context
-   Different quality reflections unlock different AI levels

---

### Sprint 4: Conversation & Progress (Week 4)

**Goal:** Complete AI features and add progress tracking  
**Velocity Target:** 12 points

#### User Stories:

-   US-303: AI conversation history (3 pts)
-   US-401: Reflection history (3 pts)
-   US-402: Usage analytics (3 pts)
-   Polish and bug fixes (3 pts)

#### Technical Tasks:

-   Conversation persistence
-   Progress tracking implementation
-   Basic analytics dashboard
-   Performance optimization
-   Error handling improvements

#### Sprint Review Criteria:

-   Full AI conversations saved and viewable
-   User can see their progress over time
-   System is stable and performant

---

### Sprint 5: Polish & Launch Prep (Week 5)

**Goal:** Production ready MVP  
**Velocity Target:** Bug fixes and deployment

#### Tasks:

-   Comprehensive testing
-   UI/UX polish based on feedback
-   Deployment configuration
-   Performance optimization
-   Documentation
-   Demo preparation

#### Deliverables:

-   Deployed MVP (Vercel + Railway/Render)
-   User documentation
-   Demo video
-   Launch announcement

---

## Tracking & Metrics

### Development Metrics

-   **Velocity:** Track points completed per sprint
-   **Burndown:** Daily progress within sprints
-   **Code Coverage:** Maintain >70% test coverage
-   **Bug Count:** Track and prioritize issues

### Product Metrics (Post-Launch)

-   **User Engagement:** Sessions per week
-   **Reflection Quality:** Average scores over time
-   **AI Dependency:** Questions per document trend
-   **User Retention:** Weekly active users

### Definition of Done

-   Code reviewed and approved
-   Unit tests written and passing
-   Integration tests for API endpoints
-   Feature works in production environment
-   Documentation updated
-   No critical bugs

---

## Risk Management

### Technical Risks

| Risk                | Impact | Mitigation                              |
| ------------------- | ------ | --------------------------------------- |
| AI API costs        | High   | Implement rate limiting, token counting |
| Performance issues  | Medium | Cache AI responses, optimize queries    |
| Authentication bugs | High   | Use battle-tested libraries             |

### Product Risks

| Risk                    | Impact   | Mitigation                             |
| ----------------------- | -------- | -------------------------------------- |
| Users bypass reflection | High     | Make reflection valuable, not punitive |
| AI gives answers        | Critical | Strict prompt engineering, monitoring  |
| Poor user adoption      | High     | Focus on user value, not restrictions  |

---

## Success Criteria & Launch Goals

### MVP Success Metrics

#### 1. Technical Success

-   95% uptime
-   <2s page load times
-   <3s AI response times
-   Zero critical bugs

#### 2. User Success

-   10 beta users complete full writing session
-   80% report AI helped their thinking
-   Average reflection quality improves over time
-   Users understand Socratic approach

---

## Daily Standup Format

**When:** Daily at 10 AM (async if needed)  
**Format:**

1. What did I complete yesterday?
2. What will I work on today?
3. Any blockers or concerns?
4. Update sprint burndown

### Weekly Events:

-   **Sprint Planning:** Monday mornings
-   **Sprint Review:** Friday afternoon
-   **Retrospective:** Friday after review

---

## Post-MVP Roadmap Preview

### Phase 2 (Weeks 6-8):

-   Educator dashboard (view student progress)
-   Class management basics
-   Enhanced AI capabilities
-   Mobile responsive design

### Phase 3 (Weeks 9-12):

-   Real-time collaboration
-   Advanced analytics
-   API for integrations
-   Enterprise features
