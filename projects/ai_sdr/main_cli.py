from typing import List, Dict, Any

from agent import generate_sdr_reply, analyze_lead


def print_lead_summary(conversation: List[Dict[str, Any]]) -> None:
    if not conversation:
        print("\n(no conversation yet to analyze)\n")
        return

    summary = analyze_lead(conversation)

    print("\n📊 Lead Summary")
    print("----------------")
    for key, value in summary.items():
        print(f"{key}: {value}")
    print("")


def run_cli_chat() -> None:
    print("🤖 AI SDR ready. Type 'exit' or 'quit' to stop.")
    print("Type 'summary' to see a structured lead analysis.\n")

    conversation: List[Dict[str, Any]] = []

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAI SDR: Talk soon! 👋")
            break

        if not user_input:
            continue

        lowered = user_input.lower()
        if lowered in {"exit", "quit"}:
            print("AI SDR: Talk soon! 👋")
            break

        if lowered == "summary":
            print_lead_summary(conversation)
            continue

        # Normal chat flow
        conversation.append({"role": "user", "content": user_input})
        reply = generate_sdr_reply(conversation)
        conversation.append({"role": "assistant", "content": reply})

        print(f"\nAI SDR: {reply}\n")


if __name__ == "__main__":
    run_cli_chat()
