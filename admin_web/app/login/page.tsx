"use client";

// /login: email + password. After sign-in, AuthProvider checks the role; an
// admin is sent to the overview, anyone else gets "Access denied".
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { friendlyError } from "@/lib/errors";
import { validateLogin, type FieldErrors } from "@/lib/validation";

export default function LoginPage() {
  const { status, notice, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    FieldErrors<"email" | "password">
  >({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in as an admin (now, or from an earlier visit)?
  useEffect(() => {
    if (status === "admin") router.replace("/");
  }, [status, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); // Stay on the page; we handle the form in code.
    setError(null);
    const errors = validateLogin(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || status === "loading";
  const message = error ?? notice;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        noValidate // Our own messages instead of the browser's.
        className="card w-full max-w-sm space-y-5 p-6 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-semibold">Booking admin</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with an admin account.
          </p>
        </div>

        {message && (
          <p
            role="alert"
            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {message}
          </p>
        )}

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className="input"
          />
          {fieldErrors.email && (
            <p id="email-error" className="field-error">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
            }
            className="input"
          />
          {fieldErrors.password && (
            <p id="password-error" className="field-error">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {submitting ? "Signing in…" : busy ? "Please wait…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
