import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaSun, FaMoon, FaDesktop, FaCheck } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
    const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const options = [
        { key: "light", label: "Light", icon: FaSun, color: "text-amber-500" },
        { key: "dark", label: "Dark", icon: FaMoon, color: "text-indigo-400" },
        { key: "system", label: "System", icon: FaDesktop, color: "text-slate-400" },
    ];

    return (
        <div className="relative inline-block" ref={menuRef}>
            {/* Quick 1-click Toggle Button (Left Click = Toggle, Right/Dropdown Click = Menu) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-0.5 shadow-sm transition">
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700/60 transition cursor-pointer flex items-center justify-center"
                    title={`Current theme: ${theme} (${resolvedTheme}). Click to toggle.`}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {resolvedTheme === "dark" ? (
                            <motion.div
                                key="moon"
                                initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                            >
                                <FaMoon className="text-sm text-indigo-400" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="sun"
                                initial={{ opacity: 0, rotate: 90, scale: 0.8 }}
                                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                exit={{ opacity: 0, rotate: -90, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                            >
                                <FaSun className="text-sm text-amber-500" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </button>

                {/* Dropdown caret toggle */}
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="px-1.5 py-2 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    title="Theme choices"
                >
                    ▾
                </button>
            </div>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 overflow-hidden"
                    >
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                            Theme Mode
                        </div>

                        {options.map((opt) => {
                            const Icon = opt.icon;
                            const isSelected = theme === opt.key;
                            return (
                                <button
                                    key={opt.key}
                                    onClick={() => {
                                        setTheme(opt.key);
                                        setMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                                        isSelected
                                            ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className={opt.color} />
                                        <span>{opt.label}</span>
                                    </div>
                                    {isSelected && <FaCheck className="text-[10px] text-indigo-600 dark:text-indigo-400" />}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
