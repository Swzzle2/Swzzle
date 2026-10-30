import type { Metadata } from "next";
import { signUp } from "../actions";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-2 text-xl font-bold">Create account</h1>
      <p className="mb-5 text-sm text-muted">New accounts have no admin access until promoted.</p>
      <AuthForm mode="signup" action={signUp} />
    </>
  );
}
