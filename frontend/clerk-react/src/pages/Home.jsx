import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Navbar2 from "../components/Navbar2";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Home() {
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API_URL}/api/pyqs`)
            .then(res => setPapers(res.data.slice(0, 8)))
            .catch(err => console.error("Failed to load papers:", err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50 text-gray-800">

            <Navbar2 />

            {/* HERO */}
            <section className="relative px-6 py-24 md:py-16 text-center overflow-hidden">

                {/* Glow blobs */}
                <div className="absolute w-[500px] h-[500px] bg-indigo-300 blur-[120px] opacity-30 top-[-120px] left-[-120px]" />
                <div className="absolute w-[400px] h-[400px] bg-purple-300 blur-[120px] opacity-30 bottom-[-120px] right-[-120px]" />

                <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">

                    <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-800">
                        All Your Previous Year Papers
                    </h1>

                    <h2 className="text-4xl md:text-5xl font-bold text-indigo-600 mt-2">
                        In One Place
                    </h2>

                    <p className="text-gray-500 mt-6 text-base md:text-lg max-w-lg">
                        Access, upload and organize PYQs with a clean and smart platform built for students.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 mt-8">
                        <Link
                            to="/browse"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-sm transition text-sm font-medium"
                        >
                            Browse Papers
                        </Link>
                        <Link
                            to="/upload"
                            className="bg-white border border-gray-200 px-6 py-3 rounded-xl hover:bg-gray-100 transition text-sm font-medium"
                        >
                            Upload PYQ
                        </Link>
                    </div>

                    <p className="text-xs text-gray-400 mt-6">
                        Used by students for faster exam preparation
                    </p>

                </div>
            </section>

            {/* RECENTLY ADDED */}
            <section className="max-w-6xl mx-auto px-6 mt-8 mb-16">

                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                        🕒 Recently Added Papers
                    </h2>
                    <Link to="/browse" className="text-sm text-indigo-600 hover:underline">
                        View all →
                    </Link>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                                <div className="h-24 bg-gray-200 rounded-lg mb-4" />
                                <div className="h-8 bg-gray-200 rounded-lg" />
                            </div>
                        ))}
                    </div>
                ) : papers.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-5xl mb-3">📂</div>
                        <p>No papers yet. Be the first to upload!</p>
                        <Link to="/upload" className="mt-4 inline-block text-indigo-600 hover:underline text-sm">
                            Upload a paper →
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {papers.map((paper) => (
                            <div
                                key={paper._id}
                                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                            >
                                <h3 className="text-sm font-medium text-gray-800 line-clamp-2">
                                    {paper.title}
                                </h3>
                                <p className="text-xs text-gray-500 mt-2">
                                    {paper.course} • {paper.examType} • {paper.year}
                                </p>
                                <div className="mt-3 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                    📄 PDF
                                </div>
                                <button
                                    onClick={() => window.open(paper.fileUrl)}
                                    className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-medium transition"
                                >
                                    View Paper
                                </button>
                            </div>
                        ))}
                    </div>
                )}

            </section>

            {/* FEATURES */}
            <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
                {[
                    {
                        title: "Centralized Papers",
                        desc: "All PYQs in one place — no more searching in WhatsApp.",
                        icon: "📂"
                    },
                    {
                        title: "AI Smart Search",
                        desc: "Search like Google: 'easy DSA papers from 2024'",
                        icon: "🤖"
                    },
                    {
                        title: "Instant Access",
                        desc: "Preview & download instantly with one click.",
                        icon: "⚡"
                    }
                ].map((item, i) => (
                    <div
                        key={i}
                        className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow-md hover:shadow-xl transition hover:-translate-y-1"
                    >
                        <div className="text-3xl mb-3">{item.icon}</div>
                        <h3 className="text-lg font-semibold">{item.title}</h3>
                        <p className="text-gray-500 mt-2 text-sm">{item.desc}</p>
                    </div>
                ))}
            </section>

            {/* FOOTER */}
            <footer className="bg-white mt-4 border-t border-gray-200">

                <div className="h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <div className="max-w-6xl mx-auto px-6 py-14 grid md:grid-cols-4 gap-10">

                    <div>
                        <h2 className="text-xl font-bold text-indigo-600">PaperBridge</h2>
                        <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                            A smarter way to access and manage previous year question papers for better exam preparation.
                        </p>
                        <div className="flex gap-3 mt-4">
                            <span className="text-gray-400 hover:text-indigo-600 cursor-pointer">🌐</span>
                            <span className="text-gray-400 hover:text-indigo-600 cursor-pointer">🐦</span>
                            <span className="text-gray-400 hover:text-indigo-600 cursor-pointer">💼</span>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-800 mb-4">Product</h3>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li><Link to="/browse" className="hover:text-indigo-600 transition">Browse Papers</Link></li>
                            <li><Link to="/upload" className="hover:text-indigo-600 transition">Upload Papers</Link></li>
                            <li><Link to="/dashboard" className="hover:text-indigo-600 transition">Dashboard</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-800 mb-4">Resources</h3>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li className="hover:text-indigo-600 cursor-pointer transition">Documentation</li>
                            <li className="hover:text-indigo-600 cursor-pointer transition">Help Center</li>
                            <li className="hover:text-indigo-600 cursor-pointer transition">Privacy Policy</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-800 mb-4">Stay Updated</h3>
                        <p className="text-sm text-gray-500 mb-3">Get latest papers and updates.</p>
                        <Link
                            to="/browse"
                            className="inline-block px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition"
                        >
                            Browse Now →
                        </Link>
                    </div>

                </div>

                <div className="border-t border-gray-200 py-5 text-center text-sm text-gray-400">
                    © {new Date().getFullYear()} PaperBridge • Built for students
                    <div className="mt-2 flex justify-center gap-4 text-xs">
                        <span className="hover:text-indigo-600 cursor-pointer">Terms</span>
                        <span className="hover:text-indigo-600 cursor-pointer">Privacy</span>
                        <span className="hover:text-indigo-600 cursor-pointer">Contact</span>
                    </div>
                </div>

            </footer>
        </div>
    );
}

export default Home;