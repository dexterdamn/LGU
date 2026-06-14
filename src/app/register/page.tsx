"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { CheckCircle, Loader2 } from "lucide-react";

type Step = "info" | "email-otp" | "totp-setup" | "totp-verify" | "password" | "done";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);

  const [form, setForm] = useState({
    email: "",
    name: "",
    nickname: "",
    officeAgency: "",
    sex: "MALE" as "MALE" | "FEMALE" | "OTHER",
    birthday: "",
    address: "",
    emailOtp: "",
    totpToken: "",
    password: "",
    confirmPassword: "",
  });

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          nickname: form.nickname,
          officeAgency: form.officeAgency,
          sex: form.sex,
          birthday: form.birthday,
          address: form.address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUserId(data.userId);
      setStep("email-otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: form.emailOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQrCode(data.qrCode);
      setStep("totp-setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, token: form.totpToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequiresApproval(data.requiresApproval);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { key: "info", label: "Your Info" },
    { key: "email-otp", label: "Email Verify" },
    { key: "totp-setup", label: "Authenticator" },
    { key: "password", label: "Password" },
  ];

  const currentStepIndex = steps.findIndex((s) =>
    step === "totp-verify" ? s.key === "totp-setup" : s.key === step
  );

  return (
    <div className="page-shell">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-center mb-2">Create Account</h1>
          <p className="text-gray-500 text-center text-sm mb-8">
            Register as a data encoder for GADFS
          </p>

          {step !== "done" && (
            <div className="flex justify-between mb-8">
              {steps.map((s, i) => (
                <div key={s.key} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      i <= currentStepIndex
                        ? "bg-primary-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {i < currentStepIndex ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className="text-xs mt-1 text-gray-500 hidden sm:block">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {step === "info" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  required
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Nickname (display name for authored data)</label>
                <input
                  type="text"
                  className="input"
                  required
                  minLength={2}
                  placeholder="How your name appears on data entries"
                  value={form.nickname}
                  onChange={(e) => updateForm("nickname", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Office / Agency</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={form.officeAgency}
                  onChange={(e) => updateForm("officeAgency", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Sex</label>
                <select
                  className="input"
                  value={form.sex}
                  onChange={(e) => updateForm("sex", e.target.value)}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Birthday</label>
                <input
                  type="date"
                  className="input"
                  required
                  value={form.birthday}
                  onChange={(e) => updateForm("birthday", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Address</label>
                <textarea
                  className="input"
                  rows={2}
                  required
                  value={form.address}
                  onChange={(e) => updateForm("address", e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
              </button>
            </form>
          )}

          {step === "email-otp" && (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                We sent a 6-digit code to <strong>{form.email}</strong>
              </p>
              <div>
                <label className="label">Verification Code</label>
                <input
                  type="text"
                  className="input text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                  value={form.emailOtp}
                  onChange={(e) => updateForm("emailOtp", e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Email"}
              </button>
            </form>
          )}

          {(step === "totp-setup" || step === "totp-verify") && (
            <form onSubmit={handleVerifyTotp} className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Install Google Authenticator, scan this QR code, then enter the 6-digit code.
                </p>
                {qrCode && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrCode} alt="TOTP QR Code" className="mx-auto w-48 h-48 border rounded-lg" />
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Codes from the previous 2 minutes are also accepted (grace period).
                </p>
              </div>
              <div>
                <label className="label">Authenticator Code</label>
                <input
                  type="text"
                  className="input text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                  value={form.totpToken}
                  onChange={(e) => updateForm("totpToken", e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Authenticator"}
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                Create a password (minimum 8 characters, alphanumeric).
              </p>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => updateForm("password", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  className="input"
                  required
                  value={form.confirmPassword}
                  onChange={(e) => updateForm("confirmPassword", e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Registration"}
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold">Registration Complete!</h2>
              {requiresApproval ? (
                <p className="text-gray-600">
                  Your account is pending admin approval. You will be able to log in once approved.
                </p>
              ) : (
                <p className="text-gray-600">
                  You are the system admin. You can log in now.
                </p>
              )}
              <Link href="/login" className="btn-primary inline-block px-8 py-3">
                Go to Login
              </Link>
            </div>
          )}

          {step === "info" && (
            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-primary-600 hover:underline">
                Login
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
