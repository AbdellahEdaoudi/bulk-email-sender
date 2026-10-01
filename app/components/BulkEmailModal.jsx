"use client";

import { useEffect, useRef } from "react";

const STATUS = {
  PENDING:   "pending",
  SENDING:   "sending",
  SUCCESS:   "success",
  FAILED:    "failed",
  WAITING:   "waiting",
  PAUSED:    "paused",
  CANCELLED: "cancelled",
};

// ── Status Badge ─────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    [STATUS.PENDING]:   { label: "Pending",    ring: "ring-slate-600",   text: "text-slate-400",   bg: "bg-slate-800",       dot: "bg-slate-500" },
    [STATUS.SENDING]:   { label: "Sending",    ring: "ring-blue-500/50", text: "text-blue-300",    bg: "bg-blue-950/60",     dot: "bg-blue-400 animate-pulse" },
    [STATUS.SUCCESS]:   { label: "Sent",       ring: "ring-emerald-500/40", text: "text-emerald-300", bg: "bg-emerald-950/50", dot: "bg-emerald-400" },
    [STATUS.FAILED]:    { label: "Failed",     ring: "ring-red-500/40",  text: "text-red-300",     bg: "bg-red-950/50",      dot: "bg-red-400" },
    [STATUS.WAITING]:   { label: "Waiting",    ring: "ring-amber-500/40", text: "text-amber-300",  bg: "bg-amber-950/40",    dot: "bg-amber-400 animate-pulse" },
    [STATUS.PAUSED]:    { label: "Paused",     ring: "ring-orange-500/40", text: "text-orange-300", bg: "bg-orange-950/40",  dot: "bg-orange-400" },
    [STATUS.CANCELLED]: { label: "Cancelled",  ring: "ring-slate-600",   text: "text-slate-500",   bg: "bg-slate-800/60",    dot: "bg-slate-600" },
  };
  const { label, ring, text, bg, dot } = cfg[status] || cfg[STATUS.PENDING];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ${ring} ${text} ${bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
};

// ── Time formatters ───────────────────────────────────────────
const formatTime = (ms) => {
  if (ms == null) return "--";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
};
const formatCountdown = (ms) => ms <= 0 ? "0s" : `${Math.ceil(ms / 1000)}s`;

// ── Row item colors ───────────────────────────────────────────
const rowCls = {
  [STATUS.SENDING]:   "bg-blue-950/30 border-blue-700/40",
  [STATUS.SUCCESS]:   "bg-emerald-950/20 border-emerald-800/25",
  [STATUS.FAILED]:    "bg-red-950/20 border-red-800/25",
  [STATUS.WAITING]:   "bg-amber-950/20 border-amber-800/25",
  [STATUS.PAUSED]:    "bg-orange-950/20 border-orange-800/25",
  [STATUS.CANCELLED]: "bg-slate-800/30 border-slate-700/25",
  [STATUS.PENDING]:   "bg-slate-800/40 border-slate-700/30",
};

// ── SVG Icons ─────────────────────────────────────────────────
const PauseIcon  = () => <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>;
const PlayIcon   = () => <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5.14v14l11-7-11-7z"/></svg>;
const StopIcon   = () => <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>;
const CloseIcon  = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>;

