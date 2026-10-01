"use client";

import { useState, useEffect } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = (type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    success: (msg) => addToast("success", msg),
    error: (msg) => addToast("error", msg),
    info: (msg) => addToast("info", msg),
  };

  return { toasts, toast, removeToast };
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-lg transform transition-all duration-300 animate-slide-in ${
        isSuccess
          ? "bg-slate-900/95 border-emerald-500/50 text-emerald-300 shadow-emerald-950/40"
          : isError
          ? "bg-slate-900/95 border-red-500/50 text-red-300 shadow-red-950/40"
          : "bg-slate-900/95 border-blue-500/50 text-blue-300 shadow-blue-950/40"
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {isSuccess && (
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {isError && (
          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 text-sm font-medium leading-snug text-slate-200">
        {toast.message}
      </div>

      <button
        onClick={onClose}
        className="shrink-0 text-slate-400 hover:text-white transition cursor-pointer p-0.5 rounded"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
