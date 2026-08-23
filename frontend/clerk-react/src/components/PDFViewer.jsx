import React, { useEffect, useState } from "react";
import { FaDownload, FaExternalLinkAlt, FaTimes, FaFilePdf, FaSyncAlt, FaExclamationTriangle } from "react-icons/fa";
import { downloadPDF } from "../utils/downloadHelper";
import { PaperAirplaneIcon } from "./PaperBridgeLogo";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function PDFViewer({ fileUrl, title = "Document Preview", onClose }) {
    // Mode: 'native' (blob / proxy inline) | 'google' (Google Docs viewer)
    const [viewerMode, setViewerMode] = useState("native");
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Compute proxy inline stream URL
    const proxyUrl = `${API_URL}/api/pdf/view?url=${encodeURIComponent(fileUrl)}`;
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

    // Fetch PDF as inline blob to prevent unwanted raw downloads
    useEffect(() => {
        let isMounted = true;
        let objectUrl = null;

        async function loadPdfBlob() {
            if (!fileUrl) {
                setError("Document URL not provided");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Try fetching via backend inline proxy first (guarantees correct Content-Type without forced attachment)
                let response = await fetch(proxyUrl);
                
                // Fallback to direct fetch if proxy fails
                if (!response.ok) {
                    response = await fetch(fileUrl, { mode: "cors" });
                }

                if (!response.ok) {
                    throw new Error(`Failed to load document (${response.status})`);
                }

                const rawBlob = await response.blob();
                const pdfBlob = new Blob([rawBlob], { type: "application/pdf" });
                objectUrl = URL.createObjectURL(pdfBlob);

                if (isMounted) {
                    setBlobUrl(objectUrl);
                    setLoading(false);
                }
            } catch (err) {
                console.warn("Direct blob load failed, falling back to Google Cloud Reader:", err);
                if (isMounted) {
                    // Fall back to Google viewer mode automatically
                    setViewerMode("google");
                    setLoading(false);
                }
            }
        }

        loadPdfBlob();

        return () => {
            isMounted = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [fileUrl, proxyUrl]);

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

    // Determine current rendering URL
    const activeUrl = viewerMode === "google" 
        ? googleViewerUrl 
        : (blobUrl || proxyUrl);

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
                            <p className="text-[11px] text-[#A8957E]">
                                PaperBridge Reader • {viewerMode === "google" ? "Google Cloud Engine" : "Native High-Fidelity Engine"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Switch Viewer Engine */}
                        <button
                            onClick={() => {
                                setViewerMode((prev) => (prev === "google" ? "native" : "google"));
                            }}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-full transition cursor-pointer border border-white/10"
                            title="Switch rendering engine if document does not display"
                        >
                            <FaSyncAlt className="text-[10px]" />
                            <span>{viewerMode === "google" ? "Switch to Native" : "Switch to Google View"}</span>
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
                            href={proxyUrl}
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
                                <p className="text-xs font-medium font-serif">Preparing document preview…</p>
                            </div>
                        </div>
                    )}

                    {error ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 text-2xl">
                                <FaExclamationTriangle />
                            </div>
                            <h4 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-2">
                                Document Preview Unavailable
                            </h4>
                            <p className="text-xs text-[#8C7862] dark:text-[#A8957E] max-w-md mb-6 leading-relaxed">
                                The document could not be rendered inside the frame directly, but you can still view or download it directly.
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleDownload}
                                    className="px-5 py-2.5 bg-[#8C6239] hover:bg-[#6D4C2B] text-white text-xs font-bold rounded-full transition shadow-xs flex items-center gap-2"
                                >
                                    <FaDownload />
                                    <span>Download Document</span>
                                </button>
                                <a
                                    href={proxyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-5 py-2.5 bg-[#EAE2D8] dark:bg-[#24201C] hover:bg-[#DDD2C4] text-[#1A1614] dark:text-[#FAF8F5] text-xs font-bold rounded-full transition flex items-center gap-2"
                                >
                                    <FaExternalLinkAlt />
                                    <span>Open in New Tab</span>
                                </a>
                            </div>
                        </div>
                    ) : (
                        <object
                            key={activeUrl}
                            data={activeUrl}
                            type="application/pdf"
                            className="w-full h-full border-none"
                            onLoad={() => setLoading(false)}
                        >
                            {/* Fallback iframe inside object tag */}
                            <iframe
                                src={activeUrl}
                                className="w-full h-full border-none"
                                title={title}
                                onLoad={() => setLoading(false)}
                            />
                        </object>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PDFViewer;