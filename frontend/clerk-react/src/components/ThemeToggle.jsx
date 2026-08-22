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
        { key: "light", label: "Warm Light", icon: FaSun, color: "text-[#C5A059]" },
        { key: "dark", label: "Obsidian Dark", icon: FaMoon, color: "text-[#E5C378]" },
        { key: "system", label: "System Sync", icon: FaDesktop, color: "text-[#8C7862]" },
    ];

    return (
        <div className="relative inline-block" ref={menuRef}>
            {/* Quick 1-click Toggle Button */}
            <div className="flex items-center bg-[#F4EFEA] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full p-0.5 shadow-2xs transition">
                <button
                    onClick={toggleTheme}
                    className="p-1.5 rounded-full text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#2B231B] dark:hover:text-[#FAF8F5] hover:bg-white dark:hover:bg-[#29241F] transition cursor-pointer flex items-center justify-center"
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
                                <FaMoon className="text-xs text-[#E5C378]" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="sun"
                                initial={{ opacity: 0, rotate: 90, scale: 0.8 }}
                                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                exit={{ opacity: 0, rotate: -90, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                            >
                                <FaSun className="text-xs text-[#C5A059]" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </button>

                {/* Dropdown caret toggle */}
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="px-1.5 py-1 text-[10px] text-[#A8957E] hover:text-[#4A3E31] dark:hover:text-[#FAF8F5] transition cursor-pointer"
                    title="Theme selection"
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
                        className="absolute right-0 mt-2 w-40 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-2xl shadow-xl p-1.5 z-50 overflow-hidden"
                    >
                        <div className="text-[9px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-widest px-2.5 py-1">
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
                                            ? "bg-[#FAF8F5] dark:bg-[#24201C] text-[#4A2E1B] dark:text-[#E5C378]"
                                            : "text-[#6B5B49] dark:text-[#C2B3A0] hover:bg-[#F4EFEA] dark:hover:bg-[#1C1916]"
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className={opt.color} />
                                        <span>{opt.label}</span>
                                    </div>
                                    {isSelected && <FaCheck className="text-[10px] text-[#8C6239] dark:text-[#E5C378]" />}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
