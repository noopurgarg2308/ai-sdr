# Tavus CVI Status Check

## What is a Tavus Persona?

A **Tavus Persona** is the “brain” of the video avatar for CVI (Conversational Video Interface). It defines:

- **System prompt** – How the avatar should behave and what it should prioritize (e.g. “always use search_knowledge for company questions”).
- **LLM tools** – Which functions the avatar can call (e.g. `search_knowledge`, `show_visual`, `create_meeting_link`, `log_lead`). When the LLM decides to call a tool, Tavus sends a **tool call** to your `callback_url`; your app runs the tool (e.g. RAG) and returns the result.
- **Pipeline mode** – e.g. `full` (see, hear, speak, use tools).

**Replica** = face/voice (the video avatar). **Persona** = instructions + tools (the brain). The same replica can be used with different personas.

---

## How Persona is Configured and Used in Our Application

### Where it’s stored

Each **Company** in our DB can have:

- `tavusReplicaId` – which avatar (face/voice) to use
- `tavusPersonaId` – which persona (instructions + tools) to use

### How we create it (no manual Tavus setup per customer)

We **don’t** require you to create a Persona in the Tavus dashboard for each customer. Our code creates it when needed:

1. User starts a **Video Chat** for a company (e.g. Hypersonix).
2. **Session API** (`POST /api/tavus/session`) runs:
   - Loads company (including `tavusReplicaId`, `tavusPersonaId`).
   - Builds a **company-specific system prompt** (e.g. “You are Hypersonix’s SDR; always use search_knowledge for Hypersonix products/pricing…”).
   - **If `tavusPersonaId` is null:** calls Tavus **Create Persona** with that system prompt and our tool definitions (`search_knowledge`, etc.), then **saves the returned `persona_id`** into `Company.tavusPersonaId`.
   - **If `tavusPersonaId` is already set:** we skip creation and use that persona.
3. We then **Create Conversation** with `replica_id`, `persona_id`, and `callback_url` so the avatar uses our RAG and tool calls hit our backend.

### How the callback fits in

When the avatar decides to call a tool (e.g. `search_knowledge`), Tavus sends a **conversation.tool_call** event to our `callback_url` with `companyId` (from the URL), tool name, and arguments. We run the tool (e.g. RAG) and return the result.

---

## One Persona Per Customer?

**Yes.** In our application:

- **One customer (Company)** = one row in `Company`.
- For that company to use the **video avatar with RAG** we need:
  - **One** `tavusReplicaId` (which avatar)
  - **One** `tavusPersonaId` (which “brain” with instructions + tools)

So **per customer that uses the video chat, we have one `tavusPersonaId` in the DB.** We create it automatically on first “Start Video Chat” if it’s missing, and reuse it for all future sessions for that company.

---

## Implementation Status

### ✅ What's Implemented

1. **Tavus Client Library** (`src/lib/tavus.ts`)
   - ✅ TavusClient class with API methods
   - ✅ `createPersona()` – create persona with system prompt + LLM tools (for RAG)
   - ✅ Knowledge base search (document listing)
   - ✅ CVI session creation (with persona_id + callback_url)
   - ✅ Replica management
   - ✅ Document management

2. **API Endpoints**
   - ✅ `POST /api/tavus/session` - Create CVI session
   - ✅ `POST /api/tavus/callback` - Handle function call callbacks
   - ✅ `POST /api/tavus/tool` - Execute tools from Tavus

3. **Frontend Components**
   - ✅ `WidgetChatTavus.tsx` - Video avatar widget
   - ✅ `WidgetChatUnified.tsx` - Mode selector with Tavus option
   - ✅ Daily.co integration for video display

4. **Database Schema**
   - ✅ Tavus fields in Company model:
     - `tavusReplicaId`
     - `tavusPersonaId`
     - `useTavusVideo`
     - `useTavusKB`
     - `searchStrategy`
     - `tavusKBWeight`
   - `useTextChat` (text mode; off by default; when false, widget shows only realtime voice)

5. **Integration**
   - ✅ Hybrid search with Tavus KB
   - ✅ Function calling support
   - ✅ System prompt integration

### ⚠️ Known Issues

