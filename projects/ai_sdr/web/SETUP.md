# AI SDR Platform - Setup Guide

This is a multi-tenant AI Sales Development Representative (SDR) platform built with Next.js, OpenAI, Prisma, and PostgreSQL.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- OpenAI API key

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-...

# PostgreSQL Database URL (required)
DATABASE_URL=postgresql://user:password@localhost:5432/ai_sdr_db

# Meeting/Scheduling Link (optional)
MEETING_BASE_URL=https://calendly.com/your-team/demo
```

### 3. Set Up Database

Generate Prisma client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

This will:
- Create the `Company` and `DemoClip` tables
- Set up indexes and relationships

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see the app.

## Usage

### Create Your First Company

1. Navigate to http://localhost:3000/admin/companies
2. Fill in the company form:
   - **Slug**: URL-friendly identifier (e.g., "hypersonix")
   - **Display Name**: Company name shown to users
   - **Short Description**: Brief tagline
   - **Product Summary**: Detailed product info for the AI assistant
3. Click "Create Company"

### Test the Chat Widget

1. After creating a company, click "Open Widget" or visit:
   ```
   http://localhost:3000/widget/[your-company-slug]
   ```
2. Interact with the AI assistant
3. The assistant can:
   - Answer product questions (via RAG/knowledge search)
   - Show demo clips
   - Book meetings
   - Log qualified leads

### Embed on Your Website

Copy the embed code from the admin page:

```html
<iframe 
  src="https://your-domain.com/widget/your-slug" 
  width="100%" 
  height="600" 
  frameborder="0">
</iframe>
```

## Project Structure

```
/src
  /app
    /api
      /chat/[companyId]     - Chat API endpoint
      /admin/companies      - Admin API routes
    /admin/companies        - Admin UI
    /widget/[companyId]     - Embeddable chat widget
  /components
    WidgetChat.tsx          - Chat UI component
  /lib
    prisma.ts               - Database client
    openai.ts               - OpenAI client
    companies.ts            - Company data access
    systemPrompt.ts         - AI system prompt builder
    tools.ts                - OpenAI function tools
    rag.ts                  - Knowledge search (stub)
    demoMedia.ts            - Demo clip retrieval
    scheduling.ts           - Meeting link generation
    crm.ts                  - Lead logging (stub)
  /types
    chat.ts                 - TypeScript types
/prisma
  schema.prisma             - Database schema
```

## Next Steps / TODOs

### Phase 1 - Current Implementation ✅
- [x] Multi-tenant company management
- [x] Chat API with OpenAI integration
- [x] Function calling (tools) for RAG, demos, meetings, CRM
- [x] Embeddable widget UI
- [x] Admin interface

### Phase 2 - Integrations (TODO)
- [ ] Integrate vector database (Pinecone, Weaviate, or pgvector) for RAG
- [ ] Connect real CRM (HubSpot, Salesforce, etc.)
- [ ] Implement Calendly/Cal.com integration
- [ ] Add authentication/authorization for admin
- [ ] Set up webhook endpoints for CRM events

### Phase 3 - Advanced Features (TODO)
- [ ] Conversation analytics dashboard
- [ ] A/B testing for system prompts
- [ ] Lead scoring and routing
- [ ] Multi-language support
- [ ] Voice/phone integration

### Phase 4 - Demo Automation (TODO)
- [ ] Screen recording and indexing
- [ ] Intelligent clip selection
- [ ] Interactive product tours
- [ ] Custom demo environments per lead

## Development Commands

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio (DB GUI)
npx prisma studio
```

## Environment Variables Reference

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | Yes | OpenAI API key | - |
| `DATABASE_URL` | Yes | PostgreSQL connection string | - |
| `MEETING_BASE_URL` | No | Calendly/Cal.com link | `https://calendly.com/your-team/demo` |
| `NODE_ENV` | No | Environment | `development` |

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
- Verify database exists and user has permissions

### OpenAI API Errors
- Verify OPENAI_API_KEY is set correctly
- Check API quota and billing
- Ensure you're using a supported model (gpt-4-turbo-preview)

### Widget Not Loading
- Check browser console for CORS errors
- Verify company slug exists in database
- Ensure API routes are accessible

## Contributing

This is a foundational implementation. Key areas for contribution:
1. Real vector DB integration for RAG
2. CRM connector implementations
3. Meeting scheduler integration
4. Admin authentication/authorization
5. Analytics and reporting
6. Testing suite

## License

[Your License Here]

