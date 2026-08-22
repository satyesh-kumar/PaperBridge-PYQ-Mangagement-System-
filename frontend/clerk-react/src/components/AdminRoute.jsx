import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/react";
import { motion } from "framer-motion";
import { FaShieldAlt, FaArrowLeft, FaSignOutAlt, FaLock, FaUserSecret } from "react-icons/fa";
import { useIsAdmin } from "../hooks/useIsAdmin";
import Navbar2 from "./Navbar2";

export default function AdminRoute({ children }) {
    const { isSignedIn, isLoaded: authLoaded } = useAuth();
    const { isAdmin, isLoaded: adminLoaded, userEmail } = useIsAdmin();
    const { signOut, openSignIn } = useClerk();

    if (!authLoaded || !adminLoaded) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500 flex items-center justify-center animate-pulse mb-4 text-indigo-400">
                    <FaShieldAlt className="text-2xl" />
                </div>
                <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                    Verifying Administrative Clearance...
                </p>
            </div>
        );
    }

    if (!isSignedIn) {
        return <Navigate to="/" replace />;
    }

    // ── 403 ACCESS DENIED STATE ─────────────────────────────────────────────────
    if (!isAdmin) {
        return (
            <>
                <Navbar2 />
                <div className="min-h-[85vh] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-6 text-white">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="max-w-lg w-full bg-slate-900/80 backdrop-blur-2xl border border-red-500/20 rounded-3xl p-8 sm:p-10 shadow-2xl text-center relative overflow-hidden"
                    >
                        {/* Red security ambient glow */}
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

                        {/* Shield icon */}
                        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6 text-red-400 text-3xl shadow-lg shadow-red-500/10">
                            <FaLock />
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold uppercase tracking-wider mb-3">
                            <FaUserSecret /> 403 Access Denied
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
                            Administrator Only Area
                        </h2>

                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            Your account <span className="font-semibold text-slate-200">({userEmail || "Student"})</span> does not have verified administrative permissions to access the PaperBridge Admin Console.
                        </p>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-8 text-left text-xs space-y-1.5 text-slate-400">
                            <div className="flex justify-between">
                                <span className="font-medium text-slate-500">Security Policy:</span>
                                <span className="text-red-400 font-semibold">Strict Role-Based Access</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium text-slate-500">Target Resource:</span>
                                <span className="font-mono text-slate-300">/admin</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium text-slate-500">Authorized Domain:</span>
                                <span className="text-slate-300">Configured Admin Emails</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                to="/dashboard"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                            >
                                <FaArrowLeft /> Student Dashboard
                            </Link>

                            <button
                                onClick={() => signOut()}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                            >
                                <FaSignOutAlt /> Switch Account
                            </button>
                        </div>
                    </motion.div>
                </div>
            </>
        );
    }

    return <>{children}</>;
}
