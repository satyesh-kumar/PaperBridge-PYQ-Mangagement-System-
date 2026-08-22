import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
    theme: "system",
    resolvedTheme: "light",
    setTheme: () => {},
    toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        return localStorage.getItem("paperbridge-theme") || "light";
    });

    const [resolvedTheme, setResolvedTheme] = useState(() => {
        if (typeof window === "undefined") return "light";
        const saved = localStorage.getItem("paperbridge-theme") || "light";
        if (saved === "dark") return "dark";
        if (saved === "light") return "light";
        return "light";
    });

    useEffect(() => {
        const root = document.documentElement;

        const applyTheme = (currentTheme) => {
            let active = currentTheme;
            if (currentTheme === "system") {
                active = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            }

            setResolvedTheme(active);

            if (active === "dark") {
                root.classList.add("dark");
                root.setAttribute("data-theme", "dark");
            } else {
                root.classList.remove("dark");
                root.setAttribute("data-theme", "light");
            }
        };

        applyTheme(theme);

        // Listen for system changes if set to system
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleMediaChange = () => {
            if (theme === "system") {
                applyTheme("system");
            }
        };

        mediaQuery.addEventListener("change", handleMediaChange);
        return () => mediaQuery.removeEventListener("change", handleMediaChange);
    }, [theme]);

    const setTheme = (newTheme) => {
        setThemeState(newTheme);
        localStorage.setItem("paperbridge-theme", newTheme);
    };

    const toggleTheme = () => {
        if (resolvedTheme === "dark") {
            setTheme("light");
        } else {
            setTheme("dark");
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
