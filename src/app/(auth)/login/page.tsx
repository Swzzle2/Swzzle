import type { Metadata } from "next";
import { Suspense } from "react";
import { signIn } from "../actions";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  "not-admin": "That account is not an admin. Ask for access, or sign in with an admin account.",
  "auth-callback": "That confirmation link is invalid or expired. Try signing in.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <h1 className="mb-5 text-xl font-bold">Sign in</h1>
      <Suspense>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LoginForm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  return <AuthForm mode="login" action={signIn} next={next} initialError={error} />;
}
