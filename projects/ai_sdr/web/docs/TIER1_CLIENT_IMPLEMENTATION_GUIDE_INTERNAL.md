# Tier 1 Client Implementation Guide — Internal

This document describes the steps required to onboard a Tier 1 (BYOK) client. **Internal use only.**

---

## Onboarding Flow Overview

| Step | Who | Action |
|------|-----|--------|
| 1 | **You (super admin)** | Create the company in `/admin/companies` (slug, display name, short description, etc.) |
| 2 | **You** | Ask the customer for the email of one employee who will manage the AI SDR |
| 3 | **You** | In **Create Client Admin User** (top of `/admin/companies`): select company, enter email and password, click Create. Or run `npx tsx scripts/createClientAdminUser.ts <email> <password> <companyId>` |
| 4 | **You** | Send the employee: portal URL, their email, and temporary password (use a secure channel) |
| 5 | **Employee** | Logs in at `/client-admin/login` |
| 6 | **You** | Set BYOK and the client’s OpenAI API key in admin (Tier 1 BYOK section). Employee can test a key in API Keys before you set it. |
| 7 | **Employee** | In **Content**: adds product summary, company description, website URL to crawl, uploads PDFs |
| 8 | **Employee** | In **Embed Code**: copies the embed snippet for their website |

**Note:** Password change/reset flow is not yet implemented. For now, share the temporary password securely and advise the employee to keep it safe.

---

## Prerequisites

- Access to the Admin UI (`/admin/companies`)
- Client’s OpenAI API key (obtained securely)
- Company already created in the system (or create during onboarding)

---

## Step 1: Create or Locate the Company

1. Go to **Admin → Companies** (`/admin/companies`).
2. If the company does not exist:
   - Fill in the **Create New Company** form (slug, display name, short description, etc.).
   - Click **Create Company**.
3. If the company exists, locate it in the **Existing Companies** list.

---

## Step 2: Configure BYOK (Bring Your Own Key)

1. Find the company in the list.
2. Expand **"Tier 1 BYOK (Bring Your Own Key)"** by clicking the section header.
3. Set **Billing Tier** to **"BYOK (Bring Your Own Key)"**.
4. Enter the client’s **OpenAI API key** in the password field.
   - The key should start with `sk-`.
   - Leave blank if updating other settings and the key is already configured.
5. Click **Save BYOK Settings**.
6. Confirm the success message and that the badge shows **"Configured"** when the key is set.

---

## Step 3: Verify the Widget Works

1. Click **Open Widget** (or **Chat**) for the company.
2. Test in the widget:
   - **Text mode:** Send a message. Ensure you get a reply.
   - **Voice mode:** If enabled, start a voice conversation and confirm it connects.
3. If errors appear:
   - **"OpenAI API key is required for this account (Tier 1 BYOK)"** — The key was not saved or billing tier is BYOK but key is missing. Re-enter the key and save.
   - **"Invalid API key"** or **"Incorrect API key"** — The key may be wrong, revoked, or expired. Ask the client to regenerate and provide a new key.
   - **"Model not found"** or **"You do not have access"** — The client’s OpenAI account may lack access to the required models. Refer them to [Tier 1 Client Requirements](TIER1_CLIENT_REQUIREMENTS.md).

---

## Step 4: Configure Optional Features (If Applicable)

### Knowledge Base (PDFs, Websites)

- If the client will use PDFs or website content:
  - Go to **Admin → Companies → [Company] → Media**.
  - Upload PDFs or add website sources.
  - Ensure the client’s key has access to `text-embedding-3-small` and `gpt-4o` (for PDFs with images).

### Voice Mode

- No extra BYOK config needed for voice. The same OpenAI key is used for Realtime.

### Video Avatar (Tavus)

- If the client uses Tavus video avatar:
  - Configure **Tavus Video Avatar** in the company’s Tavus section.
  - A Tavus API key may be required separately (client or platform).

### Visuals (Images, Demos, Videos)

- Enable **"Show images, demos & videos"** in the company settings if the client will use visual content.

---

## Step 5: Share Embed Code and Access

1. Copy the **Embed Code** from the company card.
2. Provide the client with:
   - The embed code (iframe snippet)
   - Widget URL: `https://your-domain.com/widget/[slug]` (text) or `https://your-domain.com/widget-text/[slug]`
   - Any access instructions (e.g., login if behind auth)

---

## Alternative: Client Self-Service Portal

If the client will use the **Client Admin Portal**:

1. **You** create the company (Step 1 above).
2. **You** create a client admin user: `npx tsx scripts/createClientAdminUser.ts <employee-email> <temp-password> <companyId>`
3. **You** send the employee the portal URL, email, and password.
4. **Employee** logs in and does Steps 6–8 from the flow overview (API keys, content, embed code) themselves.

See [Client Admin Portal](CLIENT_ADMIN_PORTAL.md) for portal setup and routes.

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| Key not saving | Ensure Billing Tier is set to BYOK before saving. Re-enter the key and click Save again. |
| Widget shows "API key not configured" | Re-check BYOK settings. Ensure the key is entered and saved. The system does not fall back to the platform key for BYOK clients. |
| Invalid key errors | Client should verify the key at platform.openai.com, ensure it’s not revoked, and has a payment method. |
| Model access errors | Client needs the required models enabled. See [Tier 1 Client Requirements](TIER1_CLIENT_REQUIREMENTS.md). |
| Voice not working | Same key is used for Realtime. Confirm the key has access to `gpt-realtime-1.5` (or `OPENAI_REALTIME_MODEL`). |

---

## Security Notes

- **Never** share or log full API keys.
- Admin UI masks keys as `sk-...****` in responses.
- Keys are stored in the database; ensure DB access is restricted.
- Advise clients to rotate keys if they suspect exposure.
- **No fallback to platform key:** For Tier 1 (BYOK) clients, the system never uses the platform's OpenAI API key when the BYOK field is empty. The request fails with an error instead. This ensures no client traffic is billed to the platform.

---

## Quick Reference

| Item | Location |
|------|----------|
| Admin Companies | `/admin/companies` |
| Client Admin Portal | `/client-admin/login` |
| BYOK section | Per company, expand "Tier 1 BYOK" |
| Company Media | `/admin/companies/[id]/media` |
| Widget (voice) | `/widget/[slug]` |
| Widget (text) | `/widget-text/[slug]` |
| Create user | Admin portal: **Create Client Admin User** form at top of `/admin/companies` |
| Create user script | `npx tsx scripts/createClientAdminUser.ts <email> <password> <companyId>` |
| List companies | `npx tsx scripts/listCompanies.ts` |