import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaClock, FaCalendarCheck, FaGraduationCap, FaFire, FaBookOpen } from "react-icons/fa";

export default function ExamCountdownWidget() {
    // Default exam date: 3 weeks from now or saved in localStorage
    const [examName, setExamName] = useState(() => {
        return localStorage.getItem("paperbridge_exam_name") || "End Semester Examinations";
    });

    const [examDate, setExamDate] = useState(() => {
        const saved = localStorage.getItem("paperbridge_exam_date");
        if (saved) return saved;
        const target = new Date();
        target.setDate(target.getDate() + 21);
        return target.toISOString().split("T")[0];
    });

    const [isEditing, setIsEditing] = useState(false);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const calculateTime = () => {
            const difference = +new Date(examDate) - +new Date();
            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                });
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            }
        };

        calculateTime();
        const timer = setInterval(calculateTime, 1000);
        return () => clearInterval(timer);
    }, [examDate]);

    const handleSave = (e) => {
        e.preventDefault();
        localStorage.setItem("paperbridge_exam_name", examName);
        localStorage.setItem("paperbridge_exam_date", examDate);
        setIsEditing(false);
    };

    return (
        <div className="bg-gradient-to-br from-[#0D1B2A] via-[#1B2A4A] to-[#0D1B2A] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#C89D5C]/30 relative overflow-hidden">
            {/* Background luxury watermark */}
            <div className="absolute -right-6 -bottom-6 w-40 h-40 rounded-full bg-[#C89D5C]/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                {/* Left Header */}
                <div className="max-w-md">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C89D5C]/20 text-[#E5C378] text-[11px] font-bold mb-3 border border-[#C89D5C]/30">
                        <FaFire className="text-amber-400 text-xs animate-bounce" />
                        <span>Exam Preparation Hub</span>
                    </div>

                    {isEditing ? (
                        <form onSubmit={handleSave} className="space-y-3 mt-2">
                            <input
                                type="text"
                                value={examName}
                                onChange={(e) => setExamName(e.target.value)}
                                placeholder="Exam Title (e.g. End Semester Exams)"
                                className="w-full px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs text-white outline-none focus:border-[#C89D5C]"
                            />
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={examDate}
                                    onChange={(e) => setExamDate(e.target.value)}
                                    className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs text-white outline-none focus:border-[#C89D5C]"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-[#C89D5C] text-[#0D1B2A] rounded-full text-xs font-bold hover:bg-[#E5C378] transition cursor-pointer"
                                >
                                    Save Target
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight flex items-center gap-2">
                                <span>{examName}</span>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-[11px] font-sans font-normal text-[#C89D5C] hover:underline cursor-pointer opacity-80"
                                >
                                    (Edit Date)
                                </button>
                            </h3>
                            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                                Target Date: <span className="font-semibold text-white">{new Date(examDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>. Start solving verified PYQs to master the exam pattern.
                            </p>
                        </>
                    )}
                </div>

                {/* Right: Live Countdown Badges + CTA */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex flex-col items-center justify-center w-14 h-16 sm:w-16 sm:h-18 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                            <span className="text-xl sm:text-2xl font-serif font-bold text-[#E5C378]">
                                {String(timeLeft.days).padStart(2, "0")}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-slate-300 tracking-wider">Days</span>
                        </div>

                        <div className="flex flex-col items-center justify-center w-14 h-16 sm:w-16 sm:h-18 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                            <span className="text-xl sm:text-2xl font-serif font-bold text-[#E5C378]">
                                {String(timeLeft.hours).padStart(2, "0")}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-slate-300 tracking-wider">Hours</span>
                        </div>

                        <div className="flex flex-col items-center justify-center w-14 h-16 sm:w-16 sm:h-18 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                            <span className="text-xl sm:text-2xl font-serif font-bold text-[#E5C378]">
                                {String(timeLeft.minutes).padStart(2, "0")}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-slate-300 tracking-wider">Mins</span>
                        </div>

                        <div className="flex flex-col items-center justify-center w-14 h-16 sm:w-16 sm:h-18 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                            <span className="text-xl sm:text-2xl font-serif font-bold text-[#E5C378]">
                                {String(timeLeft.seconds).padStart(2, "0")}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-slate-300 tracking-wider">Secs</span>
                        </div>
                    </div>

                    <Link
                        to="/browse?exam=End%20Semester"
                        className="w-full sm:w-auto px-5 py-3 rounded-full bg-[#C89D5C] hover:bg-[#E5C378] text-[#0D1B2A] text-xs font-bold shadow-lg transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                        <FaBookOpen className="text-xs" />
                        <span>Practice Papers ↗</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
