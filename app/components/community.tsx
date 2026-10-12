"use client";
import { useEffect, useRef, useState } from "react";
import { api, post, useApp } from "./providers";
import type { RequestView, UserRole } from "@/lib/types";

type Friend = { id: string; name: string; role: UserRole; createdAt: string };
type Invite = {
  requestId: string;
  role: UserRole;
  category: string;
  closedAt?: string;
  status: "incoming" | "outgoing";
};
type FriendMessage = { id: string; senderId: string; text: string; createdAt: string };

export function FriendOffer({ request }: { request: RequestView }) {
  const { t } = useApp();
  const [status, setStatus] = useState(request.friendStatus || "none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (request.friendStatus) setStatus(request.friendStatus);
  }, [request.friendStatus]);
  if (request.closedReason !== "completed" || !request.volunteerId) return null;
  return (
    <div className="friend-offer">
      <FriendChoice
        status={status}
        busy={busy}
        error={error}
        onChoose={async (decision) => {
          setBusy(true);
          setError("");
          try {
            const next = await post<RequestView>("/api/friends", { id: request.id, decision });
            setStatus(next.friendStatus || "none");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

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
        <>
          <p>{t("addFriend")}</p>
          <p className="text-sm text-muted">{t("addFriendHint")}</p>
          <button type="button" className="button" disabled={busy} onClick={() => void onChoose("accept")}>
            {t("addFriend")}
          </button>
        </>
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

function FriendChat({ friend, onBack }: { friend: Friend; onBack: () => void }) {
  const { t, user } = useApp();
  const [messages, setMessages] = useState<FriendMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    const poll = async () => {
      try {
        const body = await api<{ messages: FriendMessage[] }>("/api/friends/chat?id=" + encodeURIComponent(friend.id));
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
  }, [friend.id]);
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
        {messages.length ? messages.map((message) => (
          <div key={message.id} className={"bubble " + (message.senderId === user?.id ? "sent" : "received")}>
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
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
            const body = await api<{ messages: FriendMessage[] }>("/api/friends/chat?id=" + encodeURIComponent(friend.id));
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
  const { t, locale } = useApp();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [open, setOpen] = useState<Friend | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [choiceError, setChoiceError] = useState("");
  useEffect(() => {
    let live = true;
    const poll = async () => {
      try {
        const body = await api<{ friends: Friend[]; invites: Invite[] }>("/api/friends");
        if (!live) return;
        setFriends(body.friends);
        setInvites(body.invites);
        setError("");
        setLoaded(true);
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
  return (
    <div className="stage-scroll community-list">
      {error ? <p className="error" role="alert">{t(error)}</p> : null}
      {invites.map((invite) => (
        <article className="friend-invite" key={invite.requestId}>
          <p><strong>{t(invite.role)}</strong> · {t(invite.category)}</p>
          <p className="text-sm text-muted">
            {invite.closedAt ? new Date(invite.closedAt).toLocaleDateString(locale) + " · " : ""}
            {t(invite.status === "incoming" ? "friendIncoming" : "friendWaiting")}
          </p>
          {invite.status === "incoming" ? (
            <FriendChoice
              status="incoming"
              busy={busyId === invite.requestId}
              error={busyId === invite.requestId ? choiceError : ""}
              onChoose={async (decision) => {
                setBusyId(invite.requestId);
                setChoiceError("");
                try {
                  await post("/api/friends", { id: invite.requestId, decision });
                  const body = await api<{ friends: Friend[]; invites: Invite[] }>("/api/friends");
                  setFriends(body.friends);
                  setInvites(body.invites);
                } catch (e) {
                  setChoiceError((e as Error).message);
                } finally {
                  setBusyId("");
                }
              }}
            />
          ) : null}
        </article>
      ))}
      {friends.length ? (
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
      ) : loaded && !invites.length ? (
        <div className="empty-state">
          <h2>{t("noFriends")}</h2>
          <p>{t("noFriendsHint")}</p>
        </div>
      ) : null}
    </div>
  );
}
