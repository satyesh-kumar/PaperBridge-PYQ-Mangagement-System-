import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FaArrowUp } from "react-icons/fa";

export default function ScrollToTop() {
    const { pathname } = useLocation();
    const [visible, setVisible] = useState(false);

    // Smooth scroll to top on route change
    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });
    }, [pathname]);

    // Show/hide floating back to top button based on scroll position
    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 320) {
                setVisible(true);
            } else {
                setVisible(false);
            }
        };

        window.addEventListener("scroll", toggleVisibility, { passive: true });
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTopSmooth = () => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });
    };

    return (
        <>
            {visible && (
                <button
                    onClick={scrollToTopSmooth}
                    aria-label="Scroll to top"
                    className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-[#0D1B2A] dark:bg-[#C89D5C] text-[#FAF8F5] dark:text-[#0D1B2A] shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 border border-white/20 dark:border-black/20 flex items-center justify-center cursor-pointer group"
                    title="Back to Top"
                >
                    <FaArrowUp className="text-xs group-hover:-translate-y-0.5 transition-transform duration-200" />
                </button>
            )}
        </>
    );
}
