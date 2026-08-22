import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
    FaSearch,
    FaFilePdf,
    FaStickyNote,
    FaGraduationCap,
    FaUniversity,
    FaArrowRight,
    FaTimes,
    FaBook,
    FaUpload,
    FaHome,
    FaShieldAlt,
} from "react-icons/fa";
import PDFViewer from "./PDFViewer";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [papers, setPapers] = useState([]);
    const [notes, setNotes] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [previewPdf, setPreviewPdf] = useState(null);

    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Global keyboard listener: Ctrl+K / Cmd+K to open, Escape to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            } else if (e.key === "Escape" && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    // Open from custom event
    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener("open_command_palette", handleOpen);
        return () => window.removeEventListener("open_command_palette", handleOpen);
    }, []);

    // Focus input on open & fetch records
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            axios
                .get(`${API_URL}/api/pyqs`, { timeout: 10000 })
                .then((res) => setPapers(Array.isArray(res.data) ? res.data : []))
                .catch(() => {});
            axios
                .get(`${API_URL}/api/notes`, { timeout: 10000 })
                .then((res) => setNotes(Array.isArray(res.data) ? res.data : []))
                .catch(() => {});
        } else {
            setQuery("");
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Quick navigation actions
    const quickActions = [
        { id: "act_browse", title: "Browse Question Papers", type: "action", icon: FaFilePdf, path: "/browse" },
        { id: "act_notes", title: "Browse Study Notes & Summaries", type: "action", icon: FaStickyNote, path: "/notes" },
        { id: "act_upload", title: "Upload Academic Paper / Notes", type: "action", icon: FaUpload, path: "/upload" },
        { id: "act_dash", title: "My Library & Bookmarks", type: "action", icon: FaBook, path: "/dashboard" },
    ];

    // Filter results
    const filteredResults = React.useMemo(() => {
        if (!query.trim()) {
            return quickActions;
        }

        const q = query.toLowerCase().trim();
        const results = [];

        // Direct search everywhere action at the top
        results.push({
            id: "act_search_all",
            title: `Search all for "${query.trim()}"`,
            subtitle: "Press Enter to open full repository search",
            type: "action",
            icon: FaSearch,
            path: `/browse?q=${encodeURIComponent(query.trim())}`,
        });

        // Papers
        papers.forEach((p) => {
            const title = (p.title || "").toLowerCase();
            const course = (p.courseId?.name || p.course || "").toLowerCase();
            const sub = (p.subjectId?.name || p.subject || "").toLowerCase();
            const uni = (p.universityId?.name || p.university || "").toLowerCase();
            if (title.includes(q) || course.includes(q) || sub.includes(q) || uni.includes(q)) {
                results.push({
                    id: `p_${p._id}`,
                    title: p.title,
                    subtitle: `${p.courseId?.name || p.course || "General"} • ${p.universityId?.name || p.university || "University"} • Sem ${p.semester || 1}`,
                    type: "paper",
                    icon: FaFilePdf,
                    item: p,
                });
            }
        });

        // Notes
        notes.forEach((n) => {
            const title = (n.title || "").toLowerCase();
            const sub = (n.subjectId?.name || n.subject || "").toLowerCase();
            if (title.includes(q) || sub.includes(q)) {
                results.push({
                    id: `n_${n._id}`,
                    title: n.title,
                    subtitle: `${n.subjectId?.name || n.subject || "General"} • ${n.unit || "Notes"}`,
                    type: "note",
                    icon: FaStickyNote,
                    item: n,
                });
            }
        });

        // Add matching actions
        quickActions.forEach((act) => {
            if (act.title.toLowerCase().includes(q)) {
                results.push(act);
            }
        });

        return results.slice(0, 9);
    }, [query, papers, notes]);

    // Handle selection
    const handleSelect = (item) => {
        if (!item) return;
        setIsOpen(false);
        if (item.type === "action") {
            navigate(item.path);
        } else if (item.type === "paper" || item.type === "note") {
            setPreviewPdf(item.item);
        }
    };

    // Keyboard navigation (Up/Down/Enter)
    const handleKeyDown = (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filteredResults[selectedIndex]) {
                handleSelect(filteredResults[selectedIndex]);
            }
        }
    };

    if (!isOpen) {
        return (
            <>
                {previewPdf && (
                    <PDFViewer
                        fileUrl={previewPdf.fileUrl}
                        title={previewPdf.title}
                        onClose={() => setPreviewPdf(null)}
                    />
                )}
            </>
        );
    }

    return (
        <>
            <div
                className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-start justify-center pt-20 sm:pt-28 px-4 animate-in fade-in duration-200"
                onClick={() => setIsOpen(false)}
            >
                <div
                    className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Search Input Bar */}
                    <div className="flex items-center px-5 py-4 border-b border-[#EAE2D8] dark:border-[#2E2822] gap-3 bg-[#FAF8F5] dark:bg-[#1C1916]">
                        <FaSearch className="text-[#8C6239] dark:text-[#E5C378] text-sm shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelectedIndex(0);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Type to search papers, courses, subjects, or actions..."
                            className="w-full bg-transparent outline-none text-xs sm:text-sm text-[#0D1B2A] dark:text-[#FAF8F5] placeholder-[#8C7862] font-medium"
                        />
                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-2 py-0.5 rounded-lg bg-[#EAE2D8] dark:bg-[#24201C] text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E]"
                        >
                            ESC
                        </button>
                    </div>

                    {/* Results List */}
                    <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#F4EFEA] dark:divide-[#24201C]">
                        {filteredResults.length === 0 ? (
                            <div className="py-10 text-center text-xs text-[#8C7862]">
                                No results found for "{query}".
                            </div>
                        ) : (
                            filteredResults.map((res, index) => {
                                const Icon = res.icon;
                                const isSelected = index === selectedIndex;
                                return (
                                    <div
                                        key={res.id}
                                        onClick={() => handleSelect(res)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={`flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition ${
                                            isSelected
                                                ? "bg-[#0D1B2A] text-white dark:bg-[#C89D5C] dark:text-[#0D1B2A]"
                                                : "hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916] text-[#1A1614] dark:text-[#FAF8F5]"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                                                    isSelected
                                                        ? "bg-white/20 text-white dark:text-[#0D1B2A]"
                                                        : "bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378]"
                                                }`}
                                            >
                                                <Icon />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-xs truncate">{res.title}</p>
                                                {res.subtitle && (
                                                    <p
                                                        className={`text-[10px] truncate ${
                                                            isSelected
                                                                ? "text-white/80 dark:text-[#0D1B2A]/80"
                                                                : "text-[#8C7862] dark:text-[#A8957E]"
                                                        }`}
                                                    >
                                                        {res.subtitle}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs opacity-60 ml-2">↵</span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer Tips */}
                    <div className="px-5 py-2.5 bg-[#FAF8F5] dark:bg-[#1C1916] border-t border-[#EAE2D8] dark:border-[#2E2822] flex items-center justify-between text-[10px] text-[#8C7862] dark:text-[#A8957E]">
                        <div className="flex items-center gap-2">
                            <span>Navigate: <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#24201C] border border-[#DDD2C4] dark:border-[#332E28]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#24201C] border border-[#DDD2C4] dark:border-[#332E28]">↓</kbd></span>
                            <span>Select: <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#24201C] border border-[#DDD2C4] dark:border-[#332E28]">Enter</kbd></span>
                        </div>
                        <span className="font-semibold">PaperBridge Spotlight</span>
                    </div>
                </div>
            </div>

            {/* Direct PDF Viewer Modal */}
            {previewPdf && (
                <PDFViewer
                    fileUrl={previewPdf.fileUrl}
                    title={previewPdf.title}
                    onClose={() => setPreviewPdf(null)}
                />
            )}
        </>
    );
}
