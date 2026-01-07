# Tavus CVI Status Check

## Implementation Status

### ✅ What's Implemented

1. **Tavus Client Library** (`src/lib/tavus.ts`)
   - ✅ TavusClient class with API methods
   - ✅ Knowledge base search (document listing)
   - ✅ CVI session creation
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
   ```typescript
   // Via Prisma Studio or API
   await prisma.company.update({
     where: { slug: "your-company" },
     data: {
       useTavusVideo: true,
       tavusReplicaId: "your-replica-id",
       tavusPersonaId: "your-persona-id", // Optional
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

4. **"Daily.co connection error"**
   - Verify WebSocket URL format
   - Check network/firewall settings
   - Review Daily.co documentation

5. **No video stream**
   - Check Daily.co iframe is loading
   - Verify room URL is correct
   - Review browser console for errors

### 📝 Notes

- Tavus uses Daily.co for video streaming
- Function calls are handled via HTTP callbacks (not WebSocket)
- The `handleTavusMessage` function is set up but may need adjustment based on actual Tavus event format
- Daily.co events (`custom-event`, `app-message`) are listened to for Tavus messages

### 🔗 Resources

- [Tavus Documentation](https://docs.tavus.io)
- [Daily.co Documentation](https://docs.daily.co)
- [Tavus CVI Overview](https://docs.tavus.io/sections/conversational-video-interface/overview-cvi)
