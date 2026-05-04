from django.urls import path

from modules.chatbot.presentation.api.v1.views import ChatbotApi

urlpatterns = [
    path("chatbot/", ChatbotApi.as_view(), name="chatbot"),
]
