"use client";
import { useApp } from "./providers";

export function ChatText({ text, translation }: { text?: string; translation?: string }) {
  const { t } = useApp();
  if (!text) return null;
  if (!translation || translation === text) {
    return <p className="whitespace-pre-wrap break-words">{text}</p>;
  }
  return (
    <div>
      <p className="chat-translated-label">{t("translatedToYou")}</p>
      <p className="chat-translation whitespace-pre-wrap break-words">{translation}</p>
      <p className="chat-original">
        {t("originalMessage")} {text}
      </p>
    </div>
  );
}
