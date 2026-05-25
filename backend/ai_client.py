import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

# LLM_PROVIDER controls which backend is used:
#   "anthropic"           — direct Anthropic API (uses ANTHROPIC_API_KEY)
#   "openai"              — direct OpenAI API   (uses OPENAI_API_KEY)
#   "sap_hyperspace"      — Anthropic Claude via SAP Hyperspace proxy (uses ANTHROPIC_AUTH_TOKEN + ANTHROPIC_BASE_URL)
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "sap_hyperspace")

MODEL = os.getenv("LLM_MODEL_DEFAULT", os.getenv("ANTHROPIC_MODEL_DEFAULT", "claude-sonnet-4-5"))


def _make_anthropic_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def _make_sap_client() -> anthropic.Anthropic:
    # SAP Hyperspace requires Authorization: Bearer, which only auth_token= produces.
    # Using api_key= would send x-api-key and get HTTP 401.
    return anthropic.Anthropic(
        auth_token=os.getenv("ANTHROPIC_AUTH_TOKEN"),
        base_url=os.getenv("ANTHROPIC_BASE_URL", "http://localhost:6655/anthropic/"),
    )


def call_llm(system: str, user: str, max_tokens: int = 4096) -> str:
    if LLM_PROVIDER == "openai":
        return _call_openai(system, user, max_tokens)
    elif LLM_PROVIDER == "anthropic":
        return _call_anthropic(_make_anthropic_client(), system, user, max_tokens)
    else:
        return _call_anthropic(_make_sap_client(), system, user, max_tokens)


def _call_anthropic(client: anthropic.Anthropic, system: str, user: str, max_tokens: int) -> str:
    msg = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return msg.content[0].text


def _call_openai(system: str, user: str, max_tokens: int) -> str:
    try:
        from openai import OpenAI
    except ImportError as e:
        raise RuntimeError("openai package is required for LLM_PROVIDER=openai. Run: pip install openai") from e

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return response.choices[0].message.content


# Keep the old name as an alias so existing routers don't need changes.
call_claude = call_llm
