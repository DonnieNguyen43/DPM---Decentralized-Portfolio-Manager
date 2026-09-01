import { createContext, useContext, useState, useCallback, useRef } from "react";

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── Single Toast Item ─────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }) {
  const { id, type, title, message, txHash, explorerUrl, duration = 5000, progress } = toast;

  const handleClose = () => onRemove(id);

  return (
    <div className={`toast ${type}`} role="alert" aria-live="assertive">
      {/* Icon */}
      <div className="toast-icon">
        {type === "success" && <CheckIcon />}
        {type === "error"   && <XCircleIcon />}
        {type === "warn"    && <AlertIcon />}
        {type === "pending" && <div className="toast-spinner" />}
      </div>

      {/* Content */}
      <div className="toast-content">
        <div className="toast-title">{title}</div>
        {message && <div className="toast-message">{message}</div>}
        {txHash && explorerUrl && (
          <a
            className="toast-link"
            href={`${explorerUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Explorer <ExternalLinkIcon />
          </a>
        )}
      </div>

      {/* Close */}
      {type !== "pending" && (
        <button className="toast-close" onClick={handleClose} aria-label="Dismiss notification">
          <CloseIcon />
        </button>
      )}

      {/* Progress bar (only for auto-dismiss toasts) */}
      {type !== "pending" && duration > 0 && (
        <div
          className="toast-progress"
          style={{
            animation: `toastProgress ${duration}ms linear forwards`,
          }}
        />
      )}

      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timerRefs = useRef({});

  const removeToast = useCallback((id) => {
    if (timerRefs.current[id]) {
      clearTimeout(timerRefs.current[id]);
      delete timerRefs.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * toast({ type, title, message, txHash, explorerUrl, duration })
   * Returns the toast id (useful for updating a pending toast)
   */
  const toast = useCallback(
    ({ type = "success", title, message, txHash, explorerUrl, duration = 5000 }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, type, title, message, txHash, explorerUrl, duration }]);

      // Auto-dismiss non-pending toasts
      if (type !== "pending" && duration > 0) {
        timerRefs.current[id] = setTimeout(() => removeToast(id), duration);
      }

      return id;
    },
    [removeToast]
  );

  /**
   * updateToast(id, fields) — e.g. update a pending→success after tx confirms
   */
  const updateToast = useCallback(
    (id, fields) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...fields } : t))
      );

      // If updating to non-pending, start auto-dismiss
      if (fields.type && fields.type !== "pending") {
        const duration = fields.duration ?? 5000;
        if (duration > 0) {
          if (timerRefs.current[id]) clearTimeout(timerRefs.current[id]);
          timerRefs.current[id] = setTimeout(() => removeToast(id), duration);
        }
      }
    },
    [removeToast]
  );

  // Convenience methods
  const toastSuccess = useCallback(
    (title, opts = {}) => toast({ type: "success", title, ...opts }),
    [toast]
  );
  const toastError = useCallback(
    (title, opts = {}) => toast({ type: "error", title, duration: 8000, ...opts }),
    [toast]
  );
  const toastPending = useCallback(
    (title, opts = {}) => toast({ type: "pending", title, duration: 0, ...opts }),
    [toast]
  );
  const toastWarn = useCallback(
    (title, opts = {}) => toast({ type: "warn", title, duration: 6000, ...opts }),
    [toast]
  );

  return (
    <ToastContext.Provider
      value={{ toast, updateToast, removeToast, toastSuccess, toastError, toastPending, toastWarn }}
    >
      {children}

      {/* Toast Container */}
      <div className="toast-container" aria-label="Notifications" role="region">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
