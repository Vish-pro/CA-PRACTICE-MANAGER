"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface ConfirmByTypingProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmName: string;          // The name the user must type — usually session.user.name
  actionLabel?: string;         // Text on the confirm button, default "Confirm"
  actionClassName?: string;     // CSS override for the confirm button
}

export function ConfirmByTyping({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmName,
  actionLabel = "Confirm",
  actionClassName,
}: ConfirmByTypingProps) {
  const [typed, setTyped] = useState("");

  if (!open) return null;

  const isMatch = typed.trim().toLowerCase() === confirmName.trim().toLowerCase();

  const handleConfirm = () => {
    if (!isMatch) return;
    onConfirm();
    setTyped("");
    onClose();
  };

  const handleClose = () => {
    setTyped("");
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
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        {/* Typing prompt */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Type your name <span className="font-bold text-foreground">&quot;{confirmName}&quot;</span> to confirm:
          </label>
          <input
            autoFocus
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') handleClose(); }}
            placeholder={`Type "${confirmName}" here...`}
            className={cn(
              "w-full p-2.5 border rounded-md text-sm transition-colors focus:outline-none focus:ring-2",
              isMatch
                ? "border-red-400 focus:ring-red-200 bg-red-50"
                : "border-border focus:ring-primary/30"
            )}
          />
          {typed.length > 0 && !isMatch && (
            <p className="text-xs text-red-500">Name does not match. Check capitalisation.</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isMatch}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              actionClassName || "bg-red-600 text-white hover:bg-red-700"
            )}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </>
  );
}