1. **Missing WebSocket Reference**
   - **Fixed**: Removed `wsRef` reference (function calls use HTTP callbacks)

2. **Video Container Type**
   - **Fixed**: Changed `videoRef` from `HTMLVideoElement` to `HTMLDivElement` (Daily.co needs container)

3. **Event Handling**
   - **Status**: Daily.co events are set up, but Tavus-specific events may need adjustment
   - Tavus sends events through Daily.co, but exact format may vary

4. **API Key Configuration**
   - **Status**: Requires `TAVUS_API_KEY` in `.env.local`
   - Test script created to verify configuration

### 🔧 How to Test

1. **Check Configuration:**
   ```bash
   npx tsx scripts/testTavusCVI.ts
   ```

2. **Enable Tavus for a Company:**
   - Set `useTavusVideo: true` and `tavusReplicaId` (required).
   - `tavusPersonaId` is **optional**: if null, the session API creates a persona on first “Start Video Chat” and saves it. You can also set it manually if you created a persona in Tavus.
   ```typescript
   await prisma.company.update({
     where: { slug: "your-company" },
     data: {
       useTavusVideo: true,
       tavusReplicaId: "your-replica-id",
       tavusPersonaId: null, // optional; auto-created on first video chat if null
     },
   });
   ```

3. **Test in Browser:**
   - Navigate to `/widget/[company-slug]`
   - Select "Video Avatar" mode
   - Click "Start Video Chat"
   - Check browser console for errors

### 📋 Testing Checklist

- [ ] TAVUS_API_KEY is set in `.env.local`
- [ ] Company has `useTavusVideo: true`
- [ ] Company has valid `tavusReplicaId`
- [ ] Session creation API works (`POST /api/tavus/session`)
- [ ] Daily.co iframe loads
- [ ] Video avatar appears
- [ ] Function calls work (via callback endpoint)
- [ ] Transcripts appear in chat

### 🐛 Common Issues

1. **"Tavus API key not configured"**
   - Add `TAVUS_API_KEY=your-key` to `.env.local`
   - Restart dev server

2. **"Tavus video not enabled for this company"**
   - Set `useTavusVideo: true` for the company
   - Ensure `tavusReplicaId` is set

3. **"Failed to create Tavus session"**
   - Check replica ID is valid
   - Verify API key has access
   - Check Tavus API endpoint format

4. **"Tavus API error: 402" or "Video chat is unavailable... usage limit"**
   - **402 = Payment Required.** Your Tavus account may have hit a billing or usage limit (e.g. CVI minutes).
   - Log in at [platform.tavus.io](https://platform.tavus.io) → Billing / Usage and add payment or upgrade.
   - The app now shows a clearer message when this happens.

5. **"Daily.co connection error"**
   - Verify WebSocket URL format
   - Check network/firewall settings
   - Review Daily.co documentation

6. **No video stream**
   - Check Daily.co iframe is loading
   - Verify room URL is correct
   - Review browser console for errors

7. **Avatar not listening / not hearing you**
   - **Allow microphone** when the browser prompts (first time you join, or after clicking "Start Video Chat").
   - If you previously blocked the site: click the lock/site icon in the address bar → Site settings → Microphone → Allow, then refresh and try again.
   - Use **Chrome or Edge** for best compatibility; Safari may require HTTPS for mic access.
   - Ensure no other app is exclusively using the microphone.
   - The in-widget tip (when connected) reminds you to allow microphone if the avatar doesn’t respond.

### 📝 Notes

- Tavus uses Daily.co for video streaming
- Function calls are handled via HTTP callbacks (not WebSocket); we parse `event_type: "conversation.tool_call"` and `properties.name` / `properties.arguments`
- One Tavus Persona per company (customer): created automatically on first video chat if `tavusPersonaId` is null, then reused
- The `handleTavusMessage` function is set up but may need adjustment based on actual Tavus event format
- Daily.co events (`custom-event`, `app-message`) are listened to for Tavus messages

### 🔗 Resources

- [Tavus Documentation](https://docs.tavus.io)
- [Daily.co Documentation](https://docs.daily.co)
- [Tavus CVI Overview](https://docs.tavus.io/sections/conversational-video-interface/overview-cvi)
