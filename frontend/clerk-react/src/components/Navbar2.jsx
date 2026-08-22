import React from "react";
import { Link } from "react-router-dom";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  Show,
} from "@clerk/react";
import { FaShieldAlt, FaStickyNote, FaBook } from "react-icons/fa";
import { useIsAdmin } from "../hooks/useIsAdmin";
import ThemeToggle from "./ThemeToggle";

function Navbar() {
  const { isAdmin } = useIsAdmin();

  return (
    <nav className="w-full sticky top-0 z-50 backdrop-blur-xl bg-white/75 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-colors">

      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">

        {/* Logo */}
        <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-500/20">
            P
          </span>
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            PaperBridge
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6 text-slate-600 dark:text-slate-300 font-medium text-sm">
          <Link to="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            Home
          </Link>
          <Link to="/browse" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1.5">
            <FaBook className="text-xs text-indigo-500" /> Browse Papers
          </Link>
          <Link to="/notes" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
            <FaStickyNote className="text-xs" /> Study Notes
          </Link>
          <Link to="/upload" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            + Upload
          </Link>
          <Show when="signed-in">
            <Link to="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Dashboard
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-sm hover:shadow-indigo-500/30 transition hover:-translate-y-0.5"
              >
                <FaShieldAlt className="text-[10px]" /> Admin Panel
              </Link>
            )}
          </Show>
        </div>

        {/* Action Controls & Auth Section */}
        <div className="flex items-center gap-3">
          {/* Theme Mode Switcher */}
          <ThemeToggle />

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                id="navbar-signin-btn"
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition text-xs sm:text-sm font-semibold cursor-pointer"
              >
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                id="navbar-signup-btn"
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                Sign Up
              </button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <div className="flex items-center">
              <UserButton afterSignOutUrl="/" />
            </div>
          </Show>

        </div>
      </div>

    </nav>
  );
}

export default Navbar;