import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { doc, getDoc } from "firebase/firestore";

/** Routes where dark mode is allowed. All others stay light. */
const DARK_MODE_PATHS = ["/dashboard", "/profile", "/archive", "/settings", "/messages"];

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  resolvedTheme: "light" | "dark"; // What is actually applied
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
  resolvedTheme: "light",
});

export const useTheme = () => useContext(ThemeContext);

function getSystemPreference(): "light" | "dark" {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function resolveTheme(theme: ThemeMode): "light" | "dark" {
  if (theme === "system") return getSystemPreference();
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    // Read from localStorage first for instant apply (no flash)
    const saved = localStorage.getItem("mbc-theme") as ThemeMode | null;
    return saved || "light";
  });

  const resolvedTheme = resolveTheme(theme);

  /** Dark mode only applies on internal app pages, not public pages like the landing page */
  const isDarkEligible = DARK_MODE_PATHS.some((p) => location.pathname.startsWith(p));

  // Apply theme to document
  useEffect(() => {
    const resolved = isDarkEligible ? resolveTheme(theme) : "light";
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
    localStorage.setItem("mbc-theme", theme);
  }, [theme, isDarkEligible]);

  // Listen for system preference changes when in "system" mode
  useEffect(() => {
    if (theme !== "system" || !isDarkEligible) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      document.documentElement.setAttribute("data-theme", getSystemPreference());
      document.documentElement.style.colorScheme = getSystemPreference();
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, isDarkEligible]);

  // Load theme from Firestore user preferences on auth
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const prefs = userDoc.data()?.preferences;
            if (prefs?.theme && ["light", "dark", "system"].includes(prefs.theme)) {
              setThemeState(prefs.theme);
              localStorage.setItem("mbc-theme", prefs.theme);
            }
          }
        } catch (err) {
          // Silently fail — keep localStorage/default theme
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeContext;
