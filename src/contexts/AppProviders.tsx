"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

// ============================================================
// THEME CONTEXT — Pro, Chic, Starbucks, Landing
// ============================================================

type Theme = "pro" | "chic" | "starbucks" | "landing";
type Mode = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  mode: Mode;
  setTheme: (t: Theme) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "pro",
  mode: "dark",
  setTheme: () => {},
  toggleMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("pro");
  const [mode, setModeState] = useState<Mode>("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("mbakasir_theme") as Theme | null;
    const validThemes: Theme[] = ["pro", "chic", "starbucks", "landing"];
    if (savedTheme && validThemes.includes(savedTheme)) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme === "pro" ? "" : savedTheme);
    }
    
    const savedMode = localStorage.getItem("mbakasir_mode") as Mode | null;
    if (savedMode === "dark" || savedMode === "light") {
      setModeState(savedMode);
      document.documentElement.setAttribute("data-mode", savedMode === "light" ? "light" : "");
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("mbakasir_theme", newTheme);
    // data-theme empty for 'pro' (default)
    document.documentElement.setAttribute("data-theme", newTheme === "pro" ? "" : newTheme);
  }, []);

  const toggleMode = useCallback(() => {
    const newMode = mode === "dark" ? "light" : "dark";
    setModeState(newMode);
    localStorage.setItem("mbakasir_mode", newMode);
    document.documentElement.setAttribute("data-mode", newMode === "light" ? "light" : "");
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}



// ============================================================
// TOAST CONTEXT — Toast di tengah layar, maks 1.5 detik
// ============================================================

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const ICONS: Record<ToastType, string> = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    // Animasi exit dulu
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 150);
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev.slice(-1), { id, message, type }]); // max 2 toast
      const timer = setTimeout(() => removeToast(id), 1400); // 1.4s + 0.15s exit = 1.55s
      timers.current.set(id, timer);
    },
    [removeToast]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Portal */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}${t.exiting ? " exiting" : ""}`}
            role="alert"
          >
            <span>{ICONS[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// ============================================================
// AUTH CONTEXT — Session user di client-side
// ============================================================

interface SessionUser {
  sub: string;
  email: string;
  role: "SUPERADMIN" | "AGENT" | "TENANT" | "CASHIER";
  tenantId?: string;
  agentId?: string;
  name: string;
  pin?: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  refetch: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      
      // EDU MODE: Auto Reset on Logout
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/edu")) {
        const { getDb } = await import("@/lib/db");
        try {
          const db = getDb();
          // Hapus seluruh database lokal untuk keamanan & kebersihan training
          await db.delete(); 
          localStorage.clear();
        } catch (dbErr) {
          console.error("Gagal membersihkan data EDU:", dbErr);
        }
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      window.location.href = "/";
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <AuthContext.Provider value={{ user, isLoading, refetch, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
