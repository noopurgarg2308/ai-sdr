# Cost Monitoring & Management Guide 💰

## OpenAI Realtime API Costs

### Pricing Breakdown:
- **Audio Input**: $0.06 per minute
- **Audio Output**: $0.24 per minute
- **Text Input**: $5.00 per 1M tokens
- **Text Output**: $20.00 per 1M tokens

**Average conversation**: ~$0.30 per minute

### Example Costs:
| Usage | Cost |
|-------|------|
| 1 conversation (2 min) | $0.60 |
| 10 conversations (2 min avg) | $6.00 |
| 100 conversations | $60.00 |
| 1000 conversations | $600.00 |

## 🔍 Where to Monitor

### 1. OpenAI Platform Dashboard
**URL**: https://platform.openai.com/usage

Features:
- Daily usage breakdown
- Cost per API (Chat vs Realtime)
- Usage graphs and trends
- Export to CSV
- Billing history

### 2. Set Budget Limits
**URL**: https://platform.openai.com/account/limits

Set:
- **Soft Limit**: Email notification at threshold
- **Hard Limit**: API stops when reached
- **Monthly Budget**: Max spending per month

**Recommended Setup:**
```
Soft Limit: $50/month (get warned)
Hard Limit: $100/month (API stops)
```

### 3. Billing Settings
**URL**: https://platform.openai.com/account/billing/overview

- View current balance
- Set up auto-recharge
- Add payment methods
- View invoices
- Download receipts

## 📊 Track Usage in Your App

### Add Usage Logging

Create: `src/lib/usage-logger.ts`

```typescript
import { prisma } from "./prisma";

export async function logVoiceSession(data: {
  companyId: string;
  sessionId: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  estimatedCost: number;
}) {
  await prisma.voiceSession.create({
    data,
  });
}

export function calculateCost(durationSeconds: number): number {
  const minutes = durationSeconds / 60;
  const inputCost = minutes * 0.06;
  const outputCost = minutes * 0.24;
  return inputCost + outputCost;
}
```

### Add to Realtime Component

In `src/components/WidgetChatRealtime.tsx`:

```typescript
const [sessionStartTime, setSessionStartTime] = useState<Date>();

const startConversation = async () => {
  // ... existing code ...
  setSessionStartTime(new Date());
};

const stopConversation = () => {
  if (sessionStartTime) {
    const duration = (Date.now() - sessionStartTime.getTime()) / 1000;
    const cost = calculateCost(duration);
    
    console.log(`Session duration: ${duration}s, Estimated cost: $${cost.toFixed(2)}`);
    
    // Log to database
    logVoiceSession({
      companyId,
      sessionId,
      startTime: sessionStartTime,
      endTime: new Date(),
      durationSeconds: duration,
      estimatedCost: cost,
    });
  }
  
  // ... existing code ...
};
```

## 🚨 Cost Control Strategies

### 1. Session Time Limits
Limit conversation length:

```typescript
const MAX_SESSION_MINUTES = 5;

useEffect(() => {
  if (isRecording && sessionStartTime) {
    const timer = setTimeout(() => {
      stopConversation();
      alert("Session limit reached (5 minutes)");
    }, MAX_SESSION_MINUTES * 60 * 1000);
    
    return () => clearTimeout(timer);
  }
}, [isRecording, sessionStartTime]);
```

### 2. Usage Quotas per Company
Set limits per tenant:

```typescript
// In company config
{
  voiceQuota: {
    maxMinutesPerMonth: 100,
    currentUsage: 0,
  }
}

// Check before allowing voice
if (companyConfig.voiceQuota.currentUsage >= companyConfig.voiceQuota.maxMinutesPerMonth) {
  throw new Error("Voice quota exceeded for this month");
}
```

### 3. User Authentication & Limits
Require login for voice:

```typescript
// Only authenticated users can use voice
if (!user.isAuthenticated) {
  throw new Error("Please sign in to use voice features");
}

// Limit per user
if (user.voiceMinutesThisMonth >= 10) {
  throw new Error("You've reached your voice limit");
}
```

### 4. Progressive Pricing
Charge customers for voice access:

