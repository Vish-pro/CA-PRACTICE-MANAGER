"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Lock } from "lucide-react";
import { useSession } from "next-auth/react";

interface ConfirmByPasswordProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  actionLabel?: string;         // Text on the confirm button, default "Confirm"
  actionClassName?: string;     // CSS override for the confirm button
}

export function ConfirmByPassword({
  open,
  onClose,
  onConfirm,
  title,
  description,
  actionLabel = "Confirm",
  actionClassName,
}: ConfirmByPasswordProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  if (!open) return null;

  const handleConfirm = async () => {
    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        onConfirm();
        setPassword("");
        onClose();
      } else {
        setError(json.error || "Incorrect password");
      }
    } catch (err) {
      setError("An error occurred while verifying the password");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border rounded-xl shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        {/* Password prompt */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Enter your password to confirm:
          </label>
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
              if (e.key === 'Escape') handleClose();
            }}
            placeholder="Password"
            className={cn(
              "w-full p-2.5 border rounded-md text-sm transition-colors focus:outline-none focus:ring-2",
              error
                ? "border-red-400 focus:ring-red-200 bg-red-50"
                : "border-border focus:ring-primary/30"
            )}
          />
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !password}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              actionClassName || "bg-red-600 text-white hover:bg-red-700"
            )}
          >
            {loading ? "Verifying..." : actionLabel}
          </button>
        </div>
      </div>
    </>
  );
}
