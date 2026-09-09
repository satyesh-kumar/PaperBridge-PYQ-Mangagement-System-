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
  FaUserSecret,
  FaExclamationCircle,
  FaSyncAlt,
  FaGraduationCap,
  FaBook,
  FaTimes,
  FaRegLightbulb,
  FaBug,
  FaExternalLinkAlt,
} from "react-icons/fa";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import Navbar2 from "../components/Navbar2";
import Footer from "../components/Footer";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const FEEDBACK_TYPES = [
  "Suggest an Improvement",
  "Report a Problem",
  "Report a Bug",
  "Suggest a New Feature",
  "Website Experience",
  "Paper/PYQ Issue",
  "Search Issue",
  "Account/Login Issue",
  "Upload Issue",
  "Download Issue",
  "Performance Issue",
  "UI/Design Feedback",
  "Content Quality",
  "Teacher/Faculty Feedback",
  "General Feedback",
  "Other",
];

const RELATED_ENTITIES = [
  "PaperBridge",
  "Website",
  "Paper/PYQ",
  "Course",
  "Department",
  "Teacher",
  "Student",
  "Administrator",
  "Other",
];

const ACADEMIC_YEARS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "Postgraduate",
  "Other",
];

const SEMESTERS = [
  "1st Semester",
  "2nd Semester",
  "3rd Semester",
  "4th Semester",
  "5th Semester",
  "6th Semester",
  "7th Semester",
  "8th Semester",
  "Other",
];

