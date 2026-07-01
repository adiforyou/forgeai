"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

type PasswordStrength = "weak" | "medium" | "strong";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  // Calculate password strength
  const passwordStrength: { strength: PasswordStrength; score: number } = useMemo(() => {
    if (!password) return { strength: "weak", score: 0 };

    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character variety
    if (/[a-z]/.test(password)) score += 1; // lowercase
    if (/[A-Z]/.test(password)) score += 1; // uppercase
    if (/[0-9]/.test(password)) score += 1; // numbers
    if (/[^a-zA-Z0-9]/.test(password)) score += 1; // special chars

    // Determine strength
    if (score <= 2) return { strength: "weak", score };
    if (score <= 4) return { strength: "medium", score };
    return { strength: "strong", score };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate password strength for signup
    if (isSignup && passwordStrength.strength === "weak") {
      setError("Password is too weak. Please use a stronger password with uppercase, lowercase, numbers, and special characters.");
      return;
    }

    setLoading(true);

    try {
      const response = isSignup
        ? await authApi.signup(email, password, name)
        : await authApi.login(email, password);

      const { user, token, message, requiresVerification } = response.data;

      if (isSignup) {
        if (requiresVerification) {
          // Redirect to OTP verification page
          setSuccess(message || "Verification code sent! Redirecting...");
          setTimeout(() => {
            router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
          }, 1500);
        } else {
          // Old flow fallback
          setSuccess(message || "Account created! Please check your email to verify your account.");
          setEmail("");
          setPassword("");
          setName("");
          setTimeout(() => {
            setIsSignup(false);
            setSuccess("");
          }, 5000);
        }
      } else {
        // Login successful, redirect to dashboard
        setAuth(user, token);
        router.push("/dashboard");
      }
    } catch (err: any) {
      // Get user-friendly error message
      let errorMessage = "Something went wrong. Please try again.";

      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (err.response?.status === 400) {
        errorMessage = "Invalid input. Please check your details.";
      } else if (err.message === "Network Error") {
        errorMessage = "Cannot connect to server. Please check if the API is running.";
      }

      setError(errorMessage);

      // If email not verified, show specific message
      if (err.response?.status === 403) {
        setError(errorMessage + " Click below to resend verification email.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await authApi.resendVerification(email);
      setSuccess("Verification email sent! Please check your inbox.");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-card border border-border p-10 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">Forge AI</h2>
          <p className="mt-2 text-muted-foreground">
            {isSignup ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-500">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="you@example.com"
              />
            </div>

            {isSignup && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                {!isSignup && (
                  <a
                    href="/forgot-password"
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder={isSignup ? "At least 8 characters" : "Enter your password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {isSignup && password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.strength === "weak"
                            ? "w-1/3 bg-red-500"
                            : passwordStrength.strength === "medium"
                            ? "w-2/3 bg-yellow-500"
                            : "w-full bg-green-500"
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength.strength === "weak"
                          ? "text-red-500"
                          : passwordStrength.strength === "medium"
                          ? "text-yellow-500"
                          : "text-green-500"
                      }`}
                    >
                      {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use uppercase, lowercase, numbers, and special characters for a strong password
                  </p>
                </div>
              )}
              {isSignup && !password && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Must be at least 8 characters long
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : isSignup ? "Sign up" : "Sign in"}
          </button>

          {error && error.includes("verify your email") && (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={loading}
              className="w-full rounded-md border border-primary bg-transparent px-4 py-2 text-sm text-primary hover:bg-primary/10 focus:outline-none disabled:opacity-50 transition-colors"
            >
              Resend Verification Email
            </button>
          )}

          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
                setSuccess("");
              }}
              className="text-primary hover:text-primary/90 transition-colors"
            >
              {isSignup
                ? "Already have an account? Sign in"
                : "Need an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
