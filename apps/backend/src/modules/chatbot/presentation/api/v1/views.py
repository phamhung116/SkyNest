from __future__ import annotations

import json

from rest_framework import serializers, status
from rest_framework.views import APIView

from modules.chatbot.services import ChatbotMessage, HTTPError, URLError, generate_chatbot_reply
from shared.responses import error, success
from shared.throttling import AccountScopedRateThrottle

SUPPORTED_LOCALES = ("vi", "en")
MAX_MESSAGES = 12
MAX_MESSAGE_LENGTH = 2000
MAX_TOTAL_CHARACTERS = 12000


class ChatbotConversationMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=("user", "assistant"))
    content = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=MAX_MESSAGE_LENGTH)


class ChatbotRequestSerializer(serializers.Serializer):
    messages = ChatbotConversationMessageSerializer(many=True, allow_empty=False, max_length=MAX_MESSAGES)
    locale = serializers.ChoiceField(choices=SUPPORTED_LOCALES, default="vi", required=False)
    page = serializers.CharField(required=False, allow_blank=True, max_length=200)

    def validate_messages(self, messages):
        total_characters = sum(len(str(item.get("content", "")).strip()) for item in messages)
        if total_characters > MAX_TOTAL_CHARACTERS:
            raise serializers.ValidationError("Conversation is too long.")
        if messages[-1]["role"] != "user":
            raise serializers.ValidationError("The latest chatbot message must come from the user.")
        return messages


class ChatbotApi(APIView):
    authentication_classes: list = []
    permission_classes: list = []
    throttle_classes = [AccountScopedRateThrottle]
    throttle_scope = "chatbot"

    def post(self, request):
        serializer = ChatbotRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        messages = [
            ChatbotMessage(role=str(item["role"]), content=str(item["content"]).strip())
            for item in payload["messages"]
        ]

        try:
            result = generate_chatbot_reply(
                messages=messages,
                locale=str(payload.get("locale", "vi")),
                page=str(payload.get("page", "")).strip() or None,
            )
            return success(result)
        except RuntimeError as exc:
            return error(str(exc), status.HTTP_503_SERVICE_UNAVAILABLE)
        except HTTPError as exc:
            if exc.code in {401, 403}:
                return error("OpenAI authentication failed.", status.HTTP_503_SERVICE_UNAVAILABLE)
            if exc.code == 429:
                return error("Chatbot is busy. Please try again in a moment.", status.HTTP_503_SERVICE_UNAVAILABLE)
            return error("OpenAI service is unavailable. Please try again later.", status.HTTP_502_BAD_GATEWAY)
        except (URLError, TimeoutError, json.JSONDecodeError):
            return error("OpenAI service is unavailable. Please try again later.", status.HTTP_502_BAD_GATEWAY)
