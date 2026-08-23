import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  Show,
} from "@clerk/react";
import axios from "axios";
import {
  FaShieldAlt,
  FaStickyNote,
  FaBook,
  FaSearch,
  FaFilePdf,
  FaTimes,
  FaArrowRight,
  FaExternalLinkAlt,
  FaUniversity,
} from "react-icons/fa";
import { useIsAdmin } from "../hooks/useIsAdmin";
import ThemeToggle from "./ThemeToggle";
import PaperBridgeLogo from "./PaperBridgeLogo";
import PDFViewer from "./PDFViewer";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Navbar() {
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [papers, setPapers] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [previewPdf, setPreviewPdf] = useState(null);
  const [hasFetchedData, setHasFetchedData] = useState(false);

  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const mobileInputRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  // Fetch papers and notes data for fast instant search
  const loadSearchData = async () => {
    if (hasFetchedData) return;
    try {
      const [pyqRes, notesRes] = await Promise.all([
        axios.get(`${API_URL}/api/pyqs`, { timeout: 8000 }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/notes`, { timeout: 8000 }).catch(() => ({ data: [] })),
      ]);
      if (Array.isArray(pyqRes.data)) setPapers(pyqRes.data);
      if (Array.isArray(notesRes.data)) setNotes(notesRes.data);
      setHasFetchedData(true);
    } catch {
      // ignore error, search will fall back to direct navigation
    }
  };

  // Preload data on mount or when user focuses search
  useEffect(() => {
    loadSearchData();
  }, []);

  // Global hotkey: Ctrl+K / Cmd+K focuses search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsDropdownOpen(true);
      } else if (e.key === "Escape") {
        setIsDropdownOpen(false);
        setIsMobileSearchOpen(false);
        setSelectedIndex(-1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter papers and notes based on current search query
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    const results = [];

    // Search papers
    papers.forEach((p) => {
      const title = (p.title || "").toLowerCase();
      const course = (p.courseId?.name || p.course || "").toLowerCase();
      const subject = (p.subjectId?.name || p.subject || "").toLowerCase();
      const subjectCode = (p.subjectId?.code || p.subjectCode || "").toLowerCase();
      const university = (p.universityId?.name || p.university || "").toLowerCase();

      if (
        title.includes(q) ||
        course.includes(q) ||
        subject.includes(q) ||
        subjectCode.includes(q) ||
        university.includes(q)
      ) {
        results.push({
          id: `p_${p._id}`,
          title: p.title || "Question Paper",
          subtitle: `${p.courseId?.name || p.course || "Course"} • Sem ${p.semester || "1"} • ${p.universityId?.name || p.university || "University"}`,
          type: "paper",
          item: p,
        });
      }
    });

    // Search notes
    notes.forEach((n) => {
      const title = (n.title || "").toLowerCase();
      const subject = (n.subjectId?.name || n.subject || "").toLowerCase();
      const course = (n.courseId?.name || n.course || "").toLowerCase();
      const unit = (n.unit || "").toLowerCase();

      if (title.includes(q) || subject.includes(q) || course.includes(q) || unit.includes(q)) {
        results.push({
          id: `n_${n._id}`,
          title: n.title || "Study Note",
          subtitle: `${n.subjectId?.name || n.subject || "Subject"} • ${n.unit || "Notes"}`,
          type: "note",
          item: n,
        });
      }
    });

    return results.slice(0, 7);
  }, [searchQuery, papers, notes]);

  // Execute selection
  const handleSelectResult = (result) => {
    setIsDropdownOpen(false);
    setIsMobileSearchOpen(false);
    setSearchQuery("");
    setSelectedIndex(-1);

    if (result.type === "paper" || result.type === "note") {
      if (result.item?.fileUrl) {
        setPreviewPdf(result.item);
      } else {
        navigate(`/browse?q=${encodeURIComponent(result.title)}`);
      }
    }
  };

  // Submit full repository search
  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    if (selectedIndex >= 0 && searchResults[selectedIndex]) {
      handleSelectResult(searchResults[selectedIndex]);
      return;
    }

    const query = searchQuery.trim();
    setIsDropdownOpen(false);
    setIsMobileSearchOpen(false);
    setSearchQuery("");
    setSelectedIndex(-1);
    navigate(`/browse?q=${encodeURIComponent(query)}`);
  };

  // Keyboard navigation for dropdown
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isDropdownOpen) setIsDropdownOpen(true);
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSearchSubmit();
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
      setSelectedIndex(-1);
      searchInputRef.current?.blur();
    }
  };

  return (
    <>
      <nav className="w-full sticky top-0 z-50 bg-[#FAF8F5]/95 dark:bg-[#0F0E0D]/95 backdrop-blur-md border-b border-[#EAE2D8] dark:border-[#24201C] transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2.5 gap-2 sm:gap-4">

          {/* Brand Logo */}
          <div className="shrink-0">
            <PaperBridgeLogo
              variant="horizontal"
              size="md"
              subtitle="FAST ACCESS TO PAST PAPERS"
            />
          </div>

          {/* Center: Navigation Links */}
          <div className="hidden lg:flex items-center gap-1.5 text-sm font-medium text-[#6B5B49] dark:text-[#C2B3A0]">
            <Link
              to="/browse"
              className={`px-3.5 py-1.5 rounded-full transition text-xs font-semibold ${
                isActive("/browse")
                  ? "bg-[#EAE2D8] dark:bg-[#24201C] text-[#2B231B] dark:text-[#FAF8F5]"
                  : "hover:bg-[#F4EFEA] dark:hover:bg-[#1C1916] hover:text-[#2B231B] dark:hover:text-[#FAF8F5]"
              }`}
            >
              Browse Papers
            </Link>
            <Link
              to="/notes"
              className={`px-3.5 py-1.5 rounded-full transition text-xs font-semibold ${
                isActive("/notes")
                  ? "bg-[#EAE2D8] dark:bg-[#24201C] text-[#2B231B] dark:text-[#FAF8F5]"
                  : "hover:bg-[#F4EFEA] dark:hover:bg-[#1C1916] hover:text-[#2B231B] dark:hover:text-[#FAF8F5]"
              }`}
            >
              Study Notes
            </Link>
            <Link
              to="/upload"
              className={`px-3.5 py-1.5 rounded-full transition text-xs font-semibold ${
                isActive("/upload")
                  ? "bg-[#EAE2D8] dark:bg-[#24201C] text-[#2B231B] dark:text-[#FAF8F5]"
                  : "hover:bg-[#F4EFEA] dark:hover:bg-[#1C1916] hover:text-[#2B231B] dark:hover:text-[#FAF8F5]"
              }`}
            >
              Upload Paper
            </Link>

            <Show when="signed-in">
              <Link
                to="/dashboard"
                className={`px-3.5 py-1.5 rounded-full transition text-xs font-semibold ${
                  isActive("/dashboard")
                    ? "bg-[#EAE2D8] dark:bg-[#24201C] text-[#2B231B] dark:text-[#FAF8F5]"
                    : "hover:bg-[#F4EFEA] dark:hover:bg-[#1C1916] hover:text-[#2B231B] dark:hover:text-[#FAF8F5]"
                }`}
              >
                My Library
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  className={`ml-1 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition ${
                    isActive("/admin")
                      ? "bg-[#4A2E1B] text-white border-[#4A2E1B] dark:bg-[#C5A059] dark:text-[#0F0E0D] dark:border-[#C5A059]"
                      : "bg-[#F4EFEA] dark:bg-[#1C1916] text-[#8C6239] dark:text-[#E5C378] border-[#DDD2C4] dark:border-[#332E28] hover:bg-[#EAE2D8] dark:hover:bg-[#24201C]"
                  }`}
                >
                  <FaShieldAlt className="text-[10px]" /> Admin
                </Link>
              )}
            </Show>
          </div>

          {/* Right Side: Interactive Search Bar + Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop / Tablet Live Search Input */}
            <div ref={searchContainerRef} className="relative hidden md:block w-48 sm:w-60 lg:w-72">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <FaSearch className="absolute left-3 text-xs text-[#8C6239] dark:text-[#E5C378] pointer-events-none transition-colors" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                    setSelectedIndex(-1);
                  }}
                  onFocus={() => {
                    loadSearchData();
                    setIsDropdownOpen(true);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search papers, notes, subjects..."
                  className="w-full pl-8 pr-12 py-1.5 rounded-full bg-[#FAF8F5] dark:bg-[#161412] border border-[#DDD2C4] dark:border-[#2E2822] text-[#2B231B] dark:text-[#FAF8F5] placeholder-[#8C7862] text-xs font-medium focus:outline-hidden focus:border-[#8C6239] dark:focus:border-[#C5A059] focus:ring-2 focus:ring-[#8C6239]/15 dark:focus:ring-[#C5A059]/15 transition shadow-2xs"
                  aria-label="Search Question Papers and Study Notes"
                />
                
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsDropdownOpen(false);
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 p-1 rounded-full text-[#8C7862] hover:text-[#0D1B2A] dark:hover:text-[#FAF8F5] text-xs"
                    title="Clear search"
                  >
                    <FaTimes />
                  </button>
                ) : (
                  <kbd className="absolute right-2.5 px-1.5 py-0.5 rounded bg-white dark:bg-[#24201C] border border-[#DDD2C4] dark:border-[#332E28] text-[9px] font-mono font-bold text-[#8C7862] dark:text-[#A8957E] pointer-events-none shadow-2xs">
                    ⌘K
                  </kbd>
                )}
              </form>

              {/* Instant Search Dropdown */}
              {isDropdownOpen && searchQuery.trim() && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Top Header: Search everywhere in browse */}
                  <div
                    onClick={handleSearchSubmit}
                    className="flex items-center justify-between px-3.5 py-2.5 bg-[#FAF8F5] dark:bg-[#1C1916] border-b border-[#EAE2D8] dark:border-[#2E2822] cursor-pointer hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] transition text-xs"
                  >
                    <div className="flex items-center gap-2 text-[#8C6239] dark:text-[#E5C378] font-semibold truncate">
                      <FaSearch className="text-[11px] shrink-0" />
                      <span className="truncate">Search all for "{searchQuery.trim()}"</span>
                    </div>
                    <span className="text-[10px] text-[#8C7862] dark:text-[#A8957E] font-medium shrink-0 ml-2">
                      Enter ↵
                    </span>
                  </div>

                  {/* Matching Results List */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#F4EFEA] dark:divide-[#24201C] p-1">
                    {searchResults.length === 0 ? (
                      <div className="py-6 px-4 text-center">
                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E]">
                          No direct title matches found.
                        </p>
                        <button
                          type="button"
                          onClick={handleSearchSubmit}
                          className="mt-2 text-xs font-semibold text-[#8C6239] dark:text-[#E5C378] hover:underline"
                        >
                          Search repository for "{searchQuery.trim()}" →
                        </button>
                      </div>
                    ) : (
                      searchResults.map((res, index) => {
                        const isSelected = index === selectedIndex;
                        const isPaper = res.type === "paper";
                        return (
                          <div
                            key={res.id}
                            onClick={() => handleSelectResult(res)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition text-xs ${
                              isSelected
                                ? "bg-[#4A2E1B] text-white dark:bg-[#C5A059] dark:text-[#0F0E0D]"
                                : "hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916] text-[#2B231B] dark:text-[#FAF8F5]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                                  isSelected
                                    ? "bg-white/20 text-white dark:text-[#0F0E0D]"
                                    : isPaper
                                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {isPaper ? <FaFilePdf /> : <FaStickyNote />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold truncate text-xs">{res.title}</p>
                                <p
                                  className={`text-[10px] truncate ${
                                    isSelected
                                      ? "text-white/80 dark:text-[#0F0E0D]/80"
                                      : "text-[#8C7862] dark:text-[#A8957E]"
                                  }`}
                                >
                                  {res.subtitle}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] opacity-60 ml-2 shrink-0">Preview</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer Quick Links */}
                  <div className="flex items-center justify-between px-3 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border-t border-[#EAE2D8] dark:border-[#2E2822] text-[10px] text-[#8C7862] dark:text-[#A8957E]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
                      }}
                      className="hover:text-[#8C6239] dark:hover:text-[#E5C378] font-medium"
                    >
                      In Question Papers ↗
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        navigate(`/notes?q=${encodeURIComponent(searchQuery.trim())}`);
                      }}
                      className="hover:text-[#8C6239] dark:hover:text-[#E5C378] font-medium"
                    >
                      In Study Notes ↗
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Search Button Trigger */}
            <button
              type="button"
              onClick={() => {
                loadSearchData();
                setIsMobileSearchOpen(true);
                setTimeout(() => mobileInputRef.current?.focus(), 50);
              }}
              className="md:hidden p-2 rounded-full bg-[#FAF8F5] dark:bg-[#161412] border border-[#DDD2C4] dark:border-[#2E2822] text-[#8C7862] dark:text-[#A8957E] hover:text-[#2B231B] dark:hover:text-[#FAF8F5] text-xs cursor-pointer shadow-2xs"
              title="Search"
              aria-label="Search"
            >
              <FaSearch className="text-xs text-[#8C6239] dark:text-[#E5C378]" />
            </button>

            <ThemeToggle />

            {/* Clerk Authentication Controls */}
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button
                  id="navbar-signin-btn"
                  className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#DDD2C4] dark:border-[#332E28] bg-white/70 dark:bg-[#1C1916] hover:bg-white dark:hover:bg-[#24201C] text-[#4A3E31] dark:text-[#EAE2D8] transition text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  id="navbar-signup-btn"
                  className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] transition text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>Dashboard</span>
                  <span className="text-[11px]">↗</span>
                </button>
              </SignUpButton>
            </Show>

            <Show when="signed-in">
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] transition text-xs font-semibold cursor-pointer shadow-xs"
              >
                <span>Dashboard</span>
                <span className="text-[11px]">↗</span>
              </Link>
              <div className="flex items-center pl-1">
                <UserButton afterSignOutUrl="/" />
              </div>
            </Show>
          </div>
        </div>
      </nav>

      {/* Mobile Search Modal Overlay */}
      {isMobileSearchOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-start justify-center pt-16 px-3 animate-in fade-in duration-150 md:hidden"
          onClick={() => setIsMobileSearchOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <form onSubmit={handleSearchSubmit} className="flex items-center px-4 py-3.5 border-b border-[#EAE2D8] dark:border-[#2E2822] gap-2.5 bg-[#FAF8F5] dark:bg-[#1C1916]">
              <FaSearch className="text-[#8C6239] dark:text-[#E5C378] text-sm shrink-0" />
              <input
                ref={mobileInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search papers, notes, subjects..."
                className="w-full bg-transparent outline-hidden text-xs text-[#2B231B] dark:text-[#FAF8F5] placeholder-[#8C7862] font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 text-[#8C7862] hover:text-[#0D1B2A] text-xs"
                >
                  <FaTimes />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="px-2 py-0.5 rounded bg-[#EAE2D8] dark:bg-[#24201C] text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E]"
              >
                Close
              </button>
            </form>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#F4EFEA] dark:divide-[#24201C]">
              {searchQuery.trim() && (
                <div
                  onClick={handleSearchSubmit}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916] text-[#8C6239] dark:text-[#E5C378] font-semibold text-xs mb-1"
                >
                  <span className="truncate">Search all for "{searchQuery.trim()}"</span>
                  <span className="text-[10px]">Go ↵</span>
                </div>
              )}

              {searchResults.map((res, index) => {
                const isPaper = res.type === "paper";
                return (
                  <div
                    key={res.id}
                    onClick={() => handleSelectResult(res)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916] text-[#2B231B] dark:text-[#FAF8F5] text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                          isPaper
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {isPaper ? <FaFilePdf /> : <FaStickyNote />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate text-xs">{res.title}</p>
                        <p className="text-[10px] text-[#8C7862] dark:text-[#A8957E] truncate">
                          {res.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#8C7862] ml-2 shrink-0">Open</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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

export default Navbar;