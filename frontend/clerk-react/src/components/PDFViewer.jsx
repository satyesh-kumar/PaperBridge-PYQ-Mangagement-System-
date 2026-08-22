import React, { useEffect, useState } from "react";
import { FaDownload, FaExternalLinkAlt, FaTimes, FaFilePdf, FaSyncAlt } from "react-icons/fa";
import { downloadPDF } from "../utils/downloadHelper";

function PDFViewer({ fileUrl, title = "Document Preview", onClose }) {
    // Mode: 'native' (direct PDF) | 'google' (Google Docs viewer)
    const [viewerMode, setViewerMode] = useState("native");
    const [loading, setLoading] = useState(true);

    // Close modal on Escape key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose?.();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const handleDownload = () => {
        downloadPDF(fileUrl, title);
    };

    // Calculate embedded URL
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    const activeUrl = viewerMode === "native" ? fileUrl : googleViewerUrl;

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[9999] p-3 sm:p-6"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                            <FaFilePdf className="text-base" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
                                {title}
                            </h3>
                            <p className="text-[11px] text-slate-400">PDF Reader • {viewerMode === "native" ? "Native View" : "Google Cloud Reader"}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Switch Viewer Engine */}
                        <button
                            onClick={() => {
                                setLoading(true);
                                setViewerMode(viewerMode === "native" ? "google" : "native");
                            }}
                            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition"
                            title="Switch PDF rendering mode if blank"
                        >
                            <FaSyncAlt className="text-[10px]" />
                            <span>{viewerMode === "native" ? "Google View" : "Native View"}</span>
                        </button>

                        <button
                            onClick={handleDownload}
                            title="Download PDF"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
                        >
                            <FaDownload className="text-xs" />
                            <span className="hidden sm:inline">Download</span>
                        </button>

                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in new window"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                        >
                            <FaExternalLinkAlt className="text-xs" />
                            <span className="hidden sm:inline">Open</span>
                        </a>

                        <button
                            onClick={onClose}
                            title="Close Preview (Esc)"
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-red-600 hover:text-white text-slate-300 flex items-center justify-center transition text-sm ml-1 cursor-pointer"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* PDF Frame */}
                <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-500 z-10">
                            <div className="text-center">
                                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-xs font-medium">Loading document…</p>
                            </div>
                        </div>
                    )}
                    <iframe
                        key={activeUrl}
                        src={activeUrl}
                        className="w-full h-full border-none"
                        title={title}
                        onLoad={() => setLoading(false)}
                    />
                </div>
            </div>
        </div>
    );
}

export default PDFViewer;