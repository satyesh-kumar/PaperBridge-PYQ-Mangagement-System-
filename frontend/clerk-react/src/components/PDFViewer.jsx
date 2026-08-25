import React, { useEffect, useState } from "react";
import { FaDownload, FaExternalLinkAlt, FaTimes, FaSyncAlt, FaExclamationTriangle } from "react-icons/fa";
import { downloadPDF } from "../utils/downloadHelper";
import { PaperAirplaneIcon } from "./PaperBridgeLogo";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function PDFViewer({ fileUrl, title = "Document Preview", onClose }) {
    // Default to 'google' view (Google Cloud Engine) for universal mobile & desktop support
    const [viewerMode, setViewerMode] = useState("google");
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Compute proxy inline stream URL & Google viewer URL
    const proxyUrl = `${API_URL}/api/pdf/view?url=${encodeURIComponent(fileUrl || "")}`;
    const directDocUrl = fileUrl || proxyUrl;
    const googleViewerUrl = `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(directDocUrl)}`;

    // Pre-fetch PDF blob in background if user switches to Native View
    useEffect(() => {
        let isMounted = true;
        let objectUrl = null;

        async function loadPdfBlob() {
            if (!fileUrl) {
                setError("Document URL not provided");
                setLoading(false);
                return;
            }

            const candidates = [
                proxyUrl,
                fileUrl,
                ...(fileUrl.includes("res.cloudinary.com") ? [
                    fileUrl.replace("/image/upload/", "/raw/upload/").replace(/\.pdf$/i, ""),
                    fileUrl.replace("/image/upload/", "/raw/upload/"),
                    fileUrl.replace("/raw/upload/", "/image/upload/"),
                    fileUrl.replace(/\.pdf$/i, ""),
                ] : []),
            ];

            let foundBlob = null;
            for (const targetUrl of candidates) {
                try {
                    const response = await fetch(targetUrl);
                    if (response.ok) {
                        const rawBlob = await response.blob();
                        if (rawBlob && rawBlob.size > 0) {
                            foundBlob = new Blob([rawBlob], { type: "application/pdf" });
                            break;
                        }
                    }
                } catch {
                    // Try next candidate
                }
            }

            if (isMounted) {
                if (foundBlob) {
                    objectUrl = window.URL.createObjectURL(foundBlob);
                    setBlobUrl(objectUrl);
                }
                setLoading(false);
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

    // Prevent background scrolling when modal is open
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    const handleDownload = () => {
        downloadPDF(fileUrl, title);
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[9999] p-1.5 xs:p-2 sm:p-4 md:p-6"
            onClick={onClose}
        >
            <div
                className="bg-[#FAF8F5] dark:bg-[#161412] w-full max-w-5xl h-[96vh] sm:h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#EAE2D8] dark:border-[#2E2822]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 bg-[#2B1B10] dark:bg-[#1A1614] text-white border-b border-[#4A2E1B] dark:border-[#2E2822] shadow-sm gap-2 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 p-1">
                            <PaperAirplaneIcon className="w-5 h-5 sm:w-7 sm:h-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-sm font-serif font-bold text-white truncate max-w-[130px] xs:max-w-[190px] sm:max-w-md md:max-w-lg">
                                {title}
                            </h3>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                <p className="text-[10px] sm:text-[11px] text-[#C2B3A0] truncate">
                                    {viewerMode === "google" ? "Google View (Default)" : "Native View"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Switch Viewer Engine */}
                        <button
                            type="button"
                            onClick={() => {
                                setLoading(true);
                                setViewerMode((prev) => (prev === "google" ? "native" : "google"));
                            }}
                            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[11px] sm:text-xs font-semibold rounded-full transition cursor-pointer border border-white/10 min-h-[34px]"
                            title="Switch rendering engine between Google View and Native View"
                        >
                            <FaSyncAlt className="text-[9px]" />
                            <span className="hidden xs:inline">{viewerMode === "google" ? "Native View" : "Google View"}</span>
                            <span className="xs:hidden">{viewerMode === "google" ? "Native" : "Google"}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleDownload}
                            title="Download PDF"
                            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 bg-[#C5A059] hover:bg-[#E5C378] text-[#0F0E0D] text-[11px] sm:text-xs font-bold rounded-full transition shadow-xs cursor-pointer min-h-[34px]"
                        >
                            <FaDownload className="text-[10px] sm:text-xs" />
                            <span className="hidden sm:inline">Download</span>
                        </button>

                        <a
                            href={proxyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in new window"
                            className="hidden sm:flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-full transition cursor-pointer border border-white/10 min-h-[34px]"
                        >
                            <FaExternalLinkAlt className="text-[10px]" />
                            <span>Open</span>
                        </a>

                        <button
                            type="button"
                            onClick={onClose}
                            title="Close Preview (Esc)"
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-rose-600 hover:text-white text-stone-300 flex items-center justify-center transition text-sm ml-0.5 cursor-pointer min-h-[34px] min-w-[34px]"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* PDF Frame Area */}
                <div className="flex-1 bg-[#FAF8F5] dark:bg-[#0F0E0D] relative overflow-hidden flex flex-col">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#FAF8F5]/90 dark:bg-[#0F0E0D]/90 text-[#8C7862] z-10">
                            <div className="text-center p-4">
                                <div className="w-8 h-8 border-2 border-[#8C6239] dark:border-[#C5A059] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-xs font-medium font-serif">Preparing document preview…</p>
                            </div>
                        </div>
                    )}

                    {error ? (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 text-xl">
                                <FaExclamationTriangle />
                            </div>
                            <h4 className="text-sm font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                                Document Preview Unavailable
                            </h4>
                            <p className="text-xs text-[#8C7862] dark:text-[#A8957E] max-w-md mb-5 leading-relaxed">
                                The document could not be rendered directly, but you can still download or open it.
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    className="px-4 py-2 bg-[#8C6239] hover:bg-[#6D4C2B] text-white text-xs font-bold rounded-full transition shadow-xs flex items-center gap-1.5"
                                >
                                    <FaDownload />
                                    <span>Download</span>
                                </button>
                                <a
                                    href={proxyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-[#EAE2D8] dark:bg-[#24201C] hover:bg-[#DDD2C4] text-[#1A1614] dark:text-[#FAF8F5] text-xs font-bold rounded-full transition flex items-center gap-1.5"
                                >
                                    <FaExternalLinkAlt />
                                    <span>Open Direct</span>
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex-1 relative">
                            {viewerMode === "google" ? (
                                <iframe
                                    src={googleViewerUrl}
                                    className="w-full h-full border-none"
                                    title={title}
                                    onLoad={() => setLoading(false)}
                                    allow="fullscreen"
                                />
                            ) : (
                                <iframe
                                    src={blobUrl || proxyUrl}
                                    className="w-full h-full border-none"
                                    title={title}
                                    type="application/pdf"
                                    onLoad={() => setLoading(false)}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PDFViewer;