// ── Modal ─────────────────────────────────────────────────────
export default function BulkEmailModal({
  isOpen, onClose, jobs, stats, countdown,
  isPaused, isBulkRunning, onPause, onResume, onCancel,
}) {
  const listRef = useRef(null);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector("[data-sending='true']");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [jobs]);

  if (!isOpen) return null;

  const sentCount   = jobs.filter((j) => j.status === STATUS.SUCCESS).length;
  const failedCount = jobs.filter((j) => j.status === STATUS.FAILED).length;
  const cancelCount = jobs.filter((j) => j.status === STATUS.CANCELLED).length;
  const doneCount   = sentCount + failedCount + cancelCount;
  const total       = jobs.length;
  const progress    = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const isDone      = stats.finished;
  const isCancelled = stats.cancelled;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-none">Bulk Send Progress</h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time tracking</p>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex items-center gap-2">
            {isBulkRunning && !isDone && (
              <>
                {isPaused ? (
                  <button onClick={onResume} title="Resume sending"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 text-xs font-medium transition-all cursor-pointer">
                    <PlayIcon /> Resume
                  </button>
                ) : (
                  <button onClick={onPause} title="Pause sending"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/15 border border-amber-500/30 text-amber-400 hover:bg-amber-600/30 text-xs font-medium transition-all cursor-pointer">
                    <PauseIcon /> Pause
                  </button>
                )}
                <button onClick={onCancel} title="Cancel all"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/15 border border-red-500/30 text-red-400 hover:bg-red-600/30 text-xs font-medium transition-all cursor-pointer">
                  <StopIcon /> Cancel
                </button>
              </>
            )}
            <button onClick={onClose} title="Close"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="px-5 py-4 border-b border-slate-800 space-y-3">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-400">{doneCount} / {total} processed</span>
              <span className="text-xs font-mono font-semibold text-blue-400">{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isCancelled ? "bg-red-500" : isDone ? "bg-emerald-500" : "bg-linear-to-r from-blue-500 to-indigo-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: total,       label: "Total",     cls: "text-white",        card: "bg-slate-800 border-slate-700" },
              { value: sentCount,   label: "Sent",      cls: "text-emerald-400",  card: "bg-emerald-950/30 border-emerald-800/30" },
              { value: failedCount, label: "Failed",    cls: "text-red-400",      card: "bg-red-950/30 border-red-800/30" },
              { value: formatTime(stats.elapsed), label: "Duration", cls: "text-blue-400 font-mono", card: "bg-slate-800 border-slate-700" },
            ].map(({ value, label, cls, card }) => (
              <div key={label} className={`rounded-xl p-2.5 text-center border ${card}`}>
                <div className={`text-lg font-bold leading-none ${cls}`}>{value}</div>
                <div className="text-xs text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Status banners */}
          {isPaused && !isDone && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-950/30 border border-orange-700/30">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
              <span className="text-xs text-orange-300 font-medium">Paused — click Resume to continue</span>
            </div>
          )}
          {!isPaused && !isDone && countdown > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-950/25 border border-amber-800/25">
              <svg className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span className="text-xs text-amber-300">
                Anti-spam pause — next email in <strong className="font-mono">{formatCountdown(countdown)}</strong>
              </span>
            </div>
          )}
          {isDone && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
              isCancelled
                ? "bg-red-950/25 border-red-700/30"
                : "bg-emerald-950/30 border-emerald-700/30"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCancelled ? "bg-red-400" : "bg-emerald-400"}`} />
              <span className={`text-xs font-medium ${isCancelled ? "text-red-300" : "text-emerald-300"}`}>
                {isCancelled
                  ? `Cancelled — ${sentCount} sent, ${failedCount} failed, ${cancelCount} skipped in ${formatTime(stats.elapsed)}`
                  : `Complete — ${sentCount} sent, ${failedCount} failed in ${formatTime(stats.elapsed)}`
                }
              </span>
            </div>
          )}
        </div>

        {/* ── Email List ── */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5 custom-scrollbar">
          {jobs.map((job, idx) => (
            <div
              key={idx}
              data-sending={job.status === STATUS.SENDING ? "true" : "false"}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors duration-300 ${rowCls[job.status] || rowCls[STATUS.PENDING]}`}
            >
              <span className="w-6 text-center text-xs text-slate-500 font-mono shrink-0 select-none">{idx + 1}</span>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  job.status === STATUS.CANCELLED ? "text-slate-500 line-through" : "text-white"
                }`}>{job.to}</p>
                {job.error && (
                  <p className="text-xs text-red-400 truncate mt-0.5">{job.error}</p>
                )}
              </div>

              {job.duration != null && (
                <span className="text-xs font-mono text-slate-500 shrink-0">{formatTime(job.duration)}</span>
              )}

              <StatusBadge status={job.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
