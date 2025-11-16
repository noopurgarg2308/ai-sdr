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
- The product helps sales teams become more productive, book more qualified meetings,
  and close deals faster.
- It connects to common tools like Salesforce, HubSpot, Outreach, and Gong.

Goals:
- Greet visitors in a friendly, professional way.
- Ask 1–2 smart questions to understand:
  - Their role
  - Their company type/size
  - Their main pain point
  - How urgent the problem is
- Explain the product clearly and concretely (no vague buzzwords).
- Qualify the lead (budget, authority, need, timeline) when appropriate.
- Suggest a clear next step: e.g. "Do you want to book a demo?" or "Can I get your email?"

Style:
- Short, clear answers. No long walls of text.
- Ask only ONE question per message, unless you’re just clarifying.
- Don’t be pushy, but don’t be shy either.
"""

def generate_sdr_reply(
    conversation: List[Dict[str, Any]],
    model: str = "gpt-4.1-mini",
) -> str:
    """
    Core SDR 'brain'.

    conversation: a list of messages like:
        { "role": "user" | "assistant", "content": "..." }

    Returns:
        The next assistant message as a string.

    This function is intentionally decoupled from any UI so we can reuse it
    later in a web API, widget, or other interface without rewriting.
    """

    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *conversation,
    ]

    response = client.chat.completions.create(
        model=model,
        messages=messages,
    )

    return response.choices[0].message.content
