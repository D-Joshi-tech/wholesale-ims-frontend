"use client";

import { useState, useEffect, useRef } from "react";
import { ShieldCheck, Lock, AlertCircle, Sparkles, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { googleLogin, devLogin, AuthUser } from "@/lib/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              width?: number;
              text?: string;
              shape?: "rectangular" | "pill" | "circle";
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type LoginViewProps = {
  onLoginSuccess: (user: AuthUser) => void;
};

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    ""; // Can be provided via Vercel env or prompt

  useEffect(() => {
    // Dynamically inject Google Identity Services script if not already loaded
    if (!document.getElementById("google-gsi-script")) {
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initializeGoogleSignIn();
      };
      document.body.appendChild(script);
    } else {
      initializeGoogleSignIn();
    }
  }, [googleClientId]);

  function initializeGoogleSignIn() {
    if (!googleClientId || !window.google || !googleBtnRef.current) return;

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
      });

      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "filled_blue",
        size: "large",
        shape: "pill",
        text: "signin_with",
        width: 320,
      });
    } catch (err) {
      console.error("Failed to initialize Google Sign-In:", err);
    }
  }

  async function handleGoogleResponse(res: { credential: string }) {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const auth = await googleLogin(res.credential);
      onLoginSuccess(auth.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDirectEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const auth = await devLogin(email.trim());
      onLoginSuccess(auth.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Access Denied";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="relative w-full max-w-md">
        {/* Glow effect */}
        <div className="absolute -top-12 -left-12 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 shadow-lg shadow-indigo-500/30 mb-4">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Wholesale Desk IMS</h1>
            <p className="text-sm text-slate-400 mt-1">Authorized Whitelist Personnel Only</p>
          </div>

          {/* Security Alert / Status */}
          {error && (
            <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Access Restricted</p>
                <p className="mt-0.5 text-rose-300/90 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {info && (
            <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>{info}</div>
            </div>
          )}

          {/* Primary: Google Sign-In if client ID is configured */}
          {googleClientId ? (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Single Sign-On
                </span>
              </div>
              <div className="flex justify-center my-2">
                <div ref={googleBtnRef} className="min-h-[44px]" />
              </div>
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <span className="relative bg-slate-900 px-3 text-xs text-slate-500 uppercase tracking-wider">
                  or whitelist sign in
                </span>
              </div>
            </div>
          ) : null}

          {/* Whitelist Email Verification Form */}
          <form onSubmit={handleDirectEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Authorized Google / Workspace Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. dhyeyjoshi007@gmail.com"
                  className="w-full rounded-xl bg-slate-950/60 border border-slate-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Verify Whitelist & Access</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Features Footnote */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>TLS In-Transit Encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Whitelist Enforced</span>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-slate-500 text-center">
              Primary Administrator: <span className="text-slate-400 font-mono">dhyeyjoshi007@gmail.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
