import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaFilePdf, FaEye, FaDownload } from "react-icons/fa";
import PDFViewer from "../components/PDFViewer";
import { motion } from "framer-motion";
import Navbar2 from "../components/Navbar2";
function BrowsePYQ() {

    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedPdf, setSelectedPdf] = useState(null);

    const [search, setSearch] = useState("");
    const [courseFilter, setCourseFilter] = useState("");
    const [examFilter, setExamFilter] = useState("");
    const [yearFilter, setYearFilter] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);



    const handleKeyDown = (e) => {
        if (e.key === "ArrowDown") {
            setActiveIndex((prev) => (prev + 1) % suggestions.length);
        } else if (e.key === "ArrowUp") {
            setActiveIndex((prev) =>
                prev === 0 ? suggestions.length - 1 : prev - 1
            );
        } else if (e.key === "Enter") {
            if (suggestions[activeIndex]) {
                setSearch(suggestions[activeIndex].title);
                setSuggestions([]);
            }
        }
    };


    useEffect(() => {
        if (!search.trim()) {
            setSuggestions([]);
            return;
        }

        const lower = search.toLowerCase();

        const results = papers
            .filter((p) =>
                `${p.title} ${p.course} ${p.examType} ${p.year}`
                    .toLowerCase()
                    .includes(lower)
            )
            .slice(0, 6);

        setSuggestions(results);
    }, [search, papers]);



    useEffect(() => {

        const fetchPapers = async () => {

            try {

                const res = await axios.get("http://localhost:5000/api/pyqs");
                setPapers(res.data);

            } catch (err) {

                console.error(err);
                setError("Failed to load papers");

            } finally {

                setLoading(false);

            }

        };

        fetchPapers();

    }, []);


    //ai
    const handleAISearch = async () => {
        const res = await axios.post("/api/ai-search", {
            query: search,
        });

        setCourseFilter(res.data.course);
        setExamFilter(res.data.examType);
        setYearFilter(res.data.year);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    const filteredPapers = papers.filter((paper) => {
        const text = `${paper.title} ${paper.course} ${paper.examType} ${paper.year}`.toLowerCase();

        return (
            text.includes(debouncedSearch.toLowerCase()) &&
            (courseFilter ? paper.course === courseFilter : true) &&
            (examFilter ? paper.examType === examFilter : true) &&
            (yearFilter ? String(paper.year) === yearFilter : true)
        );
    });

    const handleDownload = async (url) => {
        const response = await fetch(url);
        const blob = await response.blob();

        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = "paper.pdf";
        link.click();
    };

    return (
        <>
            <Navbar2 />
            <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,#6366f1_1px,transparent_0)] [background-size:40px_40px]">  </div>
                <div className="relative z-10 w-full max-w-7xl mx-auto">

                    <div className="mb-10">

                        {/* Header */}
                        <div className="text-center mb-6">
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                                Browse Question Papers
                            </h1>
                            <p className="text-gray-500 mt-2">
                                Find previous year papers easily
                            </p>
                        </div>

                        {/* Filter Card */}
                        <div >

                            {/* Top Row */}
                            <div className="sticky top-0 z-20 backdrop-blur-xl 
bg-white/70 border-b border-white/40 p-4 rounded-2xl shadow-md">
                                <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">

                                    {/* 🔍 Search */}
                                    <div className="w-full max-w-xl mx-auto mb-6">
                                        <div className="flex items-center bg-white shadow-md rounded-2xl px-4 py-3 border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500 transition">

                                            <span className="text-gray-400 mr-2 text-lg">🔍</span>

                                            <input
                                                type="text"
                                                placeholder="Search by subject, year, or course..."
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="w-full outline-none text-gray-700 text-sm"
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        handleAISearch();
                                                    }
                                                }}

                                            />

                                        </div>
                                        <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-1 rounded-full">
                                            AI Search
                                        </span>




                                    </div>

                                    {/* Clear Button */}
                                    <button
                                        onClick={() => {
                                            setSearch("");
                                            setCourseFilter("");
                                            setExamFilter("");
                                            setYearFilter("");
                                            setDebouncedSearch("");
                                        }}
                                        className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20"
                                    >
                                        Clear Filters
                                    </button>

                                </div>



                                {/* Filters Grid */}
                                <div className="flex flex-wrap gap-3 justify-center mb-6">

                                    {["B.Tech", "MCA", "MBA"].map((item) => (
                                        <button
                                            key={item}
                                            onClick={() => setCourseFilter(item)}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                                                 ${courseFilter === item
                                                    ? "bg-indigo-600 text-white shadow-lg scale-105"
                                                    : "bg-gray-100 text-gray-600 hover:bg-indigo-100"
                                                }`}
                                        >
                                            🎓 {item}
                                        </button>
                                    ))}

                                </div>

                                <div className="flex flex-wrap gap-3 justify-center mb-4">

                                    {["mid1", "mid2", "semester"].map((item) => (
                                        <button
                                            key={item}
                                            onClick={() => setExamFilter(item)}
                                            className={`px-3 py-1 rounded-full text-xs transition
                                                ${examFilter === item
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-gray-100 hover:bg-purple-100"
                                                }`}
                                        >
                                            📝 {item}
                                        </button>
                                    ))}

                                    {[2026, 2025, 2024].map((year) => (
                                        <button
                                            key={year}
                                            onClick={() => setYearFilter(String(year))}
                                            className={`px-3 py-1 rounded-full text-xs transition
                                                 ${yearFilter === String(year)
                                                    ? "bg-green-600 text-white"
                                                    : "bg-gray-100 hover:bg-green-100"
                                                }`}
                                        >
                                            📅 {year}
                                        </button>
                                    ))}

                                </div>
                            </div>

                        </div>
                        {/* Loading */}

                        {
                            loading && (
                                <p className="text-center text-gray-400">Loading papers...</p>
                            )
                        }

                        {/* Error */}

                        {
                            error && (
                                <p className="text-center text-red-400">{error}</p>
                            )
                        }

                        {/* Empty */}

                        {!loading && filteredPapers.length === 0 && (
                            <div className="text-center mt-16">
                                <div className="text-6xl mb-4">📂</div>
                                <h2 className="text-xl font-semibold text-gray-700">
                                    No papers found
                                </h2>
                                <p className="text-gray-500 text-sm mt-2">
                                    Try changing filters or upload a new paper
                                </p>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 mt-4">
                            {search && (
                                <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                    🔍 {search}
                                    <button onClick={() => setSearch("")}>✕</button>
                                </div>
                            )}

                            {courseFilter && (
                                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                    🎓 {courseFilter}
                                    <button onClick={() => setCourseFilter("")}>✕</button>
                                </div>
                            )}

                            {examFilter && (
                                <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                    📝 {examFilter}
                                    <button onClick={() => setExamFilter("")}>✕</button>
                                </div>
                            )}

                            {yearFilter && (
                                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                    📅 {yearFilter}
                                    <button onClick={() => setYearFilter("")}>✕</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Papers Grid */}

                    {loading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[...Array(8)].map((_, i) => (
                                <div
                                    key={i}
                                    className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl p-5 animate-pulse"
                                >
                                    <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                                    <div className="h-32 bg-gray-200 rounded-xl mb-4"></div>
                                    <div className="flex gap-2">
                                        <div className="h-10 bg-gray-200 rounded-xl flex-1"></div>
                                        <div className="h-10 bg-gray-200 rounded-xl flex-1"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="p-[1px] rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                        <div className="bg-white rounded-3xl p-5">

                            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 hover:shadow-[0_10px_40px_rgba(99,102,241,0.3)]" >

                                {filteredPapers.map((paper) => (

                                    <motion.div
                                        key={paper._id}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="bg-white border border-gray-200 rounded-2xl p-5 
  shadow-sm hover:shadow-lg hover:-translate-y-1 
  transition-all duration-300"
                                    >
                                        {/* Header */}
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500 text-xl">
                                                <FaFilePdf />
                                            </div>

                                            <div>
                                                <h2 className="text-gray-800 font-semibold text-lg line-clamp-1">
                                                    {paper.title}
                                                </h2>
                                                <p className="text-gray-500 text-sm">
                                                    {paper.course} • Sem {paper.semester || "-"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="space-y-1 text-sm text-gray-500 mb-4">
                                            <p>Exam: {paper.examType}</p>
                                            <p>Year: {paper.year}</p>
                                        </div>
                                        {/* Preview (clean placeholder) */}
                                        <div
                                            onClick={() => setSelectedPdf(paper.fileUrl)}
                                            className="rounded-xl border border-gray-200 bg-gray-50 h-40 mb-4 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition"
                                        >
                                            <div className="text-center">
                                                <div className="text-3xl mb-1">📄</div>
                                                <p className="text-gray-500 text-xs">Click to preview</p>
                                            </div>
                                        </div>

                                        {/* Buttons */}
                                        <div className="flex gap-2">

                                            <button
                                                onClick={() => setSelectedPdf(paper.fileUrl)}
                                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                                            >
                                                <FaEye />
                                                View
                                            </button>
                                            <button
                                                onClick={() => handleDownload(paper.fileUrl)}
                                                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 
  hover:from-purple-600 hover:to-indigo-700 text-white py-2 rounded-xl 
  text-sm font-medium flex items-center justify-center gap-2 shadow-md"
                                            >
                                                <FaDownload />
                                                Download
                                            </button>
                                        </div>
                                    </motion.div>

                                ))}

                            </div>
                        </div>
                    </div>
                    {
                        selectedPdf && (
                            <PDFViewer
                                fileUrl={selectedPdf}
                                onClose={() => setSelectedPdf(null)}
                            />
                        )
                    }
                </div >
            </div>

        </>

    );
}

export default BrowsePYQ;
