import React, { useEffect, useState } from "react";
import { FaDownload, FaExternalLinkAlt, FaTimes, FaFilePdf, FaSyncAlt } from "react-icons/fa";
import { downloadPDF } from "../utils/downloadHelper";
import { PaperAirplaneIcon } from "./PaperBridgeLogo";

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
                className="bg-[#FAF8F5] dark:bg-[#161412] w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#EAE2D8] dark:border-[#2E2822]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#2B1B10] dark:bg-[#1A1614] text-white border-b border-[#4A2E1B] dark:border-[#2E2822] shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 p-1">
                            <PaperAirplaneIcon className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-serif font-bold text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
                                {title}
                            </h3>
                            <p className="text-[11px] text-[#A8957E]">PaperBridge Reader • {viewerMode === "native" ? "Native View" : "Google Cloud Reader"}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Switch Viewer Engine */}
                        <button
                            onClick={() => {
                                setLoading(true);
                                setViewerMode(viewerMode === "native" ? "google" : "native");
                            }}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-full transition cursor-pointer border border-white/10"
                            title="Switch PDF rendering mode if blank"
                        >
                            <FaSyncAlt className="text-[10px]" />
                            <span>{viewerMode === "native" ? "Google View" : "Native View"}</span>
                        </button>

                        <button
                            onClick={handleDownload}
                            title="Download PDF"
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#C5A059] hover:bg-[#E5C378] text-[#0F0E0D] text-xs font-bold rounded-full transition shadow-xs cursor-pointer"
                        >
                            <FaDownload className="text-xs" />
                            <span className="hidden sm:inline">Download</span>
                        </button>

                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in new window"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-full transition cursor-pointer border border-white/10"
                        >
                            <FaExternalLinkAlt className="text-xs" />
                            <span className="hidden sm:inline">Open</span>
                        </a>

                        <button
                            onClick={onClose}
                            title="Close Preview (Esc)"
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-rose-600 hover:text-white text-stone-300 flex items-center justify-center transition text-sm ml-1 cursor-pointer"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* PDF Frame */}
                <div className="flex-1 bg-[#FAF8F5] dark:bg-[#0F0E0D] relative overflow-hidden">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#8C7862] z-10">
                            <div className="text-center">
                                <div className="w-8 h-8 border-2 border-[#8C6239] dark:border-[#C5A059] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-xs font-medium font-serif">Loading document…</p>
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