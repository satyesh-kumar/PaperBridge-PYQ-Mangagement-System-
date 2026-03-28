import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Navbar2 from "../components/Navbar2";

function Home() {
    const [papers, setPapers] = useState([]);
    const [search, setSearch] = useState("");
    useEffect(() => {
        axios.get("http://localhost:5000/api/pyqs")
            .then(res => setPapers(res.data.slice(0, 8))); // show only few
    }, []);


    const filtered = papers.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#0b0f19] bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50 text-gray-800-white">

            <Navbar2 />

            {/* HERO */}
            <section className="relative px-6 py-24 md:py-10 text-center overflow-hidden">

                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50"></div>

                {/* Glow */}
                <div className="absolute w-[500px] h-[500px] bg-indigo-300 blur-[120px] opacity-30 top-[-120px] left-[-120px]" />
                <div className="absolute w-[400px] h-[400px] bg-purple-300 blur-[120px] opacity-30 bottom-[-120px] right-[-120px]" />

                <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">

                    {/* HEADLINE */}
                    <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gray-800">
                        All Your Previous Year Papers
                    </h1>

                    <h2 className="text-4xl md:text-5xl font-bold text-indigo-600 mt-2">
                        In One Place
                    </h2>

                    {/* SUBTEXT */}
                    <p className="text-gray-500 mt-6 text-base md:text-lg max-w-lg">
                        Access, upload and organize PYQs with a clean and smart platform built for students.
                    </p>

                    {/* CTA */}
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

                    {/* TRUST TEXT */}
                    <p className="text-xs text-gray-400 mt-6">
                        Used by students for faster exam preparation
                    </p>

                </div>
            </section>

            {/* LIVE RESULTS (🔥 PRO FEATURE) */}
            <section className="max-w-6xl mx-auto px-6 mt-16">

              
                <div className="flex items-center justify-between mb-6">

                    <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                        🕒 Recently Added Papers
                    </h2>

                    <Link
                        to="/browse"
                        className="text-sm text-indigo-600 hover:underline"
                    >
                        View all →
                    </Link>

                </div>

                {/* GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

                    {papers.slice(0, 8).map((paper) => (

                        <div
                            key={paper._id}
                            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm 
        hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                        >

                            {/* TITLE */}
                            <h3 className="text-sm font-medium text-gray-800 line-clamp-2">
                                {paper.title}
                            </h3>

                            {/* META */}
                            <p className="text-xs text-gray-500 mt-2">
                                {paper.course} • {paper.examType} • {paper.year}
                            </p>

                            {/* PREVIEW BOX */}
                            <div className="mt-3 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                PDF Preview
                            </div>

                            {/* ACTION */}
                            <button
                                onClick={() => window.open(paper.fileUrl)}
                                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-medium transition"
                            >
                                View Paper
                            </button>

                        </div>

                    ))}

                </div>

            </section>

            {/* TRENDING */}
            <section className="max-w-6xl mx-auto px-6 py-10">

                <h2 className="text-xl font-semibold mb-4">
                    🔥 Trending Papers
                </h2>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">

                    {[1, 2, 3].map((_, i) => (
                        <div key={i}
                            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition">

                            <h3 className="font-medium">Data Structures Mid 1</h3>
                            <p className="text-sm text-gray-500 mt-1">B.Tech • 2024</p>

                        </div>
                    ))}

                </div>

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
                        desc: "Search like Google: 'easy DSA papers'",
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
                        className="bg-white/80 backdrop-blur-xl border border-white/40 
      rounded-2xl p-6 shadow-md hover:shadow-xl transition hover:-translate-y-1"
                    >
                        <div className="text-3xl mb-3">{item.icon}</div>
                        <h3 className="text-lg font-semibold">{item.title}</h3>
                        <p className="text-gray-500 mt-2 text-sm">{item.desc}</p>
                    </div>

                ))}

            </section>

            {/* FOOTER */}
            <footer className="bg-white mt-20 border-t border-gray-200">

                {/* TOP GRADIENT LINE */}
                <div className="h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                <div className="max-w-6xl mx-auto px-6 py-14 grid md:grid-cols-4 gap-10">

                    {/* BRAND */}
                    <div>
                        <h2 className="text-xl font-bold text-indigo-600">
                            PaperBridge
                        </h2>

                        <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                            A smarter way to access and manage previous year question papers for better exam preparation.
                        </p>

                        {/* SOCIALS */}
                        <div className="flex gap-3 mt-4">
                            <span className="text-gray-400 hover:text-indigo-600 cursor-pointer">🌐</span>
                            <span className="text-gray-400 hover:text-indigo-600 cursor-pointer">🐦</span>
                            <span className="text-gray-400 hover:text-indigo-600 cursor-pointer">💼</span>
                        </div>
                    </div>

                    {/* PRODUCT */}
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-4">Product</h3>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li>
                                <Link to="/browse" className="hover:text-indigo-600 transition">
                                    Browse Papers
                                </Link>
                            </li>
                            <li>
                                <Link to="/upload" className="hover:text-indigo-600 transition">
                                    Upload Papers
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* RESOURCES */}
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-4">Resources</h3>
                        <ul className="space-y-2 text-sm text-gray-500">
                            <li className="hover:text-indigo-600 cursor-pointer transition">Documentation</li>
                            <li className="hover:text-indigo-600 cursor-pointer transition">Help Center</li>
                            <li className="hover:text-indigo-600 cursor-pointer transition">Privacy Policy</li>
                        </ul>
                    </div>

                    {/* NEWSLETTER (🔥 REAL PRODUCT TOUCH) */}
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-4">
                            Stay Updated
                        </h3>

                        <p className="text-sm text-gray-500 mb-3">
                            Get latest papers and updates.
                        </p>



                    </div>

                </div>

                {/* BOTTOM */}
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