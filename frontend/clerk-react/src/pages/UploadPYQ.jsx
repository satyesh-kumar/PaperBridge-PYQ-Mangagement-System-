import React, { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FaEye,
    FaTrash,
    FaFilePdf,
    FaUpload,
    FaLock,
    FaBook,
    FaCalendarAlt,
    FaGraduationCap,
    FaStickyNote,
    FaUniversity,
    FaInfoCircle,
    FaCheck,
    FaSpinner,
    FaLayerGroup,
} from "react-icons/fa";
import { MdDriveFolderUpload } from "react-icons/md";
import { useDropzone } from "react-dropzone";
import Navbar2 from "../components/Navbar2";
import Footer from "../components/Footer";
import confetti from "canvas-confetti";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ACADEMIC_YEARS = [
    "2026-27",
    "2025-26",
    "2024-25",
    "2023-24",
    "2022-23",
    "2021-22",
    "2020-21",
    "2019-20",
    "2018-19",
    "2017-18",
    "2016-17",
    "2015-16",
];

const EXAM_TYPES = [
    "End Semester",
    "Mid Semester",
    "Mid Term 1",
    "Mid Term 2",
    "Back Paper",
    "Internal",
    "Practical",
    "Other",
];

const UNITS = [
    "Unit 1",
    "Unit 2",
    "Unit 3",
    "Unit 4",
    "Unit 5",
    "Complete Syllabus",
    "Formula Sheet",
    "Lab Manual",
    "Other",
];

const FALLBACK_UNIVERSITIES = [
    { _id: "uni_uu", name: "United University", code: "UU", location: "Prayagraj, UP" },
    { _id: "uni_au", name: "University of Allahabad", code: "AU", location: "Prayagraj, UP" },
    { _id: "uni_aktu", name: "Dr. A.P.J. Abdul Kalam Technical University", code: "AKTU", location: "Lucknow, UP" },
    { _id: "uni_du", name: "University of Delhi", code: "DU", location: "New Delhi" },
];

const FALLBACK_COURSES = [
    { _id: "course_btech", name: "B.Tech Computer Science", code: "B.Tech CSE", numberOfSemesters: 8 },
    { _id: "course_bca", name: "Bachelor of Computer Applications", code: "BCA", numberOfSemesters: 6 },
    { _id: "course_mca", name: "Master of Computer Applications", code: "MCA", numberOfSemesters: 4 },
    { _id: "course_mba", name: "Master of Business Administration", code: "MBA", numberOfSemesters: 4 },
    { _id: "course_bba", name: "Bachelor of Business Administration", code: "BBA", numberOfSemesters: 6 },
    { _id: "course_diploma", name: "Diploma in Engineering", code: "Diploma", numberOfSemesters: 6 },
];

