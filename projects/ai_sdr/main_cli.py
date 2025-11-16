from typing import List, Dict, Any

from agent import generate_sdr_reply


def run_cli_chat() -> None:
    print("🤖 AI SDR ready. Type 'exit' or 'quit' to stop.\n")

    # This will store the full multi-turn conversation
    conversation: List[Dict[str, Any]] = []

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAI SDR: Talk soon! 👋")
            break

        if user_input.lower() in {"exit", "quit"}:
            print("AI SDR: Talk soon! 👋")
            break

        if not user_input:
            continue

        # Add user message to history
        conversation.append({"role": "user", "content": user_input})

        # Get SDR reply using the shared 'brain'
        reply = generate_sdr_reply(conversation)

        # Add assistant reply to history
        conversation.append({"role": "assistant", "content": reply})

        print(f"\nAI SDR: {reply}\n")


if __name__ == "__main__":
    run_cli_chat()
