import os
from openai import OpenAI
from dotenv import load_dotenv

# Load the .env file explicitly from ~/openai-dev
load_dotenv(os.path.expanduser("~/openai-dev/.env"))

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("⚠️ OPENAI_API_KEY not found in .env")

client = OpenAI(api_key=api_key)

response = client.chat.completions.create(
    model="gpt-4.1-mini",
    messages=[
        {"role": "user", "content": "Hello from Sandeep’s new 48GB Mac!"}
    ],
)

print(response.choices[0].message.content)

