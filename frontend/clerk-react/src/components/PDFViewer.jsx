import React, { useState } from "react";

function PDFViewer({ fileUrl, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">

            <div className="bg-white w-[90%] h-[90%] rounded-xl relative overflow-hidden">

                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded z-10"
                >
                    Close
                </button>

                <iframe
                    src={`https://docs.google.com/gview?url=${fileUrl}&embedded=true`}
                    className="w-full h-full"
                    title="PDF"
                />
            </div>

        </div>
    );
}

export default PDFViewer;