"use client";

import { useState, useRef, useCallback } from "react";
import { useToast, ToastContainer } from "./components/Toast";
import { SpinnerIcon, SendIcon } from "./components/Icons";
import BulkEmailModal from "./components/BulkEmailModal";

// ── Constants ────────────────────────────────────────────────
export const STATUS = {
  PENDING:   "pending",
  SENDING:   "sending",
  SUCCESS:   "success",
  FAILED:    "failed",
  WAITING:   "waiting",
  PAUSED:    "paused",
  CANCELLED: "cancelled",
};

const DELAY_MIN_MS = 8_000;
const DELAY_MAX_MS = 18_000;
const randomDelay  = () =>
  Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1)) + DELAY_MIN_MS;

const FAKE_EMAILS = `test.user1@example.com
demo.contact@fakecompany.ma
jobs.hr@testcorp.io
recrutement@fakedigital.ma
careers@dummytech.com
info@testmail.dev
noreply@fakedomain.ma
contact@mockcompany.net
hr@testbusiness.org
hello@fakestartup.io`;

// ── Icons ────────────────────────────────────────────────────
const PauseIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

const ResumeIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5.14v14l11-7-11-7z" />
  </svg>
);

const StopIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <rect x="5" y="5" width="14" height="14" rx="2" />
  </svg>
);

