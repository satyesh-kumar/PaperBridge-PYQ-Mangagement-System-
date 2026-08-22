import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  Show,
} from "@clerk/react";
import { FaShieldAlt, FaStickyNote, FaBook, FaPlus, FaSearch } from "react-icons/fa";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";
import { useIsAdmin } from "../hooks/useIsAdmin";
import ThemeToggle from "./ThemeToggle";

import PaperBridgeLogo from "./PaperBridgeLogo";

function Navbar() {
  const { isAdmin } = useIsAdmin();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const openSpotlight = () => {
    window.dispatchEvent(new CustomEvent("open_command_palette"));
  };

  return (
    <nav className="w-full sticky top-0 z-50 bg-[#FAF8F5]/90 dark:bg-[#0F0E0D]/90 backdrop-blur-md border-b border-[#EAE2D8] dark:border-[#24201C] transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">

        {/* Brand Logo */}
        <PaperBridgeLogo
          variant="horizontal"
          size="md"
          subtitle="FAST ACCESS TO PAST PAPERS"
        />

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1.5 text-sm font-medium text-[#6B5B49] dark:text-[#C2B3A0]">
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

        {/* Action Controls & Auth Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Spotlight Search Trigger */}
          <button
            type="button"
            onClick={openSpotlight}
            className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-[#FAF8F5] dark:bg-[#161412] border border-[#DDD2C4] dark:border-[#2E2822] text-[#8C7862] dark:text-[#A8957E] hover:border-[#8C6239] dark:hover:border-[#C5A059] hover:text-[#0D1B2A] dark:hover:text-[#FAF8F5] text-xs font-medium cursor-pointer transition shadow-2xs flex items-center gap-2"
            title="Search Papers & Notes (Ctrl+K)"
            aria-label="Search Papers & Notes"
          >
            <FaSearch className="text-xs text-[#8C6239] dark:text-[#E5C378]" />
            <span className="hidden md:inline">Search...</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 rounded bg-white dark:bg-[#24201C] border border-[#DDD2C4] dark:border-[#332E28] text-[9px] font-mono font-bold text-[#8C7862] dark:text-[#A8957E]">
              ⌘K
            </kbd>
          </button>

          <ThemeToggle />

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                id="navbar-signin-btn"
                className="px-4 py-2 rounded-full border border-[#DDD2C4] dark:border-[#332E28] bg-white/70 dark:bg-[#1C1916] hover:bg-white dark:hover:bg-[#24201C] text-[#4A3E31] dark:text-[#EAE2D8] transition text-xs font-semibold cursor-pointer shadow-2xs"
              >
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                id="navbar-signup-btn"
                className="px-4 py-2 rounded-full bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] transition text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
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
  );
}

export default Navbar;