export default function UploadPYQ() {
    const { getToken, isSignedIn } = useAuth();
    const { user } = useUser();

    // Mode: 'pyq' | 'note'
    const [uploadType, setUploadType] = useState("pyq");

    // Dynamic Hierarchy Options
    const [universities, setUniversities] = useState(FALLBACK_UNIVERSITIES);
    const [courses, setCourses] = useState(FALLBACK_COURSES);
    const [semesters, setSemesters] = useState(
        [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ _id: `sem_${n}`, number: n, name: `Semester ${n}` }))
    );
    const [subjects, setSubjects] = useState([]);

    const [hierarchyLoading, setHierarchyLoading] = useState(false);

    // Selected Hierarchy IDs
    const [selectedUniId, setSelectedUniId] = useState(FALLBACK_UNIVERSITIES[0]._id);
    const [selectedCourseId, setSelectedCourseId] = useState(FALLBACK_COURSES[0]._id);
    const [selectedSemesterId, setSelectedSemesterId] = useState("sem_1");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");

    // PYQ Form State
    const [pyqForm, setPyqForm] = useState({
        title: "",
        subjectName: "",
        subjectCode: "",
        examType: "End Semester",
        academicYear: "2024-25",
        branch: "",
        description: "",
    });

    // Notes Form State
    const [noteForm, setNoteForm] = useState({
        title: "",
        subjectName: "",
        unit: "Complete Syllabus",
        branch: "",
        author: "",
        description: "",
    });

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [uploadedItem, setUploadedItem] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Initial Load: Universities
    useEffect(() => {
        const fetchUniversities = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/universities`, { timeout: 8000 });
                const activeUnis = res.data;
                if (Array.isArray(activeUnis) && activeUnis.length > 0) {
                    setUniversities(activeUnis);
                    setSelectedUniId(activeUnis[0]._id);
                }
            } catch {
                // Fallback already pre-populated, silent graceful degradation
            }
        };
        fetchUniversities();
    }, []);

    // When University changes -> fetch Courses
    useEffect(() => {
        if (!selectedUniId) return;

        const fetchCourses = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/courses?universityId=${selectedUniId}`, { timeout: 8000 });
                const fetchedCourses = res.data;
                if (Array.isArray(fetchedCourses) && fetchedCourses.length > 0) {
                    setCourses(fetchedCourses);
                    setSelectedCourseId(fetchedCourses[0]._id);
                    return;
                }
            } catch {
                // Ignore and use fallback
            }

            // Fallback courses
            setCourses(FALLBACK_COURSES);
            setSelectedCourseId(FALLBACK_COURSES[0]._id);
        };
        fetchCourses();
    }, [selectedUniId]);

    // When Course changes -> fetch Semesters
    useEffect(() => {
        if (!selectedCourseId) return;

        const matchedCourse = courses.find((c) => c._id === selectedCourseId);
        const count = matchedCourse?.numberOfSemesters || 8;

        const fetchSemesters = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/semesters?courseId=${selectedCourseId}`, { timeout: 8000 });
                const fetchedSemesters = res.data;
                if (Array.isArray(fetchedSemesters) && fetchedSemesters.length > 0) {
                    setSemesters(fetchedSemesters);
                    setSelectedSemesterId(fetchedSemesters[0]._id);
                    return;
                }
            } catch {
                // Fallback
            }

            // Generate fallback semesters based on configured numberOfSemesters
            const autoSems = Array.from({ length: count }, (_, i) => ({
                _id: `sem_${i + 1}`,
                number: i + 1,
                name: `Semester ${i + 1}`,
            }));
            setSemesters(autoSems);
            setSelectedSemesterId(autoSems[0]._id);
        };
        fetchSemesters();
    }, [selectedCourseId, courses]);

    // When Course or Semester changes -> fetch Subjects
    useEffect(() => {
        if (!selectedCourseId || !selectedSemesterId) {
            setSubjects([]);
            setSelectedSubjectId("");
            return;
        }

        const fetchSubjects = async () => {
            try {
                const res = await axios.get(
                    `${API_URL}/api/subjects?courseId=${selectedCourseId}&semesterId=${selectedSemesterId}`,
                    { timeout: 8000 }
                );
                const fetchedSubjects = res.data;
                if (Array.isArray(fetchedSubjects) && fetchedSubjects.length > 0) {
                    setSubjects(fetchedSubjects);
                    setSelectedSubjectId(fetchedSubjects[0]._id);
                    const s = fetchedSubjects[0];
                    if (!pyqForm.title) {
                        setPyqForm((prev) => ({
                            ...prev,
                            title: `${s.name} ${prev.examType || "End Semester"} Paper`,
                            subjectName: s.name,
                            subjectCode: s.code,
                        }));
                    }
                    return;
                }
            } catch {
                // fallback
            }
            setSubjects([]);
            setSelectedSubjectId("");
        };
        fetchSubjects();
    }, [selectedCourseId, selectedSemesterId]);

    // Confetti on success
    useEffect(() => {
        if (uploadedItem) {
            confetti({
                particleCount: 50,
                spread: 70,
                origin: { y: 0.6 },
            });
        }
    }, [uploadedItem]);

    const onDrop = (acceptedFiles) => {
        setUploadProgress(0);
        setFile(acceptedFiles[0]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { "application/pdf": [".pdf"] },
        maxFiles: 1,
        onDrop,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.error("Please select a PDF document to upload.");
            return;
        }

        const isPyq = uploadType === "pyq";
        if (isPyq && !pyqForm.title.trim()) {
            toast.error("Please enter the question paper title.");
            return;
        }
        if (!isPyq && !noteForm.title.trim()) {
            toast.error("Please enter the study note title.");
            return;
        }

        const selectedUniObj = universities.find((u) => u._id === selectedUniId);
        const selectedCourseObj = courses.find((c) => c._id === selectedCourseId);
        const selectedSemesterObj = semesters.find((s) => s._id === selectedSemesterId);
        const selectedSubjectObj = subjects.find((s) => s._id === selectedSubjectId);

        try {
            setLoading(true);
            const token = await getToken();
            const data = new FormData();

            data.append("file", file);
            data.append("universityId", selectedUniId || "");
            data.append("courseId", selectedCourseId || "");
            data.append("semesterId", selectedSemesterId || "");
            data.append("subjectId", selectedSubjectId || "");

            data.append("university", selectedUniObj ? selectedUniObj.name : "United University");
            data.append("course", selectedCourseObj ? selectedCourseObj.name : "General");
            data.append("semester", selectedSemesterObj ? String(selectedSemesterObj.number) : "1");
            data.append("subject", selectedSubjectObj ? selectedSubjectObj.name : pyqForm.subjectName || "General");
            data.append("subjectCode", selectedSubjectObj ? selectedSubjectObj.code : pyqForm.subjectCode || "");

            if (isPyq) {
                data.append("title", pyqForm.title.trim());
                data.append("examType", pyqForm.examType);
                data.append("academicYear", pyqForm.academicYear);
                data.append("year", pyqForm.academicYear.split("-")[0] || "2025");
                data.append("branch", pyqForm.branch || "");
                data.append("description", pyqForm.description || "");

                const res = await axios.post(`${API_URL}/api/upload`, data, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                    onUploadProgress: (progressEvent) => {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percent);
                    },
                });

                setUploadedItem({
                    ...res.data,
                    itemType: "Question Paper",
                });
            } else {
                data.append("title", noteForm.title.trim());
                data.append("unit", noteForm.unit);
                data.append("author", noteForm.author || (user?.fullName || "Student"));
                data.append("branch", noteForm.branch || "");
                data.append("description", noteForm.description || "");

                const res = await axios.post(`${API_URL}/api/notes/upload`, data, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                    onUploadProgress: (progressEvent) => {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percent);
                    },
                });

                setUploadedItem({
                    ...res.data,
                    itemType: "Study Notes",
                });
            }

            toast.success("Submitted for admin verification!");
            setUploadProgress(0);
            setFile(null);
        } catch (err) {
            console.error("Upload error:", err);
            toast.error(err.response?.data?.error || "Upload failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#1A1614] dark:text-[#F5F2EC] flex flex-col font-sans transition-colors duration-300">
            <Navbar2 />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
                {/* Header Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F4EFEA] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] text-[#8C6239] dark:text-[#E5C378] text-xs font-semibold mb-3">
                        <FaUpload className="text-[10px]" />
                        <span>Academic Repository Vault</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5] tracking-tight mb-2">
                        Contribute Academic Material
                    </h1>
                    <p className="text-xs sm:text-sm text-[#6B5B49] dark:text-[#C2B3A0] max-w-lg mx-auto leading-relaxed">
                        Upload previous year examination papers and study notes with dynamic university and semester categorization.
                    </p>
                </div>

                {/* Tab Selector: Question Paper vs Study Notes */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <button
                        type="button"
                        onClick={() => {
                            setUploadType("pyq");
                            setUploadedItem(null);
                        }}
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold transition shadow-xs cursor-pointer ${
                            uploadType === "pyq"
                                ? "bg-[#0D1B2A] text-white dark:bg-[#C89D5C] dark:text-[#0D1B2A]"
                                : "bg-white dark:bg-[#161412] text-[#6B5B49] dark:text-[#C2B3A0] border border-[#EAE2D8] dark:border-[#2E2822] hover:bg-[#F4EFEA]"
                        }`}
                    >
                        <FaFilePdf className="text-sm" />
                        <span>Question Paper (PYQ)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setUploadType("note");
                            setUploadedItem(null);
                        }}
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold transition shadow-xs cursor-pointer ${
                            uploadType === "note"
                                ? "bg-[#0D1B2A] text-white dark:bg-[#C89D5C] dark:text-[#0D1B2A]"
                                : "bg-white dark:bg-[#161412] text-[#6B5B49] dark:text-[#C2B3A0] border border-[#EAE2D8] dark:border-[#2E2822] hover:bg-[#F4EFEA]"
                        }`}
                    >
                        <FaStickyNote className="text-sm" />
                        <span>Study Notes & Summaries</span>
                    </button>
                </div>

                {/* Main Form Container */}
                <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 sm:p-10 shadow-sm">
                    {hierarchyLoading ? (
                        <div className="py-16 text-center">
                            <FaSpinner className="text-3xl text-[#C89D5C] animate-spin mx-auto mb-3" />
                            <p className="text-xs text-[#8C7862]">Loading academic hierarchy...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            {/* ── STEP 1: HIERARCHY SELECTION (Dependent Dropdowns) ── */}
                            <div className="p-5 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] space-y-4">
                                <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                    <FaUniversity className="text-[#C89D5C]" />
                                    <span>Academic Hierarchy Selection</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* University Dropdown */}
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B5B49] dark:text-[#C2B3A0] mb-1">
                                            1. University / Institution *
                                        </label>
                                        <select
                                            required
                                            value={selectedUniId}
                                            onChange={(e) => setSelectedUniId(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-[#161412] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                        >
                                            {universities.map((u) => (
                                                <option key={u._id} value={u._id}>
                                                    {u.name} ({u.code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Course Dropdown */}
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B5B49] dark:text-[#C2B3A0] mb-1">
                                            2. Course / Program *
                                        </label>
                                        <select
                                            required
                                            value={selectedCourseId}
                                            onChange={(e) => setSelectedCourseId(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-[#161412] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                        >
                                            {courses.length === 0 ? (
                                                <option value="">No courses available</option>
                                            ) : (
                                                courses.map((c) => (
                                                    <option key={c._id} value={c._id}>
                                                        {c.name} ({c.code})
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Semester Dropdown (Dynamic exact number of semesters) */}
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B5B49] dark:text-[#C2B3A0] mb-1">
                                            3. Semester ({semesters.length} configured) *
                                        </label>
                                        <select
                                            required
                                            value={selectedSemesterId}
                                            onChange={(e) => setSelectedSemesterId(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-[#161412] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                        >
                                            {semesters.length === 0 ? (
                                                <option value="">No semesters configured</option>
                                            ) : (
                                                semesters.map((s) => (
                                                    <option key={s._id} value={s._id}>
                                                        {s.name} (Semester {s.number})
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>

                                    {/* Subject Dropdown */}
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6B5B49] dark:text-[#C2B3A0] mb-1">
                                            4. Subject Curriculum *
                                        </label>
                                        <select
                                            value={selectedSubjectId}
                                            onChange={(e) => {
                                                setSelectedSubjectId(e.target.value);
                                                const s = subjects.find((sub) => sub._id === e.target.value);
                                                if (s) {
                                                    setPyqForm((prev) => ({
                                                        ...prev,
                                                        title: `${s.name} ${prev.examType} Paper`,
                                                        subjectName: s.name,
                                                        subjectCode: s.code,
                                                    }));
                                                    setNoteForm((prev) => ({
                                                        ...prev,
                                                        title: `${s.name} Notes`,
                                                        subjectName: s.name,
                                                    }));
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-[#161412] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                        >
                                            {subjects.length === 0 ? (
                                                <option value="">Other / General Subject</option>
                                            ) : (
                                                subjects.map((s) => (
                                                    <option key={s._id} value={s._id}>
                                                        {s.name} ({s.code})
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* ── STEP 2: DOCUMENT DETAILS ── */}
                            {uploadType === "pyq" ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                            Paper Title *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={pyqForm.title}
                                            onChange={(e) => setPyqForm({ ...pyqForm, title: e.target.value })}
                                            placeholder="e.g. Operating Systems End Semester 2024-25"
                                            className="w-full px-4 py-2.5 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                                Exam Type *
                                            </label>
                                            <select
                                                value={pyqForm.examType}
                                                onChange={(e) => setPyqForm({ ...pyqForm, examType: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                            >
                                                {EXAM_TYPES.map((t) => (
                                                    <option key={t} value={t}>
                                                        {t}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                                Academic Year / Exam Year *
                                            </label>
                                            <select
                                                required
                                                value={pyqForm.academicYear}
                                                onChange={(e) => setPyqForm({ ...pyqForm, academicYear: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                            >
                                                <option value="" disabled>Select Academic Year</option>
                                                {ACADEMIC_YEARS.map((yr) => (
                                                    <option key={yr} value={yr}>
                                                        {yr}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                            Study Notes Title *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={noteForm.title}
                                            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                                            placeholder="e.g. Data Structures & Algorithms Complete Handwritten Kit"
                                            className="w-full px-4 py-2.5 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                                Unit / Scope *
                                            </label>
                                            <select
                                                value={noteForm.unit}
                                                onChange={(e) => setNoteForm({ ...noteForm, unit: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                            >
                                                {UNITS.map((u) => (
                                                    <option key={u} value={u}>
                                                        {u}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                                Author / Contributor
                                            </label>
                                            <input
                                                type="text"
                                                value={noteForm.author}
                                                onChange={(e) => setNoteForm({ ...noteForm, author: e.target.value })}
                                                placeholder={user?.fullName || "Prof. / Student Name"}
                                                className="w-full px-4 py-2.5 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── STEP 3: PDF DROPZONE ── */}
                            <div>
                                <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-2">
                                    Attach PDF Document *
                                </label>
                                <div
                                    {...getRootProps()}
                                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 ${
                                        isDragActive
                                            ? "border-[#C89D5C] bg-[#FAF8F5] dark:bg-[#24201C]"
                                            : file
                                            ? "border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/20"
                                            : "border-[#DDD2C4] dark:border-[#2E2822] hover:border-[#C89D5C] bg-[#FAF8F5]/50 dark:bg-[#1C1916]/50"
                                    }`}
                                >
                                    <input {...getInputProps()} />
                                    {file ? (
                                        <div className="flex flex-col items-center">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mb-2">
                                                <FaFilePdf />
                                            </div>
                                            <span className="font-bold text-xs text-[#0D1B2A] dark:text-[#FAF8F5] max-w-sm truncate">
                                                {file.name}
                                            </span>
                                            <span className="text-[11px] text-[#8C7862] mt-0.5">
                                                {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                                            </span>
                                            <div className="flex items-center gap-3 mt-3">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewOpen(true);
                                                    }}
                                                    className="px-3 py-1 bg-white dark:bg-[#24201C] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs font-semibold"
                                                >
                                                    <FaEye className="inline mr-1 text-[10px]" /> Local Preview
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFile(null);
                                                    }}
                                                    className="px-3 py-1 bg-rose-500/10 text-rose-600 rounded-full text-xs font-semibold"
                                                >
                                                    <FaTrash className="inline mr-1 text-[10px]" /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <MdDriveFolderUpload className="text-4xl text-[#C89D5C] mb-2" />
                                            <p className="text-xs font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                Click or Drag & Drop PDF here
                                            </p>
                                            <p className="text-[11px] text-[#8C7862] mt-1">
                                                PDF up to 50MB with clear readable questions
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Progress bar */}
                            {uploadProgress > 0 && uploadProgress < 100 && (
                                <div className="w-full bg-[#EAE2D8] dark:bg-[#24201C] rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-[#C89D5C] h-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || !file}
                                className="w-full py-3.5 px-6 rounded-full bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <FaSpinner className="animate-spin text-sm" />
                                        <span>Uploading to Academic Repository...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaUpload className="text-xs" />
                                        <span>Submit for Admin Verification ↗</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                {/* Success Confirmation Modal */}
                {uploadedItem && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-500/30">
                                <FaCheck />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5] mb-2">
                                Submission Successful!
                            </h3>
                            <p className="text-xs text-[#6B5B49] dark:text-[#C2B3A0] leading-relaxed mb-6">
                                Your <span className="font-semibold text-[#0D1B2A] dark:text-white">{uploadedItem.itemType}</span> titled{" "}
                                <span className="italic font-serif">"{uploadedItem.title}"</span> has been submitted to the moderation queue. It will go live once verified by our admin team.
                            </p>

                            <div className="flex items-center justify-center gap-3">
                                <Link
                                    to="/dashboard"
                                    className="px-5 py-2.5 bg-[#0D1B2A] dark:bg-[#C89D5C] text-white dark:text-[#0D1B2A] rounded-full text-xs font-bold transition"
                                >
                                    View in My Library
                                </Link>
                                <button
                                    onClick={() => setUploadedItem(null)}
                                    className="px-5 py-2.5 bg-[#FAF8F5] dark:bg-[#24201C] border border-[#DDD2C4] dark:border-[#2E2822] text-[#0D1B2A] dark:text-[#FAF8F5] rounded-full text-xs font-bold"
                                >
                                    Upload Another
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Local PDF preview modal */}
                {previewOpen && file && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl shadow-xl w-full h-[85vh] max-w-4xl flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between border-b border-[#EAE2D8] dark:border-[#2E2822] px-5 py-3 bg-[#FAF8F5] dark:bg-[#1C1916]">
                                <span className="font-bold text-xs text-[#1A1614] dark:text-[#FAF8F5] truncate">{file.name}</span>
                                <button onClick={() => setPreviewOpen(false)} className="text-[#8C7862] hover:text-[#1A1614] dark:hover:text-white text-xs cursor-pointer">✕</button>
                            </div>
                            <div className="flex-1 overflow-hidden bg-[#F4EFEA] dark:bg-[#0F0E0D]">
                                <iframe src={URL.createObjectURL(file)} title="PDF Preview" className="w-full h-full border-0" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER */}
            <Footer />
        </div>
    );
}