// ── Main Component ────────────────────────────────────────────
export default function Home() {
  const [formData, setFormData] = useState({
    to:      "",
    subject: "",
    message: "",
  });

  const [bulkEmails,    setBulkEmails]    = useState("");
  const [isBulkMode,    setIsBulkMode]    = useState(false);
  const [bulkJobs,      setBulkJobs]      = useState([]);
  const [bulkStats,     setBulkStats]     = useState({ elapsed: null, finished: false });
  const [countdown,     setCountdown]     = useState(0);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [isPaused,      setIsPaused]      = useState(false);
  const [loading,       setLoading]       = useState(false);

  const { toasts, toast, removeToast } = useToast();

  const countdownRef = useRef(null);
  const startTimeRef = useRef(null);
  const elapsedRef   = useRef(null);
  const pausedRef    = useRef(false);
  const cancelledRef = useRef(false);
  const resumeRef    = useRef(null);

  // ── Single send ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch("/api/send-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Email sent successfully!");
        setFormData((p) => ({ ...p, to: "" }));
      } else {
        toast.error(data.error || "Failed to send email.");
      }
    } catch {
      toast.error("Unexpected network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Timers ───────────────────────────────────────────────
  const startElapsedTicker = () => {
    startTimeRef.current = Date.now();
    elapsedRef.current = setInterval(() => {
      if (!pausedRef.current)
        setBulkStats((p) => ({ ...p, elapsed: Date.now() - startTimeRef.current }));
    }, 500);
  };

  const stopElapsedTicker = (cancelled = false) => {
    clearInterval(elapsedRef.current);
    setBulkStats((p) => ({
      ...p,
      elapsed:   Date.now() - startTimeRef.current,
      finished:  true,
      cancelled,
    }));
  };

  const startCountdown = (ms) =>
    new Promise((resolve) => {
      let remaining = ms;
      setCountdown(remaining);
      countdownRef.current = setInterval(() => {
        if (pausedRef.current || cancelledRef.current) return;
        remaining -= 500;
        setCountdown(Math.max(0, remaining));
        if (remaining <= 0) { clearInterval(countdownRef.current); resolve(); }
      }, 500);
    });

  // ── Pause gate ───────────────────────────────────────────
  const waitIfPaused = () =>
    new Promise((resolve) => {
      if (!pausedRef.current) return resolve();
      resumeRef.current = resolve;
    });

  // ── Controls ─────────────────────────────────────────────
  const handlePause = useCallback(() => {
    pausedRef.current = true;
    setIsPaused(true);
    clearInterval(countdownRef.current);
    setBulkJobs((prev) => prev.map((j) =>
      j.status === STATUS.WAITING ? { ...j, status: STATUS.PAUSED } : j
    ));
  }, []);

  const handleResume = useCallback(() => {
    pausedRef.current = false;
    setIsPaused(false);
    setBulkJobs((prev) => prev.map((j) =>
      j.status === STATUS.PAUSED ? { ...j, status: STATUS.WAITING } : j
    ));
    if (resumeRef.current) { resumeRef.current(); resumeRef.current = null; }
  }, []);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    pausedRef.current    = false;
    clearInterval(countdownRef.current);
    clearInterval(elapsedRef.current);
    setCountdown(0);
    // Unblock any waiting promise so the loop can exit
    if (resumeRef.current) { resumeRef.current(); resumeRef.current = null; }
    // Mark all non-finished jobs as cancelled
    setBulkJobs((prev) => prev.map((j) =>
      [STATUS.PENDING, STATUS.WAITING, STATUS.PAUSED].includes(j.status)
        ? { ...j, status: STATUS.CANCELLED }
        : j
    ));
    setBulkStats((p) => ({
      ...p,
      elapsed:   startTimeRef.current ? Date.now() - startTimeRef.current : p.elapsed,
      finished:  true,
      cancelled: true,
    }));
    setIsBulkRunning(false);
    setIsPaused(false);
  }, []);

  // ── Bulk send ────────────────────────────────────────────
  const handleBulkSend = useCallback(async () => {
    const lines = bulkEmails
      .split(/[\n,;]+/).map((e) => e.trim())
      .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (!lines.length) { toast.error("No valid email addresses found."); return; }

    pausedRef.current    = false;
    cancelledRef.current = false;
    resumeRef.current    = null;
    setIsPaused(false);

    const jobs = lines.map((to) => ({ to, status: STATUS.PENDING, duration: null, error: null }));
    setBulkJobs(jobs);
    setBulkStats({ elapsed: null, finished: false, cancelled: false });
    setCountdown(0);
    setModalOpen(true);
    setIsBulkRunning(true);
    startElapsedTicker();

    for (let i = 0; i < jobs.length; i++) {
      if (cancelledRef.current) break;

      await waitIfPaused();
      if (cancelledRef.current) break;

      setBulkJobs((prev) => {
        const n = [...prev]; n[i] = { ...n[i], status: STATUS.SENDING }; return n;
      });

      const t0 = Date.now();
      try {
        const res  = await fetch("/api/send-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: jobs[i].to, subject: formData.subject, message: formData.message }),
        });
        const data = await res.json();
        const dur  = Date.now() - t0;
        setBulkJobs((prev) => {
          const n = [...prev];
          n[i] = { ...n[i], status: res.ok ? STATUS.SUCCESS : STATUS.FAILED,
            duration: dur, error: res.ok ? null : (data.error || "Failed") };
          return n;
        });
      } catch (err) {
        setBulkJobs((prev) => {
          const n = [...prev];
          n[i] = { ...n[i], status: STATUS.FAILED, duration: Date.now() - t0, error: err.message };
          return n;
        });
      }

      if (cancelledRef.current) break;

      if (i < jobs.length - 1) {
        const delay = randomDelay();
        setBulkJobs((prev) => {
          const n = [...prev]; n[i + 1] = { ...n[i + 1], status: STATUS.WAITING }; return n;
        });
        await startCountdown(delay);
        await waitIfPaused();
        if (!cancelledRef.current) {
          setBulkJobs((prev) => {
            const n = [...prev];
            if ([STATUS.WAITING, STATUS.PAUSED].includes(n[i + 1].status))
              n[i + 1] = { ...n[i + 1], status: STATUS.PENDING };
            return n;
          });
        }
        setCountdown(0);
      }
    }

    if (!cancelledRef.current) stopElapsedTicker();
    setIsBulkRunning(false);
    setIsPaused(false);
  }, [bulkEmails, formData]);

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans overflow-hidden relative">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <BulkEmailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        jobs={bulkJobs}
        stats={bulkStats}
        countdown={countdown}
        isPaused={isPaused}
        isBulkRunning={isBulkRunning}
        onPause={handlePause}
        onResume={handleResume}
        onCancel={handleCancel}
      />

      <div className="max-w-2xl w-full bg-slate-800/90 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 mb-2 border border-blue-500/30">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Email Sender</h1>
          <p className="text-slate-400 text-xs">
            From: <span className="text-blue-400 font-mono">abdellahedaoudi.dev@gmail.com</span>
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-slate-900 rounded-xl p-1 mb-4 border border-slate-700">
          {[
            { label: "Single Send", icon: "✉️", value: false },
            { label: "Bulk Send",   icon: "📨", value: true  },
          ].map(({ label, icon, value }) => (
            <button key={label} type="button" onClick={() => setIsBulkMode(value)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                isBulkMode === value ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}>
              <span>{icon}</span><span>{label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}
          className={`space-y-3 flex-1 flex flex-col overflow-y-auto custom-scrollbar pr-1 ${isBulkMode ? "" : "justify-between"}`}>

          {/* TO field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                {isBulkMode ? "Email Addresses (one per line or comma-separated):" : "Recipient Email (To):"}
              </label>
              {isBulkMode && (
                <button type="button" onClick={() => setBulkEmails(FAKE_EMAILS)}
                  className="text-xs font-medium text-purple-400 hover:text-purple-300 transition cursor-pointer shrink-0 ml-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Load Test Emails
                </button>
              )}
            </div>
            {isBulkMode ? (
              <textarea
                placeholder={"contact@company1.ma\nrecrutement@company2.com\njobs@company3.ma"}
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={4}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none custom-scrollbar font-mono"
              />
            ) : (
              <input type="email" name="to" required placeholder="recipient@example.com"
                value={formData.to}
                onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Subject Line:</label>
            <input type="text" name="subject" required placeholder="Enter subject here..."
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Message */}
          <div className={`flex flex-col ${isBulkMode ? "" : "flex-1 min-h-35"}`}>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Message Body:</label>
            <textarea required placeholder="Write your email message here..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={isBulkMode ? 5 : undefined}
              className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none custom-scrollbar ${isBulkMode ? "" : "flex-1"}`}
            />
          </div>

          {/* Anti-spam notice */}
          {isBulkMode && (
            <div className="flex items-start gap-2.5 bg-amber-950/30 border border-amber-800/30 rounded-xl px-3 py-2.5">
              <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-xs text-amber-300 leading-relaxed">
                <strong>Anti-spam protection:</strong> random delay of 8–18 seconds between each email to keep your Gmail account safe.
              </p>
            </div>
          )}

          {/* Action buttons */}
          {isBulkMode ? (
            <div className="flex gap-2 mt-2">
              {/* Start / Sending state */}
              <button type="button" disabled={isBulkRunning} onClick={handleBulkSend}
                className="flex-1 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-indigo-800 disabled:to-purple-800 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-sm">
                {isBulkRunning ? (
                  <><SpinnerIcon className="w-4 h-4" /><span>Sending in progress…</span></>
                ) : (
                  <><SendIcon className="w-4 h-4" /><span>Start Bulk Send</span></>
                )}
              </button>

              {/* Control bar: Pause/Resume + Cancel */}
              {isBulkRunning && (
                <div className="flex gap-1.5 shrink-0">
                  {isPaused ? (
                    <button type="button" onClick={handleResume} title="Resume"
                      className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/40 hover:text-emerald-300 transition-all cursor-pointer">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5.14v14l11-7-11-7z"/>
                      </svg>
                    </button>
                  ) : (
                    <button type="button" onClick={handlePause} title="Pause"
                      className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-400 hover:bg-amber-600/40 hover:text-amber-300 transition-all cursor-pointer">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
                      </svg>
                    </button>
                  )}
                  <button type="button" onClick={handleCancel} title="Cancel"
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/40 hover:text-red-300 transition-all cursor-pointer">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="5" y="5" width="14" height="14" rx="2"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button type="submit" disabled={loading}
              className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed text-sm mt-2">
              {loading ? (
                <><SpinnerIcon className="w-4 h-4 text-white" /><span>Sending Email…</span></>
              ) : (
                <><SendIcon className="w-4 h-4" /><span>Send Email Now</span></>
              )}
            </button>
          )}

          {isBulkRunning && !modalOpen && (
            <button type="button" onClick={() => setModalOpen(true)}
              className="w-full border border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-400 font-medium py-2 px-4 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Progress
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
