import "server-only";

type TelegramInlineButton = {
  text: string;
  url: string;
};

type SendTelegramMessageInput = {
  text: string;
  parseMode?: "HTML" | "MarkdownV2";
  button?: TelegramInlineButton | null;
};

type TelegramSendMessageBody = {
  chat_id: string;
  text: string;
  parse_mode: "HTML" | "MarkdownV2";
  disable_web_page_preview: boolean;
  reply_markup?: {
    inline_keyboard: TelegramInlineButton[][];
  };
};

export async function sendTelegramMessage({
  text,
  parseMode = "HTML",
  button = null
}: SendTelegramMessageInput): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing; notification skipped.");
    }

    return false;
  }

  const body: TelegramSendMessageBody = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: true
  };

  if (button) {
    body.reply_markup = {
      inline_keyboard: [[button]]
    };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error("[telegram] sendMessage failed", {
        status: response.status,
        statusText: response.statusText,
        details: details.slice(0, 500)
      });

      return false;
    }

    return true;
  } catch (error) {
    console.error("[telegram] sendMessage request failed", error);
    return false;
  }
}
