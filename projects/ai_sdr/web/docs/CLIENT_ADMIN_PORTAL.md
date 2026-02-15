# Client Admin Portal

The Client Admin Portal lets clients manage their own AI SDR configuration: API keys, content, and embed code.

## Setup

### 1. Environment Variables

Add to `.env.local`:

```
NEXTAUTH_SECRET=your-random-secret-at-least-32-chars
NEXTAUTH_URL=http://localhost:3000   # or your production URL
```

Generate a secret: `openssl rand -base64 32`

### 2. Install Dependencies & Migrate

```bash
npm install
npx prisma migrate dev
```

### 3. Create a Client Admin User

First, get a company ID:

```bash
npx tsx scripts/listCompanies.ts
```

Then create a user for that company:

```bash
npx tsx scripts/createClientAdminUser.ts client@example.com changeme123 <companyId>
```

### 4. Set the Company to BYOK and API Key (Super Admin Only)

Billing tier and OpenAI API key are **admin-only**. Set them in the main admin (`/admin/companies`) under "Tier 1 BYOK". The client admin portal shows status and allows testing a key (not saving it).

## Portal Routes

| Route | Description |
|-------|-------------|
| `/client-admin/login` | Login page |
| `/client-admin` | Dashboard |
| `/client-admin/api-keys` | View BYOK status; test an API key (read-only for saving) |
| `/client-admin/content` | Product summary, website crawl, PDF upload |
| `/client-admin/embed` | Embed code and widget URLs |

## Field Ownership (Client vs Super Admin)

| Field / area | Client admin | Super admin |
|--------------|--------------|-------------|
| Product summary, short description, display name, website URL | ✓ Can edit | ✓ Can edit |
| Website sources, PDF uploads | ✓ Can add | ✓ Can add |
| Billing tier, OpenAI API key, slug, visuals, Tavus | Read-only / not shown | ✓ Only one who can set |
| Embed code | View/copy | View/copy |

## Features

1. **API Keys**
   - View current status (BYOK or platform key; whether key is configured)
   - Test an API key against required models (gpt-4o-mini, text-embedding-3-small, gpt-4o) — key is not saved
   - To change key or billing tier: contact your administrator (super admin sets it in Company Management)

2. **Content**
   - Product summary and short description (always used by AI)
   - Add website URL to crawl
   - Upload PDFs

3. **Embed Code**
   - Copy iframe for voice or text widget
   - Direct widget URLs

## Onboarding Flow (Internal)

When onboarding a new client who will use the self-service portal:

| Step | Who | Action |
|------|-----|--------|
| 1 | **You (super admin)** | Create the company in `/admin/companies` (slug, display name, short description, etc.) |
| 2 | **You** | Ask the customer for the email of one employee who will manage the AI SDR |
| 3 | **You** | Run: `npx tsx scripts/createClientAdminUser.ts <employee-email> <temp-password> <companyId>` |
| 4 | **You** | Send the employee their login URL, email, and temporary password (use a secure channel) |
| 5 | **Employee** | Logs in at `/client-admin/login` |
| 6 | **You** _or_ **Employee** | **You** set BYOK and the client’s OpenAI API key in `/admin/companies` (Tier 1 BYOK). Employee can test a key in API Keys before you set it. |
| 7 | **Employee** | In **Content**: adds product summary, company description, website URL to crawl, uploads PDFs |
| 8 | **Employee** | In **Embed Code**: copies the embed snippet for their website |

**Note:** Password change/reset flow is not yet implemented. Share the temporary password securely.
