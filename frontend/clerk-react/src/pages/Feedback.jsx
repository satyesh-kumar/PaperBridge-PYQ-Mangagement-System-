import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, useUser } from "@clerk/react";
import axios from "axios";
import {
  FaCommentDots,
  FaStar,
  FaPaperPlane,
  FaCheckCircle,
  FaArrowLeft,
  FaHistory,
  FaShieldAlt,
  FaTimes,
  FaFilePdf,
  FaSearch,
  FaBug,
  FaRegLightbulb,
  FaDownload,
  FaExclamationCircle,
  FaBook,
  FaPlus,
  FaSyncAlt,
} from "react-icons/fa";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import Navbar2 from "../components/Navbar2";
import Footer from "../components/Footer";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ACADEMIC_YEARS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "Other",
];

const PROBLEM_OPTIONS = [
  { id: "Paper not found", label: "Paper not found", icon: "📄", desc: "Missing past year question paper" },
  { id: "Request a paper", label: "Request a paper", icon: "➕", desc: "Request an exam paper to be added" },
  { id: "Wrong paper", label: "Wrong paper", icon: "❌", desc: "Incorrect paper uploaded or wrong info" },
  { id: "Download problem", label: "Download problem", icon: "⬇️", desc: "Unable to download or open PDF" },
  { id: "Search problem", label: "Search problem", icon: "🔍", desc: "Search results inaccurate or broken" },
  { id: "Subject missing", label: "Subject missing", icon: "📚", desc: "Subject not listed in course" },
  { id: "Website problem", label: "Website problem", icon: "🐛", desc: "Page error, broken button, or bug" },
  { id: "Suggest improvement", label: "Suggest improvement", icon: "💡", desc: "Idea to improve PaperBridge" },
  { id: "Request a new feature", label: "Request a new feature", icon: "✨", desc: "New feature or tool suggestion" },
  { id: "General feedback", label: "General feedback", icon: "👍", desc: "Share your thoughts or compliments" },
  { id: "Other", label: "Other", icon: "💬", desc: "Anything else you'd like to tell us" },
];

