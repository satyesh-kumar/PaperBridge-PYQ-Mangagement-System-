import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  Show,
} from "@clerk/react";
import { FaShieldAlt, FaStickyNote, FaBook, FaPlus } from "react-icons/fa";
import { useIsAdmin } from "../hooks/useIsAdmin";
import ThemeToggle from "./ThemeToggle";

function Navbar() {
  const { isAdmin } = useIsAdmin();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="w-full sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-2.5">

        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm shadow-xs transition group-hover:scale-105">
            P
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              PaperBridge
            </span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              Academic Archive
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-lg transition ${
              isActive("/")
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                : "hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Home
          </Link>
          <Link
            to="/browse"
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              isActive("/browse")
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                : "hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FaBook className="text-xs text-slate-400" /> Browse Papers
          </Link>
          <Link
            to="/notes"
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              isActive("/notes")
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                : "hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FaStickyNote className="text-xs text-slate-400" /> Study Notes
          </Link>
          <Link
            to="/upload"
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              isActive("/upload")
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                : "hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FaPlus className="text-[10px] text-slate-400" /> Upload
          </Link>

          <Show when="signed-in">
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-lg transition ${
                isActive("/dashboard")
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  : "hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Dashboard
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className={`ml-1 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
                  isActive("/admin")
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                }`}
              >
                <FaShieldAlt className="text-[10px]" /> Admin Panel
              </Link>
            )}
          </Show>
        </div>

        {/* Action Controls & Auth Section */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                id="navbar-signin-btn"
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 transition text-xs font-medium cursor-pointer shadow-2xs"
              >
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                id="navbar-signup-btn"
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 transition text-xs font-medium cursor-pointer shadow-xs"
              >
                Sign Up
              </button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
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