```typescript
const tiers = {
  free: { maxMinutes: 0, price: 0 },
  basic: { maxMinutes: 100, price: 29 },
  pro: { maxMinutes: 500, price: 99 },
  enterprise: { maxMinutes: -1, price: 299 }, // unlimited
};
```

## 📈 Analytics Dashboard

Create admin dashboard showing:

```
/admin/usage-analytics

Daily Stats:
- Total conversations today
- Total minutes used
- Estimated cost today
- Cost per conversation

Monthly Stats:
- Total spend this month
- Trend vs last month
- Most expensive companies
- Peak usage times

Alerts:
- 🟡 Warning: 80% of budget used
- 🔴 Critical: 95% of budget used
```

## ⚙️ Environment Variables for Cost Control

Add to `.env.local`:

```bash
# Cost controls
MAX_SESSION_DURATION_MINUTES=10
ENABLE_VOICE_FOR_FREE_TIER=false
MONTHLY_VOICE_BUDGET_USD=100
COST_PER_MINUTE=0.30

# Alerts
COST_ALERT_EMAIL=admin@yourcompany.com
COST_WARNING_THRESHOLD=80
COST_CRITICAL_THRESHOLD=95
```

## 🔔 Set Up Alerts

### Email Notifications

```typescript
// src/lib/alerts.ts
export async function checkBudgetAndAlert() {
  const monthlySpend = await getMonthlySpend();
  const budget = parseFloat(process.env.MONTHLY_VOICE_BUDGET_USD || "100");
  
  const percentUsed = (monthlySpend / budget) * 100;
  
  if (percentUsed >= 95) {
    await sendAlert("critical", `Voice API cost at ${percentUsed}%!`);
  } else if (percentUsed >= 80) {
    await sendAlert("warning", `Voice API cost at ${percentUsed}%`);
  }
}
```

### Slack Integration

```typescript
export async function sendSlackAlert(message: string) {
  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: "POST",
    body: JSON.stringify({ text: message }),
  });
}
```

## 💡 Cost Optimization Tips

### 1. Fallback to Text Chat
```typescript
// If cost threshold reached, disable voice
if (monthlySpend > budget) {
  return <WidgetChat companyId={companyId} />; // Text-only
}
```

### 2. Voice-on-Demand
Don't auto-connect. Make users explicitly choose voice:

```typescript
<button onClick={enableVoice}>
  Upgrade to Voice Chat ($0.30/min)
</button>
```

### 3. Compress Audio
Use lower quality when appropriate:
```typescript
sampleRate: 16000, // instead of 24000
```

### 4. Cache Responses
For common questions, use pre-generated audio:
```typescript
if (commonQuestions.includes(query)) {
  return cachedAudioResponse[query];
}
```

## 📊 OpenAI API Rate Limits

Besides cost, also monitor rate limits:

**Realtime API Limits (Tier 1)**:
- 100 requests per minute
- 20,000 tokens per minute
- 200 concurrent connections

Check: https://platform.openai.com/account/rate-limits

## 🎯 Recommended Monitoring Setup

### Daily:
- [ ] Check OpenAI dashboard usage
- [ ] Review estimated daily cost
- [ ] Check for anomalies

### Weekly:
- [ ] Review usage trends
- [ ] Identify high-cost companies
- [ ] Adjust limits if needed

### Monthly:
- [ ] Download usage report
- [ ] Review total spend vs budget
- [ ] Plan for next month

## 🚀 Production Checklist

Before going live:

- [ ] Set hard spending limit on OpenAI
- [ ] Implement session time limits
- [ ] Add usage logging to database
- [ ] Set up cost alert emails
- [ ] Create admin analytics dashboard
- [ ] Test quota enforcement
- [ ] Document pricing for customers
- [ ] Add "cost so far" indicator in UI
- [ ] Implement graceful degradation (voice → text)
- [ ] Monitor for first week closely

## 📞 Support Contacts

**OpenAI Support**:
- Email: support@openai.com
- Help Center: https://help.openai.com
- Status Page: https://status.openai.com

**For Billing Issues**:
- Billing Support: https://platform.openai.com/account/billing

---

**Remember**: Realtime API is premium pricing. Monitor closely, set limits, and consider charging users for access! 💰

