import os
from typing import List, Dict, Any

from dotenv import load_dotenv
from openai import OpenAI

# Load API key from your main .env file
load_dotenv(os.path.expanduser("~/openai-dev/.env"))

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("OPENAI_API_KEY not found in ~/openai-dev/.env")

client = OpenAI(api_key=api_key)

SYSTEM_PROMPT = """
You are an AI SDR (Sales Development Representative) for a B2B SaaS product.

Assume:
- The product helps sales teams book more qualified meetings and close deals faster.
- It connects to Salesforce, HubSpot, Outreach, and Gong.
- It gives reps better guidance, better messaging, and better follow-ups.

Goals:
- Greet visitors in a friendly, professional way.
- Ask 1–2 smart questions to understand:
  - Their role
  - Their company type/size
  - Their main sales or pipeline pain
  - How urgent the problem is
- Explain the product clearly and concretely (no vague buzzwords).
- Qualify the lead (budget, authority, need, timeline) when appropriate.
- Suggest a clear next step (book demo, schedule call, or collect email).

Style:
- Short, clear answers. No long walls of text.
- Ask only ONE question per message, unless you’re clarifying.
- Don’t be pushy, but don’t be shy either.
"""


def generate_sdr_reply(
    conversation: List[Dict[str, Any]],
    model: str = "gpt-4.1-mini",
) -> str:
    """Return the next SDR reply as plain text."""
    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *conversation,
    ]

    response = client.chat.completions.create(
        model=model,
        messages=messages,
    )

    return response.choices[0].message.content


def analyze_lead(
    conversation: List[Dict[str, Any]],
    model: str = "gpt-4.1-mini",
) -> Dict[str, Any]:
    """
    Analyze the conversation and extract structured lead qualification info.

    Returns a dict like:
    {
        "role": "...",
        "company_type": "...",
        "company_size": "...",
        "main_pain": "...",
        "urgency": "...",
        "budget_likelihood": "...",
        "is_qualified": true/false,
        "reasoning": "..."
    }
    """

    convo_text = "\n".join(
        f"{m['role'].upper()}: {m['content']}"
        for m in conversation
    )

    analysis_prompt = f"""
Given the following conversation between an AI SDR and a website visitor,
extract structured lead qualification information.

Conversation:
{convo_text}

Respond ONLY in valid JSON with the following keys:
- role: string (the visitor's role, or "unknown")
- company_type: string (e.g. "B2B SaaS", "manufacturing", "unknown")
- company_size: string (e.g. "1-10", "11-50", "51-200", "201-1000", "1000+", or "unknown")
- main_pain: string (short summary of the main problem)
- urgency: string ("high", "medium", "low", or "unknown")
- budget_likelihood: string ("high", "medium", "low", or "unknown")
- is_qualified: boolean (true/false)
- reasoning: short string explaining why you marked is_qualified that way
"""

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You output ONLY JSON. No prose."},
            {"role": "user", "content": analysis_prompt},
        ],
        response_format={"type": "json_object"},
    )

    import json
    content = response.choices[0].message.content
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        data = {"raw": content}

    return data
