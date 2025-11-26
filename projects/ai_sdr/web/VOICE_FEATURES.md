# Voice Interaction Features 🎤🔊

Your AI SDR chatbot now supports **voice input and output**!

## ✨ Features Added

### 1. **Speech-to-Text (Voice Input)** 🎤
- Click the microphone button to start speaking
- Your speech is converted to text in real-time
- Automatically stops after you finish speaking
- Works in English (can be configured for other languages)

### 2. **Text-to-Speech (Voice Output)** 🔊
- AI assistant can speak responses back to you
- Toggle voice ON/OFF with the speaker button
- Natural-sounding voice using browser's built-in TTS
- Stop button appears while AI is speaking

### 3. **Visual Indicators**
- **Red pulsing dot** = Listening to your voice
- **Blue pulsing dot** = AI is speaking
- **Microphone icon changes** when active
- **Stop button** appears when speaking

## 🎯 How to Use

### Voice Input:
1. Click the 🎤 microphone button
2. Speak your question (you'll see "Listening..." indicator)
3. The button pulses red while listening
4. Your speech appears as text in the input box
5. Click "Send" or just speak again

### Voice Output:
1. Toggle "🔊 Voice ON" at the top right
2. AI responses will be spoken automatically
3. Click "🔇 Stop" to interrupt the AI mid-speech
4. Toggle "🔇 Voice OFF" to disable voice responses

## 🌐 Browser Compatibility

### Speech-to-Text (Microphone):
✅ **Chrome** - Full support  
✅ **Edge** - Full support  
✅ **Safari** - Full support (macOS/iOS)  
❌ **Firefox** - Limited support  

### Text-to-Speech (Speaker):
✅ **All modern browsers** - Full support

## 🔧 Technical Details

### APIs Used:
- **Web Speech API (SpeechRecognition)** - For voice input
- **Web Speech API (SpeechSynthesis)** - For voice output
- Both are built into modern browsers (no API costs!)

### Configuration:
```typescript
// Speech Recognition Settings
- Language: "en-US"
- Continuous: false (stops after one utterance)
- Interim Results: false (only final results)

// Speech Synthesis Settings
- Rate: 1.0 (normal speed)
- Pitch: 1.0 (normal pitch)
- Volume: 1.0 (full volume)
```

## 🎨 UI Elements

### New Buttons:
1. **🎤 Microphone Button** 
   - Click to start/stop listening
   - Turns red and pulses when active
   - Shows "🎤 Stop" when recording

2. **🔊/🔇 Voice Toggle**
   - Top right corner
   - Enable/disable voice responses
   - Blue when ON, gray when OFF

3. **🔇 Stop Button** (conditional)
   - Only appears while AI is speaking
   - Orange color for visibility
   - Immediately stops speech

### Status Indicators:
- "Listening..." with red pulsing dot
- "Speaking..." with blue pulsing dot
- Input placeholder changes to "Listening..." when active

## 🚀 Usage Example

### Typical Voice Conversation:
```
User: [Clicks 🎤] "What is Hypersonix?"
      ↓
[Listening indicator shows]
      ↓
[Speech converted to text in input]
      ↓
[User clicks Send or continues speaking]
      ↓
AI: "Hypersonix is an AI-powered..." [Speaks response]
      ↓
[Speaking indicator shows]
      ↓
User: [Can click Stop to interrupt or wait for completion]
```

## ⚙️ Customization Options

### Change Voice Language:
Edit `src/components/WidgetChat.tsx`:
```typescript
recognitionRef.current.lang = "es-ES"; // Spanish
recognitionRef.current.lang = "fr-FR"; // French
recognitionRef.current.lang = "de-DE"; // German
```

### Change Voice Settings:
```typescript
utterance.rate = 1.2;   // Faster speech
utterance.pitch = 0.8;  // Lower pitch
utterance.volume = 0.7; // Quieter
```

### Enable Continuous Listening:
```typescript
recognitionRef.current.continuous = true;
```

## 🐛 Troubleshooting

### Microphone Not Working:
1. **Check browser permissions** - Allow microphone access
2. **Use HTTPS** - Some browsers require secure connection
3. **Try Chrome/Edge** - Best compatibility
4. **Check microphone** - Ensure it's connected and working

### Voice Output Issues:
1. **Check volume** - Ensure device volume is up
2. **Browser support** - TTS works in all modern browsers
3. **Toggle voice ON** - Check the voice button is enabled

### "Listening..." Stuck:
- Click the microphone button again to reset
- Refresh the page if needed
- Check browser console for errors

## 🔐 Privacy & Security

### Data Handling:
- **Speech-to-text**: Processed by browser (Chrome uses Google's servers)
- **Text-to-speech**: Processed locally by browser
- **No audio recording**: Audio is not stored or transmitted
- **Real-time processing**: Immediate conversion, no storage

### Permissions:
- **Microphone access**: Required for voice input
- **Browser prompt**: User must explicitly grant access
- **Can be revoked**: Permissions manageable in browser settings

## 📊 Performance

### Latency:
- **Speech recognition**: ~1-2 seconds delay
- **Text-to-speech**: Instant start
- **No impact**: On chat API or RAG performance

### Resource Usage:
- **Lightweight**: Uses browser APIs
- **No API costs**: Free built-in functionality
- **Low bandwidth**: No audio streaming needed

## 🎓 Best Practices

### For Users:
1. **Speak clearly** - Enunciate for best recognition
2. **Quiet environment** - Reduce background noise
3. **One question at a time** - More accurate results
4. **Pause between words** - Better recognition

### For Developers:
1. **Test on target browsers** - Especially Safari/Firefox
2. **Provide visual feedback** - Users need to know when mic is active
3. **Handle errors gracefully** - Show messages if mic access denied
4. **Make voice optional** - Not all users want voice interaction

## 🚀 Future Enhancements

Consider adding:
1. **OpenAI Whisper API** - More accurate speech recognition
2. **OpenAI TTS API** - Higher quality voice synthesis
3. **Voice commands** - "Stop", "Repeat", "Louder", etc.
4. **Multi-language** - Auto-detect and switch languages
5. **Voice profiles** - Different voices for different companies
6. **Wake word** - "Hey Assistant" to activate
7. **Audio history** - Replay previous responses

## 📝 Code Changes

### Files Modified:
- `src/components/WidgetChat.tsx` - Added voice interaction features

### New State Variables:
- `isListening` - Microphone active state
- `isSpeaking` - TTS active state
- `voiceEnabled` - User preference for voice output
- `recognitionRef` - Reference to SpeechRecognition instance

### New Functions:
- `startListening()` - Activate microphone
- `stopListening()` - Stop microphone
- `speakText(text)` - Speak AI response
- `stopSpeaking()` - Interrupt speech

## ✅ Ready to Use!

The voice features are now live! Just:
1. Visit `http://localhost:3000/widget/hypersonix`
2. Click the 🎤 microphone button
3. Ask a question by speaking
4. Hear the AI respond!

---

**Status**: ✅ Voice Interaction Features Complete  
**Browser Support**: Chrome, Edge, Safari recommended  
**No Additional Setup**: Works out of the box!

