"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "./actions";

type Props = {
  mode: "login" | "signup";
  action: (prev: AuthState, form: FormData) => Promise<AuthState>;
  next?: string;
  initialError?: string;
};

export function AuthForm({ mode, action, next, initialError }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: initialError });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="field"
        />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.message && <p className="text-sm text-ok">{state.message}</p>}
      <button className="btn justify-center" disabled={pending}>
        {pending ? "…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-sm text-muted">
        {mode === "login" ? (
          <>No account? <Link href="/signup" className="text-accent">Sign up</Link></>
        ) : (
          <>Have an account? <Link href="/login" className="text-accent">Sign in</Link></>
        )}
      </p>
    </form>
  );
}
