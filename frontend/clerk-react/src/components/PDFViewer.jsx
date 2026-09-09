import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaDownload,
    FaExternalLinkAlt,
    FaTimes,
    FaSyncAlt,
    FaExclamationTriangle,
    FaFilePdf,
    FaCheckCircle,
    FaFlag,
} from "react-icons/fa";
import { downloadPDF } from "../utils/downloadHelper";
import { PaperAirplaneIcon } from "./PaperBridgeLogo";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function PDFViewer({ 
    fileUrl, 
    title = "Document Preview", 
    onClose,
    course = "",
    subject = "",
    examYear = "",
    paperId = "",
}) {
    const navigate = useNavigate();
    // Mode: 'native' (high-fidelity direct stream) | 'google' (Google Cloud Viewer)
    const [viewerMode, setViewerMode] = useState("native");
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Compute proxy inline stream URL & public Google viewer URL
    const proxyUrl = fileUrl ? `${API_URL}/api/pdf/view?url=${encodeURIComponent(fileUrl)}` : "";
    
    // Only pass direct public URLs (e.g. Cloudinary) to Google Docs viewer
    const isPublicInternetUrl = fileUrl && /^https?:\/\//i.test(fileUrl) && !fileUrl.includes("localhost") && !fileUrl.includes("127.0.0.1");
    const googleViewerUrl = isPublicInternetUrl
        ? `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(fileUrl)}`
        : "";

    // Fetch PDF blob as high-speed inline buffer for instant client rendering
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

            const candidates = [
                proxyUrl,
                fileUrl,
                ...(fileUrl.includes("res.cloudinary.com") ? [
                    fileUrl.replace("/image/upload/", "/raw/upload/").replace(/\.pdf$/i, ""),
                    fileUrl.replace("/image/upload/", "/raw/upload/"),
                    fileUrl.replace("/raw/upload/", "/image/upload/"),
                    fileUrl.replace(/\.pdf$/i, ""),
                ] : []),
            ].filter(Boolean);

            let foundBlob = null;
            for (const targetUrl of candidates) {
                try {
                    const response = await fetch(targetUrl);
                    if (response.ok) {
                        const contentType = response.headers.get("content-type") || "";
                        if (contentType.includes("application/json")) {
                            continue;
                        }
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
                    setError(null);
                } else if (googleViewerUrl) {
                    setViewerMode("google");
                    setError(null);
                } else {
                    setError("Document preview could not be loaded directly.");
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

    // Close on Escape key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose?.();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Prevent background body scrolling when modal is open
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

    const handleReportIssue = () => {
        onClose?.();
        const params = new URLSearchParams();
        params.set("problem", "Wrong paper");
        if (course) params.set("course", course);
        if (subject) params.set("subject", subject);
        if (examYear) params.set("examYear", examYear);
        if (title) params.set("paperTitle", title);
        if (paperId) params.set("paperId", paperId);
        navigate(`/feedback?${params.toString()}`);
    };

    // Determine active rendering source
    const activeUrl = viewerMode === "google" && googleViewerUrl
        ? googleViewerUrl
        : (blobUrl || proxyUrl || fileUrl);

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
                                    {viewerMode === "google" ? "Google Cloud Engine" : "Direct High-Fidelity Engine"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Report Problem button */}
                        <button
                            type="button"
                            onClick={handleReportIssue}
                            title="Report problem with this paper"
                            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30 text-[11px] sm:text-xs font-semibold rounded-full transition cursor-pointer min-h-[34px]"
                        >
                            <FaFlag className="text-[10px]" />
                            <span className="hidden sm:inline">Report Issue</span>
                        </button>

                        {/* Switch Viewer Engine if Google Docs is available */}
                        {isPublicInternetUrl && (
                            <button
                                type="button"
                                onClick={() => {
                                    setLoading(true);
                                    setViewerMode((prev) => (prev === "google" ? "native" : "google"));
                                }}
                                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[11px] sm:text-xs font-semibold rounded-full transition cursor-pointer border border-white/10 min-h-[34px]"
                                title="Switch between Direct Viewer and Google Docs Cloud Viewer"
                            >
                                <FaSyncAlt className="text-[9px]" />
                                <span className="hidden xs:inline">{viewerMode === "google" ? "Native View" : "Google View"}</span>
                                <span className="xs:hidden">{viewerMode === "google" ? "Native" : "Google"}</span>
                            </button>
                        )}

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
                            href={fileUrl || proxyUrl}
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
                                    href={fileUrl || proxyUrl}
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
                            {viewerMode === "google" && googleViewerUrl ? (
                                <iframe
                                    key="google-frame"
                                    src={googleViewerUrl}
                                    className="w-full h-full border-none"
                                    title={title}
                                    onLoad={() => setLoading(false)}
                                    allow="fullscreen"
                                />
                            ) : (
                                <iframe
                                    key="native-frame"
                                    src={blobUrl || proxyUrl || fileUrl}
                                    className="w-full h-full border-none"
                                    title={title}
                                    type="application/pdf"
                                    onLoad={() => setLoading(false)}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Contextual Action Bar */}
                <div className="px-3 sm:px-5 py-2 bg-[#211710] dark:bg-[#120F0D] text-[#C2B3A0] text-xs flex items-center justify-between border-t border-[#3D2617] dark:border-[#261E18] shrink-0 gap-2">
                    <div className="flex items-center gap-2 truncate">
                        <FaExclamationTriangle className="text-amber-400 shrink-0 text-xs" />
                        <span className="truncate text-[11px] sm:text-xs">Blurry page, incorrect year, or wrong subject?</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleReportIssue}
                        className="shrink-0 text-[11px] sm:text-xs font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 ml-2 transition cursor-pointer"
                    >
                        Report to PaperBridge &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PDFViewer;