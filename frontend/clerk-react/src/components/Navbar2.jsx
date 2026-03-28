import React from "react";
import { Link } from "react-router-dom";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  Show
} from "@clerk/react";

function Navbar() {
  return (
    <nav className="w-full sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-gray-200 shadow-sm">

      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">

        {/* Logo */}
        <Link to="/" className="text-xl font-semibold text-indigo-600 tracking-tight">
          PaperBridge
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6 text-gray-600 font-medium">

          <Link to="/" className="hover:text-indigo-600 transition">
            Home
          </Link>

          <Link to="/browse" className="hover:text-indigo-600 transition">
            Browse Papers
          </Link>

          <Link to="/upload" className="hover:text-indigo-600 transition">
            Upload PYQ
          </Link>

        </div>

        {/* Auth Section */}
        <div className="flex items-center gap-3">

          <Show when="signed-out">

            <SignInButton mode="modal">
              <button className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition text-sm font-medium">
                Sign In
              </button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition text-sm font-medium shadow">
                Sign Up
              </button>
            </SignUpButton>

          </Show>

          <Show when="signed-in">
            <UserButton afterSignOutUrl="/" />
          </Show>

        </div>

      </div>

    </nav>
  );
}

export default Navbar;