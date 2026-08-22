import React, { useEffect } from "react";
import { FaDownload, FaExternalLinkAlt, FaTimes, FaFilePdf } from "react-icons/fa";

function PDFViewer({ fileUrl, title = "Question Paper Preview", onClose }) {
    // Close modal on Escape key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const handleDownload = async () => {
        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `${title.replace(/[^a-zA-Z0-9_-]/g, "_") || "paper"}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch {
            window.open(fileUrl, "_blank");
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-6 animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-5xl h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-gray-800 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                            <FaFilePdf className="text-base" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
                                {title}
                            </h3>
                            <p className="text-xs text-gray-400">PDF Preview</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownload}
                            title="Download PDF"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition"
                        >
                            <FaDownload className="text-xs" />
                            <span className="hidden sm:inline">Download</span>
                        </button>
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in new tab"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition"
                        >
                            <FaExternalLinkAlt className="text-xs" />
                            <span className="hidden sm:inline">Open</span>
                        </a>
                        <button
                            onClick={onClose}
                            title="Close Preview (Esc)"
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-red-500 hover:text-white text-gray-300 flex items-center justify-center transition text-sm ml-1"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* PDF Frame / Content */}
                <div className="flex-1 bg-gray-100 relative">
                    <iframe
                        src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                        className="w-full h-full border-none"
                        title={title}
                    />
                </div>
            </div>
        </div>
    );
}

export default PDFViewer;