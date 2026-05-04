import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@paragliding/api-client";
import { Loader2, MessageCircle, SendHorizonal, X } from "lucide-react";
import { customerApi } from "@/shared/config/api";
import { useI18n } from "@/shared/providers/i18n-provider";

type UiMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  sendToApi: boolean;
  tone?: "normal" | "error";
  kind?: "welcome" | "message";
};

const CHAT_HISTORY_LIMIT = 10;

const buildCopy = (locale: "vi" | "en") =>
  locale === "en"
    ? {
        open: "Open chatbot",
        close: "Close chatbot",
        title: "AI Assistant",
        subtitle: "Ask about services, booking, tracking, or contact details.",
        welcome:
          "Hello. I can help with service packages, booking steps, tracking, payment basics, and contact information.",
        placeholder: "Type your question...",
        send: "Send",
        busy: "The assistant is replying...",
        fallbackError: "The chatbot is temporarily unavailable. Please try again in a moment.",
        quickPrompts: [
          "Which service packages do you have?",
          "How do I book a flight?",
          "How can I contact your team?"
        ]
      }
    : {
        open: "Mở chatbot",
        close: "Đóng chatbot",
        title: "Trợ lý AI",
        subtitle: "Hỏi về gói dịch vụ, đặt lịch, tra cứu hoặc thông tin liên hệ.",
        welcome:
          "Xin chào. Tôi có thể hỗ trợ về gói dịch vụ, cách đặt lịch, tra cứu đơn, thanh toán cơ bản và thông tin liên hệ.",
        placeholder: "Nhập câu hỏi của bạn...",
        send: "Gửi",
        busy: "Trợ lý đang trả lời...",
        fallbackError: "Chatbot đang tạm bận. Bạn thử lại sau ít phút.",
        quickPrompts: [
          "Hiện có những gói dịch vụ nào?",
          "Cách đặt lịch bay như thế nào?",
          "Liên hệ đội ngũ bằng cách nào?"
        ]
      };

export const ChatbotWidget = () => {
  const { locale } = useI18n();
  const copy = useMemo(() => buildCopy(locale), [locale]);
  const sequenceRef = useRef(0);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: copy.welcome,
      sendToApi: false,
      kind: "welcome",
    }
  ]);

  useEffect(() => {
    setMessages((current) => {
      const hasConversation = current.some((message) => message.sendToApi);
      if (hasConversation) {
        return current;
      }

      return [
        {
          id: "welcome",
          role: "assistant",
          content: copy.welcome,
          sendToApi: false,
          kind: "welcome",
        }
      ];
    });
  }, [copy.welcome]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, [isOpen, messages, isSending]);

  const createMessage = (
    role: UiMessage["role"],
    content: string,
    options?: Partial<Pick<UiMessage, "sendToApi" | "tone" | "kind">>
  ): UiMessage => {
    sequenceRef.current += 1;
    return {
      id: `chatbot-${sequenceRef.current}`,
      role,
      content,
      sendToApi: options?.sendToApi ?? true,
      tone: options?.tone ?? "normal",
      kind: options?.kind ?? "message",
    };
  };

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isSending) {
      return;
    }

    const userMessage = createMessage("user", text);
    const nextMessages = [...messages, userMessage];
    const conversation = nextMessages
      .filter((message) => message.sendToApi)
      .slice(-CHAT_HISTORY_LIMIT)
      .map((message) => ({ role: message.role, content: message.content }));

    setMessages(nextMessages);
    setDraft("");
    setIsOpen(true);
    setIsSending(true);

    try {
      const result = await customerApi.chatbot({
        locale,
        page: window.location.pathname,
        messages: conversation,
      });

      setMessages((current) => [...current, createMessage("assistant", result.reply)]);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : copy.fallbackError;
      setMessages((current) => [
        ...current,
        createMessage("assistant", message, { sendToApi: false, tone: "error" })
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(draft);
  };

  const showQuickPrompts = !isSending && messages.every((message) => !message.sendToApi);

  return (
    <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[70] flex flex-col items-end gap-3">
      {isOpen ? (
        <section className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[8px] border border-stone-200 bg-white shadow-[0_20px_44px_rgba(15,23,42,0.16)]">
          <header className="flex items-start justify-between gap-3 border-b border-stone-200 bg-stone-950 px-4 py-3 text-white">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">{copy.title}</h2>
              <p className="mt-1 text-xs leading-5 text-stone-300">{copy.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/10 text-stone-200 transition-colors hover:bg-white/10"
              aria-label={copy.close}
            >
              <X size={16} />
            </button>
          </header>

          <div ref={messagesViewportRef} className="max-h-[26rem] space-y-3 overflow-y-auto bg-stone-50 px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[88%] whitespace-pre-wrap rounded-[8px] px-3 py-2 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-auto bg-brand text-white"
                    : message.tone === "error"
                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
                      : "bg-white text-stone-800 ring-1 ring-stone-200"
                }`}
              >
                {message.content}
              </div>
            ))}

            {showQuickPrompts ? (
              <div className="flex flex-wrap gap-2">
                {copy.quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-[8px] border border-stone-200 bg-white px-3 py-2 text-left text-xs font-medium text-stone-700 transition-colors hover:border-brand hover:text-brand"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}

            {isSending ? (
              <div className="inline-flex items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-sm text-stone-600 ring-1 ring-stone-200">
                <Loader2 size={14} className="animate-spin" />
                <span>{copy.busy}</span>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-stone-200 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={2}
                maxLength={2000}
                placeholder={copy.placeholder}
                className="min-h-[2.75rem] flex-1 resize-none rounded-[8px] border border-stone-200 px-3 py-2 text-sm text-stone-900 outline-none transition-colors focus:border-brand"
              />
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] bg-brand text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={copy.send}
              >
                <SendHorizonal size={18} />
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-brand bg-white text-brand shadow-[0_16px_34px_rgba(128,0,0,0.22),0_6px_14px_rgba(15,23,42,0.12)] transition-transform hover:-translate-y-[2px]"
        aria-label={isOpen ? copy.close : copy.open}
      >
        <div className="flex flex-col items-center leading-none">
          <MessageCircle size={18} />
          <span className="mt-1 text-[11px] font-semibold">AI</span>
        </div>
      </button>
    </div>
  );
};
