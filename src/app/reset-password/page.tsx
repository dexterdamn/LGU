"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Loader2, CheckCircle } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-600">Invalid reset link.</p>
        <Link href="/login" className="btn-primary mt-4 inline-block">Go to Login</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card p-8 text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-xl font-semibold">Password Updated</h2>
        <Link href="/login" className="btn-primary inline-block px-8 py-3">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <h1 className="text-2xl font-bold text-center mb-2">Reset Password</h1>
      <p className="text-muted text-center text-sm mb-8">Enter your new password (8+ chars, alphanumeric)</p>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">New Password</label>
          <input type="password" className="input" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <input type="password" className="input" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="page-shell">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-12">
        <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin mx-auto" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
