"use client";
import { useEffect, useRef, useState } from "react";
import { api, post, useApp } from "./providers";
import type { RequestView, UserRole } from "@/lib/types";
import { ChatText } from "./chat-text";

type Friend = { id: string; name: string; role: UserRole; createdAt: string };
type Person = {
  requestId: string;
  name: string;
  role: UserRole;
  category: string;
  closedAt?: string;
  status: "incoming" | "outgoing" | "none";
};
type FriendMessage = { id: string; senderId: string; text: string; translation?: string; createdAt: string };

function FriendChoice({
  status,
  busy,
  error,
  onChoose,
}: {
  status: string;
  busy: boolean;
  error: string;
  onChoose: (decision: "accept" | "decline") => Promise<void>;
}) {
  const { t } = useApp();
  return (
    <>
      {status === "friends" ? <p role="status">{t("friendsNow")}</p> : null}
      {status === "outgoing" ? <p role="status">{t("friendWaiting")}</p> : null}
      {status === "declined" ? <p role="status">{t("friendDeclined")}</p> : null}
      {status === "none" ? (
        <button type="button" className="button w-full" disabled={busy} onClick={() => void onChoose("accept")}>
          {t("addFriend")}
        </button>
      ) : null}
      {status === "incoming" ? (
        <>
          <p>{t("friendIncoming")}</p>
          <div className="friend-actions">
            <button type="button" className="button" disabled={busy} onClick={() => void onChoose("accept")}>
              {t("acceptFriend")}
            </button>
            <button type="button" className="button secondary" disabled={busy} onClick={() => void onChoose("decline")}>
              {t("declineFriend")}
            </button>
          </div>
        </>
      ) : null}
      {error ? <p className="error" role="alert">{t(error)}</p> : null}
    </>
  );
}

function FriendRequestPage({
  person,
  onBack,
  onChanged,
}: {
  person: Person;
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const { t, locale } = useApp();
  const [status, setStatus] = useState<string>(person.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="conversation" aria-label={t("addFriendPage")}>
      <header className="conversation-header">
        <button type="button" className="history-back" onClick={onBack}>‹ {t("backToFriends")}</button>
        <strong className="truncate">{person.name || t(person.role)}</strong>
      </header>
      <div className="friend-request-body">
        <p>
          <strong>{t(person.role)}</strong>
          {" · "}
          {t(person.category)}
        </p>
        {person.closedAt ? (
          <p className="text-sm text-muted">{new Date(person.closedAt).toLocaleDateString(locale)}</p>
        ) : null}
        <FriendChoice
          status={status}
          busy={busy}
          error={error}
          onChoose={async (decision) => {
            setBusy(true);
            setError("");
            try {
              const next = await post<RequestView>("/api/friends", { id: person.requestId, decision });
              const nextStatus = next.friendStatus || "none";
              setStatus(nextStatus);
              await onChanged();
              if (nextStatus === "friends" || nextStatus === "declined") onBack();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </section>
  );
}

function FriendChat({ friend, onBack }: { friend: Friend; onBack: () => void }) {
  const { t, user, locale } = useApp();
  const [messages, setMessages] = useState<FriendMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    const poll = async () => {
      try {
        const body = await api<{ messages: FriendMessage[] }>(
          "/api/friends/chat?id=" + encodeURIComponent(friend.id) + "&locale=" + encodeURIComponent(locale),
        );
        if (live) {
          setMessages(body.messages);
          setError("");
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 2000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [friend.id, locale]);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [messages.length]);
  return (
    <section className="conversation" aria-label={t("community")}>
      <header className="conversation-header">
        <button type="button" className="history-back" onClick={onBack}>‹ {t("backToFriends")}</button>
        <strong className="truncate">{friend.name || t(friend.role)}</strong>
      </header>
      <div className="conversation-log" ref={box} role="log" aria-live="polite" aria-label={t("chat")}>
        {error ? <p className="chat-system">{t(error)}</p> : null}
        <p className="chat-system">{t("chatTranslateHint")}</p>
        {messages.length ? messages.map((message) => (
          <div key={message.id} className={"bubble " + (message.senderId === user?.id ? "sent" : "received")}>
            <ChatText text={message.text} translation={message.senderId === user?.id ? undefined : message.translation} />
          </div>
        )) : <p className="chat-system">{t("noMessages")}</p>}
      </div>
      <form
        className="chat-composer"
        onSubmit={async (event) => {
          event.preventDefault();
          const next = text.trim();
          if (!next) return;
          setBusy(true);
          setError("");
          try {
            await post("/api/friends/chat", { id: friend.id, text: next });
            setText("");
            const body = await api<{ messages: FriendMessage[] }>(
              "/api/friends/chat?id=" + encodeURIComponent(friend.id) + "&locale=" + encodeURIComponent(locale),
            );
            setMessages(body.messages);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <textarea
          aria-label={t("message")}
          placeholder={t("chatPlaceholder")}
          value={text}
          maxLength={1000}
          rows={1}
          onChange={(event) => setText(event.target.value)}
        />
        <button className="button" type="submit" disabled={busy || !text.trim()}>{t("send")}</button>
      </form>
    </section>
  );
}

export default function Community() {
  const { t } = useApp();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState<Friend | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const load = async () => {
    const body = await api<{ friends: Friend[]; invites: Person[]; suggestions: Person[] }>("/api/friends");
    const rank = { incoming: 0, none: 1, outgoing: 2 };
    setFriends(body.friends);
    setPeople(
      [...(body.suggestions || []), ...(body.invites || [])].sort(
        (a, b) => rank[a.status] - rank[b.status],
      ),
    );
    setError("");
    setLoaded(true);
  };
  useEffect(() => {
    let live = true;
    const poll = async () => {
      try {
        if (live) await load();
      } catch (e) {
        if (live) setError((e as Error).message);
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 3000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);
  if (open) return <FriendChat friend={open} onBack={() => setOpen(null)} />;
  if (person) {
    return (
      <FriendRequestPage
        person={person}
        onBack={() => setPerson(null)}
        onChanged={async () => {
          await load();
        }}
      />
    );
  }
  return (
    <div className="stage-scroll community-list">
      {error ? <p className="error" role="alert">{t(error)}</p> : null}
      {people.length ? (
        <section>
          <h2 className="community-heading">{t("addFriendPage")}</h2>
          <ul className="friend-list">
            {people.map((item) => (
              <li key={item.requestId}>
                <button type="button" className="history-item" onClick={() => setPerson(item)}>
                  <span>
                    <strong>{item.name || t(item.role)}</strong>
                    <span className="block text-sm">
                      {t(item.status === "incoming" ? "friendIncoming" : item.status === "outgoing" ? "friendWaiting" : "addFriend")}
                    </span>
                  </span>
                  <span aria-hidden>›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {friends.length ? (
        <section>
          <h2 className="community-heading">{t("messages")}</h2>
          <ul className="friend-list">
            {friends.map((friend) => (
              <li key={friend.id}>
                <button type="button" className="history-item" onClick={() => setOpen(friend)}>
                  <span>
                    <strong>{friend.name || t(friend.role)}</strong>
                    <span className="block text-sm">{t(friend.role)}</span>
                  </span>
                  <span aria-hidden>›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : loaded && !people.length ? (
        <div className="empty-state">
          <h2>{t("noFriends")}</h2>
          <p>{t("noFriendsHint")}</p>
        </div>
      ) : null}
    </div>
  );
}
