"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    setSuccess("Password reset link sent! Check your email inbox.");
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-blue-deep dark:text-white">
            Reset Password
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-wider text-ink-soft dark:text-white/60">
            We&apos;ll send you a reset link
          </p>
        </div>

        <form onSubmit={handleReset} className="mt-10 space-y-5">
          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 font-mono text-xs text-danger">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 font-mono text-xs text-success">
              {success}
            </div>
          )}

          <div>
            <label className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-ink-soft dark:text-white/60">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="input-field"
            />
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Send Reset Link
          </Button>
        </form>

        <p className="mt-8 text-center font-mono text-xs text-ink-soft dark:text-white/60">
          Remember your password?{" "}
          <Link
            href="/login"
            className="text-blue-bright hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
