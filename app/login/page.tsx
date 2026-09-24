"use client";

import { useClientReady, writeProfile, type UserRole } from "@/lib/profile";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("resident");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const clientReady = useClientReady();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (trimmedName.length < 2) {
      setError("Enter the name neighbours should use.");
      return;
    }
    if (!/^[0-9+().\-\s]{6,20}$/.test(trimmedPhone)) {
      setError("Enter a phone number someone can actually call.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, phone: trimmedPhone, role }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; user?: { id?: string } } | null;
      if (!response.ok || !payload) {
        setError(payload?.error || "Sign-in did not go through. Try again.");
        return;
      }
      writeProfile({
        id: payload.user?.id,
        name: trimmedName,
        phone: trimmedPhone,
        role,
      });
      router.push(role === "resident" ? "/resident" : "/volunteer");
    } catch {
      setError("Could not reach Porchline. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-14">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">After the typhoon</p>
        <h1 className="mt-2 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">Who is checking in?</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
          Residents send a voice note or a photo of what they need. Volunteers nearby take the job. This is porch-to-porch help, not a dispatch centre.
        </p>
        <form onSubmit={onSubmit} className="mt-8 max-w-xl space-y-5" noValidate>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Your name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              name="name"
              autoComplete="name"
              required
              maxLength={80}
              className="min-h-12 w-full rounded-2xl border-2 border-foreground bg-white px-4 text-base"
              placeholder="Amina Rahman"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Mobile number</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required
              maxLength={20}
              className="min-h-12 w-full rounded-2xl border-2 border-foreground bg-white px-4 text-base"
              placeholder="07123 456789"
            />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">I am here to</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={role === "resident"}
                onClick={() => setRole("resident")}
                className={`min-h-14 rounded-2xl border-2 border-foreground px-4 text-left text-base font-semibold ${
                  role === "resident" ? "bg-foreground text-white" : "bg-white"
                }`}
              >
                Resident needs help
              </button>
              <button
                type="button"
                aria-pressed={role === "volunteer"}
                onClick={() => setRole("volunteer")}
                className={`min-h-14 rounded-2xl border-2 border-foreground px-4 text-left text-base font-semibold ${
                  role === "volunteer" ? "bg-foreground text-white" : "bg-white"
                }`}
              >
                Volunteer
              </button>
            </div>
          </fieldset>
          {error ? (
            <p role="alert" className="rounded-2xl border-2 border-danger bg-white px-4 py-3 text-base font-medium text-danger">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!clientReady || submitting}
            className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-foreground px-5 text-lg font-semibold text-white disabled:opacity-60"
          >
            {!clientReady ? "Opening sign-in…" : submitting ? "Saving your sign-in…" : "Continue"}
          </button>
        </form>
      </section>
      <aside className="h-fit rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold">What happens next</h2>
        <ol className="mt-4 space-y-3 text-base leading-7 text-muted">
          <li>1. A resident records what is wrong, or photographs the blocked road.</li>
          <li>2. Gemini reads the audio or image and marks how urgent it is.</li>
          <li>3. Life-threatening cases point straight to 999. Everything else is offered to volunteers within 5 km.</li>
        </ol>
      </aside>
    </main>
  );
}
