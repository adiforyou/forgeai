"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import axios from "axios";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing. Please check your email for the correct link.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/verify-email?token=${token}`
        );

        setStatus("success");
        setMessage(response.data.message || "Email verified successfully!");

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } catch (error: any) {
        setStatus("error");
        setMessage(
          error.response?.data?.error ||
            "Failed to verify email. The link may be invalid or expired."
        );
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-8">
          {/* Logo */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold">Email Verification</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Forge AI
            </p>
          </div>

          {/* Status Display */}
          <div className="flex flex-col items-center">
            {status === "loading" && (
              <>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  Verifying your email...
                </h2>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Please wait while we verify your email address.
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  Email Verified!
                </h2>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {message}
                </p>
                <div className="mt-6 w-full">
                  <Link
                    href="/login"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Continue to Login
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Redirecting automatically in 3 seconds...
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold text-red-500">
                  Verification Failed
                </h2>
                <p className="mt-2 text-center text-sm text-red-400">
                  {message}
                </p>
                <div className="mt-6 w-full space-y-3">
                  <Link
                    href="/login"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    Back to Login
                  </Link>
                  <button
                    onClick={() => router.push("/resend-verification")}
                    className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Request New Link
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Help Text */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need help?{" "}
          <a href="mailto:support@prreviewer.com" className="text-primary hover:text-primary/80 transition-colors">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
