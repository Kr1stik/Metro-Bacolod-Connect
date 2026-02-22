import React, { useState, useEffect, useCallback } from "react";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaExclamationTriangle, FaTimes } from "react-icons/fa";
import "./GlassToast.css";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

let toastIdCounter = 0;
let addToastGlobal: ((message: string, type: ToastType) => void) | null = null;

/** Call this from anywhere to show a glassmorphic toast */
export const glassToast = {
  success: (message: string) => addToastGlobal?.(message, "success"),
  error: (message: string) => addToastGlobal?.(message, "error"),
  info: (message: string) => addToastGlobal?.(message, "info"),
  warning: (message: string) => addToastGlobal?.(message, "warning"),
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <FaCheckCircle className="glass-toast-icon glass-toast-icon-success" />,
  error: <FaExclamationCircle className="glass-toast-icon glass-toast-icon-error" />,
  info: <FaInfoCircle className="glass-toast-icon glass-toast-icon-info" />,
  warning: <FaExclamationTriangle className="glass-toast-icon glass-toast-icon-warning" />,
};

export default function GlassToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto-dismiss after 3.5s
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 400); // match exit animation duration
    }, 3500);
  }, []);

  useEffect(() => {
    addToastGlobal = addToast;
    return () => {
      addToastGlobal = null;
    };
  }, [addToast]);

  const dismissToast = (id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 400);
  };

  return (
    <div className="glass-toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`glass-toast glass-toast-${t.type} ${t.exiting ? "glass-toast-exit" : "glass-toast-enter"}`}
        >
          <div className="glass-toast-body">
            {ICONS[t.type]}
            <span className="glass-toast-message">{t.message}</span>
          </div>
          <button className="glass-toast-close" onClick={() => dismissToast(t.id)} aria-label="Close">
            <FaTimes size={12} />
          </button>
          <div className={`glass-toast-progress glass-toast-progress-${t.type}`} />
        </div>
      ))}
    </div>
  );
}
