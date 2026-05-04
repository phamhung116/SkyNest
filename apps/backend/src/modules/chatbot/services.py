from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

from config.containers import list_service_packages_use_case


@dataclass(frozen=True, slots=True)
class ChatbotMessage:
    role: str
    content: str


def _localized_text(vi_text: str, en_text: str, locale: str) -> str:
    if locale == "en" and en_text.strip():
        return en_text.strip()
    return vi_text.strip()


def _format_price(value: object) -> str:
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return str(value)

    formatted = f"{amount:,.0f}".replace(",", ".")
    return f"{formatted} VND"


def _build_services_context(locale: str) -> str:
    try:
        packages = list_service_packages_use_case().execute(active_only=True)
    except Exception:
        return ""

    if not packages:
        return ""

    lines = ["Available service packages:" if locale == "en" else "Các gói dịch vụ hiện có:"]
    for package in packages[:8]:
        package_name = _localized_text(package.name, package.name_en, locale)
        short_description = _localized_text(package.short_description, package.short_description_en, locale)
        feature_names = [
            _localized_text(feature.name, feature.name_en, locale)
            for feature in package.included_features[:4]
            if _localized_text(feature.name, feature.name_en, locale)
        ]
        feature_text = ", ".join(feature_names)
        summary = (
            f"- {package_name}: {short_description}. Price: {_format_price(package.price)}."
            if locale == "en"
            else f"- {package_name}: {short_description}. Giá: {_format_price(package.price)}."
        )
        if feature_text:
            summary = (
                f"{summary} Includes: {feature_text}."
                if locale == "en"
                else f"{summary} Bao gồm: {feature_text}."
            )
        lines.append(summary)
    return "\n".join(lines)


def _build_instructions(locale: str, page: str | None) -> str:
    business = settings.BUSINESS_INFO
    services_context = _build_services_context(locale)
    response_language = "Answer in natural English." if locale == "en" else "Trả lời bằng tiếng Việt tự nhiên."
    page_context = ""
    if page:
        page_context = (
            f"\nThe user is currently browsing this page: {page}."
            if locale == "en"
            else f"\nNgười dùng hiện đang ở trang: {page}."
        )

    prompt_override = settings.OPENAI_CHATBOT_SYSTEM_PROMPT.strip()
    prompt_suffix = f"\n\nAdditional instructions:\n{prompt_override}" if prompt_override else ""

    return (
        f"You are the customer support chatbot for {business['name']}."
        "\nHelp visitors with services, booking flow, flight preparation, contact information, payment basics, and tracking."
        f"\n{response_language}"
        "\nRules:"
        "\n- Be concise, helpful, and factual."
        "\n- Use plain text only. Do not output HTML."
        "\n- If information is missing or uncertain, say so clearly and suggest contacting the team."
        "\n- Do not invent prices, schedules, weather guarantees, or safety claims."
        "\n- If the user wants to book, guide them to choose a package, pick a date and time, and complete the booking on the website."
        f"\nBusiness name: {business['name']}"
        f"\nPhone: {business['phone']}"
        f"\nEmail: {business['email']}"
        f"\nAddress: {business['address']}"
        f"\nWebsite: {settings.CUSTOMER_WEB_URL}"
        f"{page_context}"
        f"\n\n{services_context}"
        f"{prompt_suffix}"
    )


def _extract_output_text(payload: dict[str, object]) -> str:
    output_text = str(payload.get("output_text") or "").strip()
    if output_text:
        return output_text

    collected: list[str] = []
    for item in payload.get("output", []) or []:
        if not isinstance(item, dict):
            continue
        for content_item in item.get("content", []) or []:
            if not isinstance(content_item, dict):
                continue
            text = content_item.get("text")
            if isinstance(text, str) and text.strip():
                collected.append(text.strip())

    return "\n".join(collected).strip()


def generate_chatbot_reply(*, messages: list[ChatbotMessage], locale: str = "vi", page: str | None = None) -> dict[str, str | None]:
    api_key = settings.OPENAI_API_KEY.strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    response_input = [{"role": message.role, "content": message.content} for message in messages]
    body = json.dumps(
        {
            "model": settings.OPENAI_CHATBOT_MODEL,
            "instructions": _build_instructions(locale, page),
            "input": response_input,
        }
    ).encode("utf-8")

    request = Request(
        settings.OPENAI_CHATBOT_ENDPOINT,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "DanangParagliding/1.0",
        },
        method="POST",
    )

    timeout_seconds = max(5, int(settings.OPENAI_CHATBOT_TIMEOUT_SECONDS))
    with urlopen(request, timeout=timeout_seconds) as response:
        payload = json.loads(response.read().decode("utf-8"))

    reply = _extract_output_text(payload)
    if not reply:
        raise RuntimeError("OpenAI returned an empty chatbot response.")

    return {
        "id": str(payload.get("id") or ""),
        "reply": reply,
        "model": str(payload.get("model") or settings.OPENAI_CHATBOT_MODEL),
    }


__all__ = ["ChatbotMessage", "HTTPError", "URLError", "generate_chatbot_reply"]
