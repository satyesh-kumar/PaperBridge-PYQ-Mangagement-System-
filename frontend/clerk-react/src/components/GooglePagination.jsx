import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export default function GooglePagination({ currentPage, totalPages, onPageChange, totalItems, pageSize }) {
    if (totalPages <= 1) return null;

    // Generate Google-style page window: [1, 2, 3, 4, 5, 6, 7, '...', totalPages]
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 7;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push("...");
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1);
                pages.push("...");
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push("...");
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push("...");
                pages.push(totalPages);
            }
        }
        return pages;
    };

    const handlePageClick = (page) => {
        if (page === "..." || page === currentPage) return;
        onPageChange(page);
        window.scrollTo({ top: 380, behavior: "smooth" });
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-[#EAE2D8] dark:border-[#2E2822] text-xs">
            {totalItems && (
                <span className="text-[#8C7862] dark:text-[#A8957E] font-medium">
                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                    {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
                </span>
            )}

            {/* Google-style Pagination Pills */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {/* Previous Button */}
                <button
                    onClick={() => handlePageClick(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous Page"
                    className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] text-[#4A3E31] dark:text-[#FAF8F5] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                    <FaChevronLeft className="text-[10px]" />
                    <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Numbered Pills */}
                {getPageNumbers().map((page, idx) => {
                    if (page === "...") {
                        return (
                            <span key={`ellipsis-${idx}`} className="px-2 py-1 text-[#8C7862] dark:text-[#A8957E] font-bold">
                                …
                            </span>
                        );
                    }

                    const isActive = page === currentPage;
                    return (
                        <button
                            key={`page-${page}`}
                            onClick={() => handlePageClick(page)}
                            className={`w-8 h-8 rounded-full font-bold text-xs transition cursor-pointer flex items-center justify-center ${
                                isActive
                                    ? "bg-[#0D1B2A] text-white dark:bg-[#C89D5C] dark:text-[#0D1B2A] shadow-xs"
                                    : "bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] text-[#4A3E31] dark:text-[#FAF8F5] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C]"
                            }`}
                        >
                            {page}
                        </button>
                    );
                })}

                {/* Next Button */}
                <button
                    onClick={() => handlePageClick(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next Page"
                    className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] text-[#4A3E31] dark:text-[#FAF8F5] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                    <span className="hidden sm:inline">Next</span>
                    <FaChevronRight className="text-[10px]" />
                </button>
            </div>
        </div>
    );
}