export default function Feedback() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Active view: "form" or "history"
  const [activeTab, setActiveTab] = useState(
    searchParams.get("view") === "history" ? "history" : "form"
  );

  // Dynamic database lists
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [papers, setPapers] = useState([]);
  const [loadingAcademic, setLoadingAcademic] = useState(false);

  // User feedback & paper request history
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Primary 20-30s Form Fields
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courseName, setCourseName] = useState(searchParams.get("course") || "");
  const [academicYear, setAcademicYear] = useState(searchParams.get("year") || "1st Year");
  const [selectedProblem, setSelectedProblem] = useState(
    searchParams.get("problem") || "Paper not found"
  );

  // Progressive Disclosure Fields
  const [subjectName, setSubjectName] = useState(searchParams.get("subject") || "");
  const [examYear, setExamYear] = useState(searchParams.get("examYear") || "2026");
  const [paperTitle, setPaperTitle] = useState(searchParams.get("paperTitle") || "");
  const [paperId, setPaperId] = useState(searchParams.get("paperId") || "");
  const [searchQueryParam, setSearchQueryParam] = useState(searchParams.get("query") || "");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);

  // Auth headers helper
  const getAuthHeaders = async () => {
    const token = await getToken();
    const userEmail = (
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      ""
    ).toLowerCase().trim();

    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(userEmail ? { "x-user-email": userEmail } : {}),
      ...(user?.fullName ? { "x-user-name": user.fullName } : {}),
      ...(user?.id ? { "x-user-id": user.id } : {}),
    };
  };

  // Fetch courses and papers for progressive disclosure
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoadingAcademic(true);
        const [courseRes, pyqRes] = await Promise.all([
          axios.get(`${API_URL}/api/courses?status=active`, { timeout: 10000 }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/api/pyqs`, { timeout: 10000 }).catch(() => ({ data: [] })),
        ]);
        if (Array.isArray(courseRes.data) && courseRes.data.length > 0) {
          setCourses(courseRes.data);
          // If no course selected and we have courses, set default
          if (!courseName) {
            setCourseName(courseRes.data[0].name);
            setSelectedCourseId(courseRes.data[0]._id);
          } else {
            const match = courseRes.data.find(
              (c) => c.name.toLowerCase() === courseName.toLowerCase() || c.code.toLowerCase() === courseName.toLowerCase()
            );
            if (match) setSelectedCourseId(match._id);
          }
        }
        if (Array.isArray(pyqRes.data)) {
          setPapers(pyqRes.data);
        }
      } catch {
        // Fallback
      } finally {
        setLoadingAcademic(false);
      }
    }
    loadInitialData();
  }, []);

  // Fetch subjects dynamically when course changes
  useEffect(() => {
    if (!selectedCourseId) {
      setSubjects([]);
      return;
    }
    async function loadSubjects() {
      try {
        const res = await axios.get(`${API_URL}/api/subjects?courseId=${selectedCourseId}`, { timeout: 10000 });
        if (Array.isArray(res.data)) {
          setSubjects(res.data);
          if (res.data.length > 0 && !subjectName) {
            setSubjectName(res.data[0].name);
          }
        }
      } catch {
        setSubjects([]);
      }
    }
    loadSubjects();
  }, [selectedCourseId]);

  // Load user's history
  const loadHistory = async () => {
    if (!isSignedIn) return;
    try {
      setLoadingHistory(true);
      const headers = await getAuthHeaders();
      const [fbRes, reqRes] = await Promise.all([
        axios.get(`${API_URL}/api/feedback/my`, { headers, timeout: 10000 }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/paper-requests/my`, { headers, timeout: 10000 }).catch(() => ({ data: [] })),
      ]);
      if (Array.isArray(fbRes.data)) setMyFeedbacks(fbRes.data);
      if (Array.isArray(reqRes.data)) setMyRequests(reqRes.data);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, isSignedIn]);

  // Handle course change
  const handleCourseChange = (e) => {
    const val = e.target.value;
    setSelectedCourseId(val);
    const matched = courses.find((c) => c._id === val);
    setCourseName(matched ? matched.name : val);
  };

  // Dynamic context placeholder for message box
  const getMessagePlaceholder = useMemo(() => {
    switch (selectedProblem) {
      case "Paper not found":
      case "Request a paper":
        return "Tell us which paper or exam year you are looking for (e.g., End Semester 2026)...";
      case "Wrong paper":
        return "What is wrong with this paper? (e.g., wrong semester, wrong syllabus, missing pages)...";
      case "Download problem":
        return "What went wrong when downloading? (e.g., page 404, file corrupted, slow download)...";
      case "Search problem":
        return "What were you searching for and what went wrong?...";
      case "Subject missing":
        return "Tell us which subject code or syllabus unit is missing...";
      case "Website problem":
        return "Tell us what went wrong on the website...";
      case "Suggest improvement":
        return "What would you like PaperBridge to improve?";
      case "Request a new feature":
        return "What new feature or tool would make your study easier?";
      default:
        return "Tell us your thoughts in a few words...";
    }
  }, [selectedProblem]);

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!courseName) {
      toast.error("Please select your course.");
      return;
    }

    // Determine if this is a dedicated Paper Request
    const isPaperRequest = selectedProblem === "Paper not found" || selectedProblem === "Request a paper";

    try {
      setSubmitting(true);
      const headers = await getAuthHeaders();

      if (isPaperRequest) {
        // Submit via Paper Request API
        const payload = {
          course: courseName,
          courseId: selectedCourseId || null,
          academicYear,
          subject: subjectName || "General",
          examYear: parseInt(examYear, 10) || 2026,
          examType: "End Semester",
          message: message.trim(),
          notifyMe: true,
          studentName: user?.fullName || "Student",
          studentEmail: user?.primaryEmailAddress?.emailAddress || "",
        };

        const res = await axios.post(`${API_URL}/api/paper-requests`, payload, {
          headers,
          timeout: 15000,
        });

        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        setSubmittedResult({
          type: "request",
          referenceId: res.data.referenceId || `PB-REQ-${Date.now().toString().slice(-6)}`,
          title: "Paper request submitted!",
          subtitle: "We'll work on collecting and adding this paper to PaperBridge.",
        });
      } else {
        // Submit via Feedback API
        const payload = {
          problemType: selectedProblem,
          feedbackType: selectedProblem,
          studentName: user?.fullName || "Student",
          courseId: selectedCourseId || null,
          course: courseName,
          academicYear,
          subject: subjectName || "",
          paperId: paperId || null,
          paperTitle: paperTitle || "",
          searchQuery: searchQueryParam || "",
          rating: rating || null,
          message: message.trim() || `${selectedProblem} reported by student.`,
          userName: user?.fullName || "Student",
          userEmail: user?.primaryEmailAddress?.emailAddress || "",
        };

        const res = await axios.post(`${API_URL}/api/feedback`, payload, {
          headers,
          timeout: 15000,
        });

        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        setSubmittedResult({
          type: "feedback",
          referenceId: res.data.referenceId || `PB-FB-${Date.now().toString().slice(-6)}`,
          title: "Feedback submitted!",
          subtitle: "Thanks for helping us improve PaperBridge.",
        });
      }
    } catch (err) {
      if (err.response?.status === 409) {
        toast.success(err.response.data?.message || "You have already requested this paper.");
        setSubmittedResult({
          type: "request",
          referenceId: err.response.data?.referenceId || "ALREADY-REQUESTED",
          title: "Paper Already Requested!",
          subtitle: "You've already requested this paper. We're working on adding it.",
        });
      } else {
        toast.error(err.response?.data?.error || "Failed to submit. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedResult(null);
    setMessage("");
    setRating(null);
    setActiveTab("form");
  };

  // Status mapping for user display
  const formatStatusBadge = (status = "") => {
    const s = status.toUpperCase();
    if (s === "NEW") {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Received</span>;
    }
    if (s === "UNDER REVIEW" || s === "UNDER_REVIEW") {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Being Reviewed</span>;
    }
    if (s === "IN PROGRESS" || s === "IN_PROGRESS" || s === "COMING_SOON") {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">⏳ We're Working on It</span>;
    }
    if (s === "RESOLVED" || s === "AVAILABLE") {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">✓ Resolved</span>;
    }
    if (s === "REJECTED" || s === "NOT_AVAILABLE") {
      return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">Closed</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">{status}</span>;
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#1A1614] dark:text-[#F5F2EC] flex flex-col font-sans transition-colors duration-300">
      <Navbar2 />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full flex-1">
        {/* Navigation Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C7862] dark:text-[#A8957E] hover:text-[#4A2E1B] dark:hover:text-[#FAF8F5] transition"
          >
            <FaArrowLeft className="text-[10px]" /> Back to Dashboard
          </Link>

          {/* Tab Switcher: Submit Form vs My History */}
          <div className="flex items-center gap-1 bg-[#F4EFEA] dark:bg-[#1C1916] p-1 rounded-full border border-[#EAE2D8] dark:border-[#2E2822]">
            <button
              type="button"
              onClick={() => setActiveTab("form")}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                activeTab === "form"
                  ? "bg-white dark:bg-[#24201C] text-[#4A2E1B] dark:text-[#E5C378] font-bold shadow-2xs"
                  : "text-[#8C7862] hover:text-[#1A1614] dark:hover:text-white"
              }`}
            >
              Give Feedback
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-white dark:bg-[#24201C] text-[#4A2E1B] dark:text-[#E5C378] font-bold shadow-2xs"
                  : "text-[#8C7862] hover:text-[#1A1614] dark:hover:text-white"
              }`}
            >
              <FaHistory className="text-[10px]" /> My History ({myFeedbacks.length + myRequests.length})
            </button>
          </div>
        </div>

        {/* VIEW 1: COMPACT 20-30s FEEDBACK FORM */}
        {activeTab === "form" && (
          <>
            {submittedResult ? (
              /* Success Screen */
              <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-8 sm:p-12 text-center shadow-sm animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-500/20">
                  <FaCheckCircle />
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                  ✅ {submittedResult.title}
                </h2>
                <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mb-6 max-w-md mx-auto">
                  {submittedResult.subtitle}
                </p>

                {/* Reference ID Pill */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] mb-8">
                  <span className="text-xs text-[#8C7862] dark:text-[#A8957E]">Tracking ID:</span>
                  <span className="font-mono text-sm font-bold text-[#4A2E1B] dark:text-[#E5C378]">
                    {submittedResult.referenceId}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to="/dashboard"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] text-xs font-bold transition shadow-xs"
                  >
                    Back to Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] text-[#1A1614] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] text-xs font-semibold transition cursor-pointer"
                  >
                    Submit Another
                  </button>
                </div>
              </div>
            ) : (
              /* The 20-30 Second Flow */
              <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm">
                {/* Header */}
                <div className="mb-6">
                  <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] tracking-tight flex items-center gap-2">
                    💬 Help us improve PaperBridge
                  </h1>
                  <p className="text-xs sm:text-sm text-[#8C7862] dark:text-[#A8957E] mt-1">
                    Tell us what you need. It only takes a few seconds.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Step 1: Student Name (Read-Only Snapshot from Clerk Auth) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7862] dark:text-[#A8957E] mb-1">
                      Student Name
                    </label>
                    <div className="w-full px-4 py-2.5 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs font-semibold text-[#1A1614] dark:text-[#FAF8F5] flex items-center justify-between">
                      <span>{user?.fullName || user?.firstName || "Signed in Student"}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        Verified Account
                      </span>
                    </div>
                  </div>

                  {/* Step 2 & 3: Course & Academic Year Dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7862] dark:text-[#A8957E] mb-1">
                        Course *
                      </label>
                      <select
                        value={selectedCourseId}
                        onChange={handleCourseChange}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs font-semibold text-[#1A1614] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#8C6239] cursor-pointer"
                      >
                        {courses.length === 0 && <option value="">Select Course</option>}
                        {courses.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7862] dark:text-[#A8957E] mb-1">
                        Academic Year *
                      </label>
                      <select
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs font-semibold text-[#1A1614] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#8C6239] cursor-pointer"
                      >
                        {ACADEMIC_YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Step 4: What problem did you face? (Clickable Cards) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8C7862] dark:text-[#A8957E] mb-2">
                      What problem did you face?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PROBLEM_OPTIONS.map((item) => {
                        const isSelected = selectedProblem === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedProblem(item.id)}
                            className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                              isSelected
                                ? "bg-[#4A2E1B] text-white border-[#4A2E1B] dark:bg-[#C5A059] dark:text-[#0F0E0D] dark:border-[#C5A059] shadow-xs font-bold"
                                : "bg-[#FAF8F5] dark:bg-[#1C1916] text-[#4A3E31] dark:text-[#FAF8F5] border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#8C6239]"
                            }`}
                          >
                            <span className="text-sm shrink-0">{item.icon}</span>
                            <span className="text-xs truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 5: PROGRESSIVE DISCLOSURE CONDITIONAL FIELDS */}
                  <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] space-y-3">
                    {/* CASE 1 & CASE 2: PAPER NOT FOUND / REQUEST A PAPER */}
                    {(selectedProblem === "Paper not found" || selectedProblem === "Request a paper") && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#FAF8F5] mb-1">
                              Which Subject?
                            </label>
                            {subjects.length > 0 ? (
                              <select
                                value={subjectName}
                                onChange={(e) => setSubjectName(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-[#24201C] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs font-semibold text-[#1A1614] dark:text-[#FAF8F5] focus:outline-hidden"
                              >
                                {subjects.map((s) => (
                                  <option key={s._id} value={s.name}>
                                    {s.name} ({s.code})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={subjectName}
                                onChange={(e) => setSubjectName(e.target.value)}
                                placeholder="e.g. Data Structures, Operating Systems"
                                className="w-full px-3 py-2 bg-white dark:bg-[#24201C] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#1A1614] dark:text-[#FAF8F5] focus:outline-hidden"
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#FAF8F5] mb-1">
                              Paper / Exam Year
                            </label>
                            <input
                              type="number"
                              min="2015"
                              max="2035"
                              value={examYear}
                              onChange={(e) => setExamYear(e.target.value)}
                              placeholder="e.g. 2026"
                              className="w-full px-3 py-2 bg-white dark:bg-[#24201C] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#1A1614] dark:text-[#FAF8F5] focus:outline-hidden font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CASE 3 & CASE 4: WRONG PAPER / DOWNLOAD PROBLEM */}
                    {(selectedProblem === "Wrong paper" || selectedProblem === "Download problem") && (
                      <div>
                        <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#FAF8F5] mb-1">
                          Which Paper?
                        </label>
                        {paperTitle ? (
                          <div className="w-full px-3 py-2 bg-white dark:bg-[#24201C] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs font-semibold text-[#1A1614] dark:text-[#FAF8F5] flex items-center justify-between">
                            <span className="truncate">{paperTitle}</span>
                            <span className="text-[10px] text-[#8C7862] shrink-0 ml-2">Attached ID: {paperId || "N/A"}</span>
                          </div>
                        ) : (
                          <select
                            value={paperId}
                            onChange={(e) => {
                              const pId = e.target.value;
                              setPaperId(pId);
                              const p = papers.find((x) => x._id === pId);
                              if (p) {
                                setPaperTitle(p.title);
                                if (p.course) setCourseName(p.course);
                                if (p.subject) setSubjectName(p.subject);
                              }
                            }}
                            className="w-full px-3 py-2 bg-white dark:bg-[#24201C] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs font-semibold text-[#1A1614] dark:text-[#FAF8F5] focus:outline-hidden cursor-pointer"
                          >
                            <option value="">Select Paper from Repository</option>
                            {papers.slice(0, 50).map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.title} ({p.academicYear || p.year})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {/* CASE 5: SEARCH PROBLEM */}
                    {selectedProblem === "Search problem" && (
                      <div>
                        <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#FAF8F5] mb-1">
                          What were you searching for?
                        </label>
                        <input
                          type="text"
                          value={searchQueryParam}
                          onChange={(e) => setSearchQueryParam(e.target.value)}
                          placeholder="e.g. Data Structures 2026 Mid Semester"
                          className="w-full px-3 py-2 bg-white dark:bg-[#24201C] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#1A1614] dark:text-[#FAF8F5] focus:outline-hidden"
                        />
                      </div>
                    )}

                    {/* MESSAGE BOX (Max 1000 Chars) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-[#4A3E31] dark:text-[#FAF8F5]">
                          {selectedProblem === "Paper not found" || selectedProblem === "Request a paper"
                            ? "Optional details:"
                            : "Tell us what went wrong / your message:"}
                        </label>
                        <span className={`text-[10px] font-semibold ${message.length > 950 ? "text-rose-500" : "text-[#8C7862] dark:text-[#A8957E]"}`}>
                          {message.length} / 1000
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={getMessagePlaceholder}
                        className="w-full p-3 bg-white dark:bg-[#24201C] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl text-xs text-[#1A1614] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#8C6239] resize-none"
                      />
                    </div>
                  </div>

                  {/* Step 6: OPTIONAL RATING (Secondary) */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                    <div>
                      <p className="text-xs font-semibold text-[#8C7862] dark:text-[#A8957E]">
                        How was your PaperBridge experience? <span className="text-[10px] font-normal">(optional)</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(rating === star ? null : star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="text-lg text-amber-400 dark:text-amber-300 hover:scale-110 transition cursor-pointer p-0.5"
                          title={`${star} Star`}
                        >
                          <FaStar className={(hoverRating || rating || 0) >= star ? "fill-current" : "opacity-30"} />
                        </button>
                      ))}
                      {rating && (
                        <span className="text-xs font-bold text-amber-500 ml-1">
                          {rating}/5
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step 7: SUBMIT BUTTON */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 px-6 rounded-full bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] text-xs sm:text-sm font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <FaSyncAlt className="animate-spin text-xs" /> Submitting…
                        </>
                      ) : (
                        <>
                          <FaPaperPlane className="text-xs" />
                          <span>
                            {selectedProblem === "Paper not found" || selectedProblem === "Request a paper"
                              ? "Send Paper Request"
                              : "Send Feedback"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* VIEW 2: STUDENT FEEDBACK & REQUEST HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#EAE2D8] dark:border-[#2E2822]">
                <div>
                  <h2 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5]">
                    My Submissions & Paper Requests
                  </h2>
                  <p className="text-xs text-[#8C7862] dark:text-[#A8957E]">
                    Track your reported issues, suggestions, and requested examination papers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadHistory}
                  className="p-2 rounded-full hover:bg-[#FAF8F5] text-[#8C7862] cursor-pointer"
                  title="Refresh history"
                >
                  <FaSyncAlt className={`text-xs ${loadingHistory ? "animate-spin" : ""}`} />
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-2 border-[#8C6239] dark:border-[#C5A059] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-[#8C7862]">Loading your records…</p>
                </div>
              ) : myFeedbacks.length === 0 && myRequests.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center text-xl mx-auto mb-3">
                    <FaCommentDots />
                  </div>
                  <h3 className="text-sm font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                    No submissions yet
                  </h3>
                  <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mb-4">
                    Have a missing paper or suggestion? Tell us in 20 seconds.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("form")}
                    className="px-5 py-2 rounded-full bg-[#4A2E1B] text-white dark:bg-[#C5A059] dark:text-[#0F0E0D] text-xs font-bold"
                  >
                    Give Feedback Now
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Paper Requests List */}
                  {myRequests.map((req) => (
                    <div
                      key={req._id}
                      onClick={() => setSelectedDetail(req)}
                      className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#8C6239] transition cursor-pointer space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📄</span>
                          <span className="font-mono text-xs font-bold text-[#4A2E1B] dark:text-[#E5C378]">
                            {req.referenceId}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                            Paper Request
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {formatStatusBadge(req.status)}
                          <span className="text-[11px] text-[#8C7862]">
                            {new Date(req.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5]">
                          {req.subject} {req.examYear}
                        </h4>
                        <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E]">
                          {req.course} • {req.academicYear}
                        </p>
                      </div>

                      {/* Paper live link if available */}
                      {req.paperId?.fileUrl && (
                        <div className="pt-2 flex items-center justify-between border-t border-[#EAE2D8] dark:border-[#2E2822]">
                          <span className="text-xs text-emerald-600 font-bold">✓ This paper is now live!</span>
                          <a
                            href={req.paperId.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <FaFilePdf /> View Paper
                          </a>
                        </div>
                      )}

                      {/* Admin Response Card */}
                      {req.adminResponse?.message && (
                        <div className="p-3 rounded-xl bg-white dark:bg-[#161412] border border-emerald-500/30 text-xs">
                          <p className="font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                            Response from PaperBridge Team:
                          </p>
                          <p className="text-[#1A1614] dark:text-[#FAF8F5]">
                            {req.adminResponse.message}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Feedback List */}
                  {myFeedbacks.map((fb) => (
                    <div
                      key={fb._id}
                      onClick={() => setSelectedDetail(fb)}
                      className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#8C6239] transition cursor-pointer space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#4A2E1B] dark:text-[#E5C378]">
                            {fb.referenceId}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] font-bold">
                            {fb.problemType || fb.feedbackType}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {formatStatusBadge(fb.status)}
                          <span className="text-[11px] text-[#8C7862]">
                            {new Date(fb.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[#4A3E31] dark:text-[#C2B3A0] line-clamp-2">
                        {fb.message}
                      </p>

                      {fb.adminResponse?.message && (
                        <div className="p-3 rounded-xl bg-white dark:bg-[#161412] border border-emerald-500/30 text-xs">
                          <p className="font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                            Response from PaperBridge Team:
                          </p>
                          <p className="text-[#1A1614] dark:text-[#FAF8F5]">
                            {fb.adminResponse.message}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* STUDENT DETAIL MODAL */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE2D8] dark:border-[#2E2822]">
              <div>
                <span className="font-mono text-sm font-bold text-[#4A2E1B] dark:text-[#E5C378]">
                  {selectedDetail.referenceId}
                </span>
                <p className="text-[11px] text-[#8C7862]">
                  Submitted {new Date(selectedDetail.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="text-[#8C7862] hover:text-[#1A1614] dark:hover:text-white p-1 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[#FAF8F5] dark:border-[#24201C]">
                <span className="text-[#8C7862]">Status:</span>
                <div>{formatStatusBadge(selectedDetail.status)}</div>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#FAF8F5] dark:border-[#24201C]">
                <span className="text-[#8C7862]">Category / Problem:</span>
                <span className="font-bold text-[#1A1614] dark:text-[#FAF8F5]">
                  {selectedDetail.subject ? `${selectedDetail.subject} (${selectedDetail.examYear || ""})` : selectedDetail.problemType || selectedDetail.feedbackType}
                </span>
              </div>
              {selectedDetail.course && (
                <div className="flex justify-between items-center py-1 border-b border-[#FAF8F5] dark:border-[#24201C]">
                  <span className="text-[#8C7862]">Course & Year:</span>
                  <span className="font-semibold text-[#1A1614] dark:text-[#FAF8F5]">
                    {selectedDetail.course} {selectedDetail.academicYear ? `• ${selectedDetail.academicYear}` : ""}
                  </span>
                </div>
              )}
              {selectedDetail.message && (
                <div className="pt-2">
                  <span className="text-[#8C7862] block mb-1">Your Message:</span>
                  <p className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] text-[#1A1614] dark:text-[#FAF8F5] whitespace-pre-wrap">
                    {selectedDetail.message}
                  </p>
                </div>
              )}

              {/* Official Response */}
              {selectedDetail.adminResponse?.message ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <p className="font-bold text-emerald-800 dark:text-emerald-300 text-xs mb-1">
                    Response from PaperBridge Team:
                  </p>
                  <p className="text-xs text-[#1A1614] dark:text-[#FAF8F5]">
                    {selectedDetail.adminResponse.message}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] text-[11px] text-[#8C7862] text-center">
                  Our team is currently evaluating this submission.
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="px-5 py-2 rounded-full bg-[#4A2E1B] text-white dark:bg-[#C5A059] dark:text-[#0F0E0D] text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