const RATING_DESCRIPTIONS = {
  1: "Very Poor — Needs major fixes",
  2: "Poor — Frustrating experience",
  3: "Average — Acceptable, but needs work",
  4: "Good — Satisfying experience",
  5: "Excellent — Loved using PaperBridge!",
};

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
  const [loadingAcademic, setLoadingAcademic] = useState(false);

  // User feedback history
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Form states
  const [feedbackType, setFeedbackType] = useState("Suggest an Improvement");
  const [relatedTo, setRelatedTo] = useState("PaperBridge");
  const [teacherName, setTeacherName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [department, setDepartment] = useState("");
  const [academicYear, setAcademicYear] = useState("1st Year");
  const [semester, setSemester] = useState("1st Semester");
  const [subjectName, setSubjectName] = useState("");
  const [paperTitle, setPaperTitle] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [followUpRequested, setFollowUpRequested] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

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

  // Fetch courses on mount
  useEffect(() => {
    async function loadCourses() {
      try {
        setLoadingAcademic(true);
        const res = await axios.get(`${API_URL}/api/courses?status=active`, { timeout: 10000 });
        if (Array.isArray(res.data)) {
          setCourses(res.data);
        }
      } catch (err) {
        console.warn("Could not load dynamic courses:", err.message);
      } finally {
        setLoadingAcademic(false);
      }
    }
    loadCourses();
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
        }
      } catch (err) {
        setSubjects([]);
      }
    }
    loadSubjects();
  }, [selectedCourseId]);

  // Fetch user's feedback history
  const loadMyFeedback = async () => {
    if (!isSignedIn) return;
    try {
      setLoadingHistory(true);
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/feedback/my`, { headers, timeout: 12000 });
      if (Array.isArray(res.data)) {
        setMyFeedbacks(res.data);
      }
    } catch (err) {
      console.warn("Could not fetch feedback history:", err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadMyFeedback();
    }
  }, [activeTab, isSignedIn]);

  // Handle course selection
  const handleCourseChange = (e) => {
    const val = e.target.value;
    setSelectedCourseId(val);
    const matched = courses.find((c) => c._id === val);
    setCourseName(matched ? matched.name : val);
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim() || message.trim().length < 10) {
      toast.error("Please describe your feedback with at least 10 characters.");
      return;
    }

    if (message.length > 2500) {
      toast.error("Feedback message cannot exceed 2500 characters.");
      return;
    }

    try {
      setSubmitting(true);
      const headers = await getAuthHeaders();

      const payload = {
        feedbackType,
        relatedTo,
        teacherName: relatedTo === "Teacher" ? teacherName.trim() : "",
        studentName: relatedTo === "Student" ? studentName.trim() : "",
        courseId: selectedCourseId || null,
        course: courseName || "",
        department: department.trim(),
        academicYear,
        semester,
        subject: subjectName.trim(),
        paperTitle: relatedTo === "Paper/PYQ" ? paperTitle.trim() : "",
        rating,
        message: message.trim(),
        followUpRequested,
        anonymous,
        userName: user?.fullName || "Student",
        userEmail: user?.primaryEmailAddress?.emailAddress || "",
      };

      const res = await axios.post(`${API_URL}/api/feedback`, payload, {
        headers,
        timeout: 15000,
      });

      if (res.data?.success) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
        setSubmittedResult(res.data.feedback);
        toast.success("Feedback submitted successfully! Thank you for helping us improve.");
        // Refresh history cache in background
        loadMyFeedback();
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to submit feedback. Please try again.";
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedResult(null);
    setMessage("");
    setRating(5);
    setFollowUpRequested(false);
    setTeacherName("");
    setStudentName("");
    setPaperTitle("");
  };

  // Helper for Status Badge styling
  const renderStatusBadge = (status) => {
    const config = {
      New: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      "Under Review": "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      "In Progress": "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      Resolved: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      Rejected: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      Archived: "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700",
    };
    const style = config[status] || config["New"];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#1A1614] dark:text-[#F5F2EC] flex flex-col font-sans transition-colors duration-300">
      <Navbar2 />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Navigation Breadcrumb & Back button */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#8C7862] dark:text-[#A8957E] hover:text-[#4A2E1B] dark:hover:text-[#E5C378] transition"
          >
            <FaArrowLeft className="text-[10px]" /> Back to Dashboard
          </Link>

          {/* Sub-view Switcher Tabs */}
          <div className="flex items-center gap-1 bg-[#F4EFEA] dark:bg-[#1C1916] p-1 rounded-full border border-[#EAE2D8] dark:border-[#2E2822]">
            <button
              type="button"
              onClick={() => setActiveTab("form")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                activeTab === "form"
                  ? "bg-white dark:bg-[#24201C] text-[#4A2E1B] dark:text-[#E5C378] shadow-2xs font-bold"
                  : "text-[#8C7862] hover:text-[#2B231B] dark:hover:text-white"
              }`}
            >
              Submit Feedback
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-white dark:bg-[#24201C] text-[#4A2E1B] dark:text-[#E5C378] shadow-2xs font-bold"
                  : "text-[#8C7862] hover:text-[#2B231B] dark:hover:text-white"
              }`}
            >
              <FaHistory className="text-[10px]" /> My Feedback ({myFeedbacks.length})
            </button>
          </div>
        </div>

        {/* ── SUBMIT FEEDBACK TAB ───────────────────────────────────────────── */}
        {activeTab === "form" && (
          <div>
            {/* SUCCESS STATE */}
            {submittedResult ? (
              <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-8 sm:p-12 text-center shadow-xs">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-5 shadow-inner">
                  <FaCheckCircle />
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-2">
                  Thank you for your feedback! 🎉
                </h2>
                <p className="text-sm text-[#6B5B49] dark:text-[#C2B3A0] max-w-md mx-auto mb-6">
                  Your feedback has been successfully submitted to the PaperBridge team. We'll review your input carefully and use it to improve the platform.
                </p>

                <div className="inline-block bg-[#FAF8F5] dark:bg-[#24201C] border border-[#EAE2D8] dark:border-[#2E2822] px-6 py-3 rounded-2xl mb-8">
                  <p className="text-[11px] font-bold uppercase text-[#8C7862] dark:text-[#A8957E] tracking-wider">
                    Reference ID
                  </p>
                  <p className="text-lg font-mono font-bold text-[#4A2E1B] dark:text-[#E5C378]">
                    {submittedResult.referenceId}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] text-xs font-bold transition shadow-xs cursor-pointer min-h-[42px]"
                  >
                    View My Feedback History →
                  </button>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-white dark:bg-[#1C1916] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] text-[#4A3E31] dark:text-[#FAF8F5] text-xs font-semibold border border-[#EAE2D8] dark:border-[#2E2822] transition shadow-2xs cursor-pointer min-h-[42px]"
                  >
                    Submit Another Feedback
                  </button>
                </div>
              </div>
            ) : (
              /* FEEDBACK FORM */
              <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl shadow-xs overflow-hidden">
                {/* Header Banner */}
                <div className="border-b border-[#EAE2D8] dark:border-[#2E2822] px-6 sm:px-8 py-6 sm:py-8 bg-[#FAF8F5]/80 dark:bg-[#1C1916]/80">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#4A2E1B] dark:bg-[#C5A059] text-white dark:text-[#0F0E0D] flex items-center justify-center text-xl shrink-0 shadow-xs">
                      <FaCommentDots />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5]">
                        Help us improve PaperBridge
                      </h1>
                      <p className="text-xs sm:text-sm text-[#6B5B49] dark:text-[#C2B3A0] mt-1 leading-relaxed">
                        Your feedback helps us make PaperBridge better for students, teachers, and everyone who uses the platform.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                  {/* Field 1: Feedback Type & Related To */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#6B5B49] dark:text-[#C2B3A0] mb-2">
                        What would you like to tell us about? <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={feedbackType}
                        onChange={(e) => setFeedbackType(e.target.value)}
                        className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-2xl px-4 py-2.5 text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold focus:outline-hidden focus:border-[#8C6239] transition cursor-pointer"
                      >
                        {FEEDBACK_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#6B5B49] dark:text-[#C2B3A0] mb-2">
                        Feedback Related To <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={relatedTo}
                        onChange={(e) => setRelatedTo(e.target.value)}
                        className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-2xl px-4 py-2.5 text-xs text-[#1A1614] dark:text-[#FAF8F5] font-semibold focus:outline-hidden focus:border-[#8C6239] transition cursor-pointer"
                      >
                        {RELATED_ENTITIES.map((ent) => (
                          <option key={ent} value={ent}>
                            {ent}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Progressive Contextual Fields based on relatedTo */}
                  {relatedTo === "Teacher" && (
                    <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] space-y-2">
                      <label className="block text-xs font-bold text-[#4A2E1B] dark:text-[#E5C378]">
                        Teacher / Faculty Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Prof. Sharma / Dr. Verma"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        className="w-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-4 py-2 text-xs text-[#1A1614] dark:text-[#FAF8F5] placeholder:text-[#A8957E] focus:outline-hidden focus:border-[#8C6239]"
                      />
                    </div>
                  )}

                  {relatedTo === "Student" && (
                    <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] space-y-2">
                      <label className="block text-xs font-bold text-[#4A2E1B] dark:text-[#E5C378]">
                        Student Identifier / Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Roll number or name"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-4 py-2 text-xs text-[#1A1614] dark:text-[#FAF8F5] placeholder:text-[#A8957E] focus:outline-hidden focus:border-[#8C6239]"
                      />
                    </div>
                  )}

                  {relatedTo === "Paper/PYQ" && (
                    <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] space-y-2">
                      <label className="block text-xs font-bold text-[#4A2E1B] dark:text-[#E5C378]">
                        Paper Title or Subject
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Operating Systems End Sem 2024"
                        value={paperTitle}
                        onChange={(e) => setPaperTitle(e.target.value)}
                        className="w-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-4 py-2 text-xs text-[#1A1614] dark:text-[#FAF8F5] placeholder:text-[#A8957E] focus:outline-hidden focus:border-[#8C6239]"
                      />
                    </div>
                  )}

                  {/* Academic Context Card (Clean grouped fields) */}
                  <div className="p-5 rounded-2xl bg-[#FAF8F5]/60 dark:bg-[#1C1916]/60 border border-[#EAE2D8] dark:border-[#2E2822] space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C7862] dark:text-[#A8957E]">
                      <FaGraduationCap className="text-sm text-[#8C6239] dark:text-[#E5C378]" />
                      <span>Academic Information</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Course */}
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6B5B49] dark:text-[#C2B3A0] mb-1">
                          Course / Program
                        </label>
                        <select
                          value={selectedCourseId}
                          onChange={handleCourseChange}
                          className="w-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2 text-xs text-[#1A1614] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#8C6239]"
                        >
                          <option value="">General / Other</option>
                          {courses.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Department / Branch */}
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6B5B49] dark:text-[#C2B3A0] mb-1">
                          Branch / Department
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Computer Science"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2 text-xs text-[#1A1614] dark:text-[#FAF8F5] placeholder:text-[#A8957E] focus:outline-hidden focus:border-[#8C6239]"
                        />
                      </div>

                      {/* Academic Year */}
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6B5B49] dark:text-[#C2B3A0] mb-1">
                          Academic Year
                        </label>
                        <select
                          value={academicYear}
                          onChange={(e) => setAcademicYear(e.target.value)}
                          className="w-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2 text-xs text-[#1A1614] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#8C6239]"
                        >
                          {ACADEMIC_YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Semester */}
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6B5B49] dark:text-[#C2B3A0] mb-1">
                          Semester
                        </label>
                        <select
                          value={semester}
                          onChange={(e) => setSemester(e.target.value)}
                          className="w-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2 text-xs text-[#1A1614] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#8C6239]"
                        >
                          {SEMESTERS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Subject (Autocomplete or text) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#6B5B49] dark:text-[#C2B3A0] mb-1">
                        Subject (Optional)
                      </label>
                      {subjects.length > 0 ? (
                        <select
                          value={subjectName}
                          onChange={(e) => setSubjectName(e.target.value)}
                          className="w-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2 text-xs text-[#1A1614] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#8C6239]"
                        >
                          <option value="">Select subject or leave general</option>
                          {subjects.map((sub) => (
                            <option key={sub._id} value={sub.name}>
                              {sub.name} ({sub.code})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="e.g. Data Structures & Algorithms"
                          value={subjectName}
                          onChange={(e) => setSubjectName(e.target.value)}
                          className="w-full bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-xl px-3 py-2 text-xs text-[#1A1614] dark:text-[#FAF8F5] placeholder:text-[#A8957E] focus:outline-hidden focus:border-[#8C6239]"
                        />
                      )}
                    </div>
                  </div>

                  {/* Interactive Star Rating */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#6B5B49] dark:text-[#C2B3A0]">
                      How would you rate your experience with PaperBridge? <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-2xl">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="cursor-pointer transition-transform hover:scale-110 focus:outline-hidden"
                            title={`${star} Star`}
                          >
                            <FaStar
                              className={
                                (hoverRating || rating) >= star
                                  ? "text-amber-500 dark:text-amber-400 drop-shadow-xs"
                                  : "text-stone-300 dark:text-stone-700"
                              }
                            />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-[#8C7862] dark:text-[#A8957E]">
                        {RATING_DESCRIPTIONS[hoverRating || rating]}
                      </span>
                    </div>
                  </div>

                  {/* Feedback Message Textarea */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#6B5B49] dark:text-[#C2B3A0]">
                        Tell us what happened or what we can improve <span className="text-rose-500">*</span>
                      </label>
                      <span className={`text-[11px] font-mono ${message.length > 2500 ? "text-rose-500 font-bold" : "text-[#8C7862] dark:text-[#A8957E]"}`}>
                        {message.length} / 2500
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please describe your experience, problem, or suggestion. The more detail you provide, the easier it is for us to improve PaperBridge."
                      className="w-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] rounded-2xl p-4 text-xs text-[#1A1614] dark:text-[#FAF8F5] placeholder:text-[#A8957E] focus:outline-hidden focus:border-[#8C6239] transition leading-relaxed"
                    />
                    {message.length > 0 && message.length < 10 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <FaExclamationCircle className="text-[10px]" /> Please enter at least 10 characters.
                      </p>
                    )}
                  </div>

                  {/* User Profile Banner & Options */}
                  <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#4A2E1B] dark:bg-[#C5A059] text-white dark:text-[#0F0E0D] flex items-center justify-center font-bold text-xs">
                        {user?.firstName?.[0] || "U"}
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-[#1A1614] dark:text-[#FAF8F5]">
                          {user?.fullName || "Logged-in User"}
                        </p>
                        <p className="text-[#8C7862] dark:text-[#A8957E]">
                          {user?.primaryEmailAddress?.emailAddress || "Verified Student Account"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs">
                      {/* Follow-up radio */}
                      <label className="inline-flex items-center gap-2 cursor-pointer text-[#6B5B49] dark:text-[#C2B3A0]">
                        <input
                          type="checkbox"
                          checked={followUpRequested}
                          onChange={(e) => setFollowUpRequested(e.target.checked)}
                          className="rounded text-[#4A2E1B] focus:ring-[#8C6239] cursor-pointer"
                        />
                        <span>Would you like us to follow up?</span>
                      </label>

                      {/* Anonymous toggle */}
                      <label className="inline-flex items-center gap-2 cursor-pointer text-[#6B5B49] dark:text-[#C2B3A0]" title="Hide identity from reviewing administrators">
                        <input
                          type="checkbox"
                          checked={anonymous}
                          onChange={(e) => setAnonymous(e.target.checked)}
                          className="rounded text-[#4A2E1B] focus:ring-[#8C6239] cursor-pointer"
                        />
                        <span className="flex items-center gap-1">
                          <FaUserSecret className="text-[#8C6239] dark:text-[#E5C378]" /> Submit anonymously
                        </span>
                      </label>
                    </div>
                  </div>

                  {anonymous && (
                    <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] bg-stone-100 dark:bg-[#24201C] p-2.5 rounded-xl border border-stone-200 dark:border-[#2E2822]">
                      ℹ️ <strong>Anonymous Submission:</strong> Your name and email address will not be displayed to administrators viewing this feedback.
                    </p>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={submitting || !message.trim() || message.length < 10}
                      className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#4A2E1B] hover:bg-[#331F12] dark:bg-[#C5A059] dark:hover:bg-[#E5C378] text-white dark:text-[#0F0E0D] text-xs font-bold shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
                    >
                      <FaPaperPlane className="text-[10px]" />
                      <span>{submitting ? "Submitting..." : "Submit Feedback"}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ── MY FEEDBACK HISTORY TAB ───────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5]">
                  My Submitted Feedback
                </h2>
                <p className="text-xs text-[#8C7862] dark:text-[#A8957E]">
                  Track responses and review statuses for your suggestions and bug reports.
                </p>
              </div>
              <button
                type="button"
                onClick={loadMyFeedback}
                className="p-2 rounded-xl bg-white dark:bg-[#1C1916] text-[#4A3E31] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] hover:bg-[#FAF8F5] transition cursor-pointer shadow-2xs"
                title="Refresh history"
              >
                <FaSyncAlt className={`text-xs ${loadingHistory ? "animate-spin" : ""}`} />
              </button>
            </div>

            {loadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-28 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            ) : myFeedbacks.length === 0 ? (
              <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-10 text-center shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center text-xl mx-auto mb-3">
                  <FaRegLightbulb />
                </div>
                <h3 className="text-base font-serif font-bold text-[#1A1614] dark:text-[#FAF8F5] mb-1">
                  No feedback yet
                </h3>
                <p className="text-xs text-[#8C7862] dark:text-[#A8957E] max-w-sm mx-auto mb-5">
                  Your submitted feedback will appear here once you share your thoughts with the team.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("form")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4A2E1B] text-white dark:bg-[#C5A059] dark:text-[#0F0E0D] text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Share Feedback Now →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myFeedbacks.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => setSelectedDetail(item)}
                    className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#8C6239] dark:hover:border-[#C5A059] rounded-2xl p-5 shadow-2xs transition cursor-pointer group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#4A2E1B] dark:text-[#E5C378]">
                          {item.referenceId}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] font-semibold">
                          {item.feedbackType}
                        </span>
                        {item.rating && (
                          <span className="text-xs text-amber-500 font-semibold flex items-center gap-0.5">
                            ★ {item.rating}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {renderStatusBadge(item.status)}
                        <span className="text-[11px] text-[#8C7862] dark:text-[#A8957E]">
                          {new Date(item.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#6B5B49] dark:text-[#C2B3A0] line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    {item.adminResponse?.message && (
                      <div className="mt-3 p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs">
                        <p className="font-bold text-[#4A2E1B] dark:text-[#E5C378] mb-0.5 flex items-center gap-1.5">
                          <FaCheckCircle className="text-emerald-500" /> Response from PaperBridge Team:
                        </p>
                        <p className="text-[#1A1614] dark:text-[#FAF8F5] line-clamp-2">
                          {item.adminResponse.message}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── DETAIL MODAL ────────────────────────────────────────────────────── */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE2D8] dark:border-[#2E2822] pb-3">
              <div>
                <span className="font-mono text-sm font-bold text-[#4A2E1B] dark:text-[#E5C378]">
                  {selectedDetail.referenceId}
                </span>
                <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E]">
                  Submitted on {new Date(selectedDetail.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="p-2 rounded-full hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#8C7862] transition cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#8C7862] dark:text-[#A8957E] block text-[10px] uppercase font-bold">Category</span>
                <span className="font-semibold text-[#1A1614] dark:text-[#FAF8F5]">{selectedDetail.feedbackType}</span>
              </div>
              <div>
                <span className="text-[#8C7862] dark:text-[#A8957E] block text-[10px] uppercase font-bold">Status</span>
                {renderStatusBadge(selectedDetail.status)}
              </div>
              <div>
                <span className="text-[#8C7862] dark:text-[#A8957E] block text-[10px] uppercase font-bold">Related To</span>
                <span className="font-semibold text-[#1A1614] dark:text-[#FAF8F5]">{selectedDetail.relatedTo || "Website"}</span>
              </div>
              <div>
                <span className="text-[#8C7862] dark:text-[#A8957E] block text-[10px] uppercase font-bold">Rating</span>
                <span className="text-amber-500 font-bold">★ {selectedDetail.rating} / 5</span>
              </div>
            </div>

            {selectedDetail.course && (
              <div className="text-xs bg-[#FAF8F5] dark:bg-[#1C1916] p-3 rounded-xl border border-[#EAE2D8] dark:border-[#2E2822]">
                <p className="text-[10px] font-bold uppercase text-[#8C7862] dark:text-[#A8957E]">Academic Context</p>
                <p className="font-semibold text-[#1A1614] dark:text-[#FAF8F5]">
                  {selectedDetail.course} {selectedDetail.department ? `(${selectedDetail.department})` : ""}
                </p>
                {selectedDetail.academicYear && (
                  <p className="text-[#8C7862] dark:text-[#A8957E]">
                    {selectedDetail.academicYear} {selectedDetail.semester ? `• ${selectedDetail.semester}` : ""}
                  </p>
                )}
              </div>
            )}

            <div>
              <span className="text-[#8C7862] dark:text-[#A8957E] block text-[10px] uppercase font-bold mb-1">
                Your Feedback
              </span>
              <div className="bg-[#FAF8F5] dark:bg-[#1C1916] p-3 rounded-xl text-xs leading-relaxed text-[#1A1614] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] whitespace-pre-wrap">
                {selectedDetail.message}
              </div>
            </div>

            {/* Official Admin Response */}
            {selectedDetail.adminResponse?.message ? (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-2xl text-xs space-y-1">
                <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <FaCheckCircle /> Response from PaperBridge Team
                  </span>
                  {selectedDetail.adminResponse.respondedAt && (
                    <span className="text-[10px] font-normal opacity-80">
                      {new Date(selectedDetail.adminResponse.respondedAt).toLocaleDateString("en-IN")}
                    </span>
                  )}
                </div>
                <p className="text-emerald-950 dark:text-emerald-100 leading-relaxed pt-1">
                  {selectedDetail.adminResponse.message}
                </p>
              </div>
            ) : (
              <div className="text-center py-2 text-xs text-[#8C7862] dark:text-[#A8957E] italic">
                Our team is currently reviewing your submission.
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="px-5 py-2 rounded-full bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-xs font-semibold text-[#1A1614] dark:text-[#FAF8F5] hover:bg-[#F4EFEA] transition cursor-pointer"
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
