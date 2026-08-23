import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaGithub,
  FaDiscord,
  FaTelegramPlane,
  FaLinkedin,
  FaEnvelope,
  FaShieldAlt,
  FaCheckCircle,
  FaHeart,
  FaGraduationCap,
  FaFilePdf,
  FaStickyNote,
  FaUpload,
  FaPaperPlane,
} from "react-icons/fa";
import toast from "react-hot-toast";
import PaperBridgeLogo from "./PaperBridgeLogo";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid university or personal email address.");
      return;
    }
    setSubscribed(true);
    toast.success("Subscribed! You will receive exam alert notifications.");
    setEmail("");
  };

  return (
    <footer className="w-full bg-[#FAF8F5] dark:bg-[#0A0908] text-[#1A1614] dark:text-[#F5F2EC] border-t border-[#EAE2D8] dark:border-[#24201C] transition-colors duration-300 font-sans">
      {/* Top Banner / Callout */}
      <div className="border-b border-[#EAE2D8] dark:border-[#1E1A17] bg-[#F4EFEA]/60 dark:bg-[#12100E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#4A2E1B] dark:bg-[#C89D5C] text-[#FAF8F5] dark:text-[#0D1B2A] flex items-center justify-center shrink-0 text-xl shadow-sm">
              <FaGraduationCap />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                United University Academic Archive
              </h3>
              <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mt-0.5 max-w-xl">
                Open-access community repository built to empower students with verified past examination papers and handwritten summaries.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto shrink-0">
            <Link
              to="/upload"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#0D1B2A] hover:bg-[#1E293B] text-[#FAF8F5] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] dark:text-[#0D1B2A] text-xs font-bold shadow-sm transition min-h-[42px]"
            >
              <FaUpload className="text-[10px]" />
              <span>Contribute Paper ↗</span>
            </Link>
            <Link
              to="/browse"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-[#1A1614] border border-[#DDD2C4] dark:border-[#2E2822] text-[#0D1B2A] dark:text-[#FAF8F5] hover:bg-[#FAF8F5] text-xs font-semibold shadow-2xs transition min-h-[42px]"
            >
              <FaFilePdf className="text-xs text-[#C89D5C]" />
              <span>Browse Repository</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          
          {/* Column 1: Brand & Bio (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <PaperBridgeLogo
              variant="horizontal"
              size="lg"
              subtitle="FAST ACCESS TO PAST PAPERS"
            />
            <p className="text-xs leading-relaxed text-[#6B5B49] dark:text-[#C2B3A0] max-w-sm pt-2">
              The primary digital bridge connecting United University students to 15,000+ curated question papers, professor slides, and unit-wise exam study kits.
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#F4EFEA] dark:bg-[#1A1614] text-[#8C6239] dark:text-[#E5C378] border border-[#DDD2C4] dark:border-[#2E2822]">
                <FaCheckCircle className="text-emerald-600 text-[10px]" /> 100% Verified
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#F4EFEA] dark:bg-[#1A1614] text-[#8C6239] dark:text-[#E5C378] border border-[#DDD2C4] dark:border-[#2E2822]">
                <FaShieldAlt className="text-[#C89D5C] text-[10px]" /> Free for Students
              </span>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3 pt-3">
              {[
                { icon: <FaGithub />, href: "https://github.com", label: "GitHub" },
                { icon: <FaDiscord />, href: "https://discord.com", label: "Discord Community" },
                { icon: <FaTelegramPlane />, href: "https://telegram.org", label: "Telegram Group" },
                { icon: <FaLinkedin />, href: "https://linkedin.com", label: "LinkedIn" },
                { icon: <FaEnvelope />, href: "mailto:support@paperbridge.edu", label: "Email Support" },
              ].map((item, i) => (
                <a
                  key={i}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                  className="w-8 h-8 rounded-full bg-white dark:bg-[#1A1614] border border-[#DDD2C4] dark:border-[#2E2822] text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#0D1B2A] dark:hover:text-white hover:border-[#C89D5C] flex items-center justify-center text-xs transition shadow-2xs"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Quick Links (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-serif text-sm font-bold text-[#0D1B2A] dark:text-[#FAF8F5] uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#C89D5C] dark:hover:text-[#E5C378] transition">
                  Home Portal
                </Link>
              </li>
              <li>
                <Link to="/browse" className="text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#C89D5C] dark:hover:text-[#E5C378] transition flex items-center gap-1.5">
                  <span>Question Papers</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#C89D5C]/20 text-[#8C6239] dark:text-[#E5C378]">PYQ</span>
                </Link>
              </li>
              <li>
                <Link to="/notes" className="text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#C89D5C] dark:hover:text-[#E5C378] transition flex items-center gap-1.5">
                  <span>Study Notes</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">Vault</span>
                </Link>
              </li>
              <li>
                <Link to="/upload" className="text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#C89D5C] dark:hover:text-[#E5C378] transition">
                  Upload Materials
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#C89D5C] dark:hover:text-[#E5C378] transition">
                  Student Library
                </Link>
              </li>
              <li>
                <Link to="/admin" className="text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#C89D5C] dark:hover:text-[#E5C378] transition">
                  Admin Console
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Academic Courses (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-serif text-sm font-bold text-[#0D1B2A] dark:text-[#FAF8F5] uppercase tracking-wider">
              Departments & Courses
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/browse?course=B.Tech" className="text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#C89D5C] dark:hover:text-[#E5C378] transition">
                  B.Tech (CSE, IT, ECE, ME, Civil)
                </Link>
              </li>
              <li>
                <Link to="/browse?course=MCA" className="text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#C89D5C] dark:hover:text-[#E5C378] transition">
                  MCA (Computer Applications)
                </Link>
              </li>
              <li>
                <Link to="/browse?course=MBA" className="text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#C89D5C] dark:hover:text-[#E5C378] transition">
                  MBA (Finance, Marketing, HR)
                </Link>
              </li>
              <li>
                <Link to="/browse?course=BCA" className="text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#C89D5C] dark:hover:text-[#E5C378] transition">
                  BCA (Bachelor of Computer Apps)
                </Link>
              </li>
              <li>
                <Link to="/browse?course=BBA" className="text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#C89D5C] dark:hover:text-[#E5C378] transition">
                  BBA & Commerce
                </Link>
              </li>
              <li>
                <Link to="/browse?course=Law" className="text-[#6B5B49] dark:text-[#C2B3A0] hover:text-[#C89D5C] dark:hover:text-[#E5C378] transition">
                  Faculty of Law & Legal Studies
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter & Exam Alerts (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-serif text-sm font-bold text-[#0D1B2A] dark:text-[#FAF8F5] uppercase tracking-wider">
              Exam Alerts & Updates
            </h4>
            <p className="text-xs text-[#6B5B49] dark:text-[#C2B3A0] leading-relaxed">
              Get notified when new mid-term and semester papers are uploaded before exams.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-2 pt-1">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Enter your student email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-[#161412] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full px-4 py-2 text-xs text-[#0D1B2A] dark:text-[#FAF8F5] placeholder:text-[#A8957E] focus:outline-hidden focus:border-[#C89D5C] transition shadow-2xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-full bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FaPaperPlane className="text-[10px]" />
                <span>{subscribed ? "Subscribed ✓" : "Get Exam Alerts"}</span>
              </button>
            </form>

            <div className="pt-2 flex items-center gap-2 text-[11px] text-[#8C7862] dark:text-[#A8957E]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational (99.9% Uptime)</span>
            </div>
          </div>
        </div>

        {/* Middle Disclaimer */}
        <div className="mt-12 pt-6 border-t border-[#EAE2D8] dark:border-[#1E1A17] text-[11px] text-[#8C7862] dark:text-[#A8957E] leading-relaxed">
          <p>
            <strong>Disclaimer:</strong> PaperBridge is an open academic sharing platform managed for the student community of United University. All examination papers, question banks, and handwritten lecture notes uploaded are the intellectual property of their respective professors, authors, and academic boards. Content is curated solely for non-commercial educational study and exam revision.
          </p>
        </div>

        {/* Bottom Bar: Copyright & Terms */}
        <div className="mt-8 pt-6 border-t border-[#EAE2D8] dark:border-[#1E1A17] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8C7862] dark:text-[#A8957E]">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()}</span>
            <span className="font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">PaperBridge</span>
            <span>· Fast Access to Past Papers. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1 text-[#6B5B49] dark:text-[#C2B3A0]">
              Built with <FaHeart className="text-rose-500 text-[10px]" /> for UU Students
            </span>
            <span className="text-[#DDD2C4] dark:text-[#2E2822]">|</span>
            <Link to="/browse" className="hover:text-[#C89D5C] transition">
              Archive
            </Link>
            <Link to="/notes" className="hover:text-[#C89D5C] transition">
              Notes
            </Link>
            <Link to="/upload" className="hover:text-[#C89D5C] transition">
              Contribute
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
