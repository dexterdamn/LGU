"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [requiresTotp, setRequiresTotp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          totpToken: requiresTotp ? totpToken : undefined,
        }),
      });
      const data = await res.json();

      if (data.requiresTotp) {
        setRequiresTotp(true);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(data.error);

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setForgotMessage("");
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForgotMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-center mb-2">
            {showForgot ? "Forgot Password" : "Login"}
          </h1>
          <p className="text-muted text-center text-sm mb-8">
            {showForgot
              ? "Enter your email to receive a reset link (max 5 requests per day)"
              : "Sign in to your GADFS account"}
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}
          {forgotMessage && (
            <div className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-sm mb-4">
              {forgotMessage}
            </div>
          )}

          {showForgot ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForgot(false); setError(""); setForgotMessage(""); }}
                className="w-full text-sm text-primary-600 hover:underline"
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="label mb-0">Password</label>
                  <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email); }} className="text-xs text-primary-600 hover:underline">
                    Forgot password?
                  </button>
                </div>
                <input type="password" className="input" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              {requiresTotp && (
                <div>
                  <label className="label">Authenticator Code</label>
                  <input
                    type="text"
                    className="input text-center text-xl tracking-widest"
                    maxLength={6}
                    required
                    value={totpToken}
                    onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                  />
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Login"}
              </button>
            </form>
          )}

          {!showForgot && (
            <p className="text-center text-sm text-muted mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary-600 hover:underline">Register</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
