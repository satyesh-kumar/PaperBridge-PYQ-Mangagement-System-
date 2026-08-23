import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/react";
import {
    FaShieldAlt,
    FaGraduationCap,
    FaFilePdf,
    FaStickyNote,
    FaUsers,
    FaEye,
    FaTrash,
    FaEdit,
    FaSearch,
    FaTimes,
    FaCheck,
    FaFileCsv,
    FaSpinner,
    FaPlus,
    FaSyncAlt,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
    FaExclamationTriangle,
    FaExternalLinkAlt,
    FaToggleOn,
    FaToggleOff,
    FaFilter,
    FaArrowLeft,
    FaExpand,
    FaCompress,
    FaUserCheck,
    FaDownload,
} from "react-icons/fa";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import Navbar2 from "../components/Navbar2";
import Footer from "../components/Footer";
import PDFViewer from "../components/PDFViewer";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { downloadPDF } from "../utils/downloadHelper";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const FALLBACK_COURSES = [
    { _id: "course_btech", name: "B.Tech Computer Science and Engineering", code: "BTECH-CSE", numberOfSemesters: 8, degreeType: "Undergraduate", duration: "4 Years", status: "active" },
    { _id: "course_bca", name: "Bachelor of Computer Applications", code: "BCA", numberOfSemesters: 6, degreeType: "Undergraduate", duration: "3 Years", status: "active" },
    { _id: "course_mca", name: "Master of Computer Applications", code: "MCA", numberOfSemesters: 4, degreeType: "Postgraduate", duration: "2 Years", status: "active" },
    { _id: "course_mba", name: "Master of Business Administration", code: "MBA", numberOfSemesters: 4, degreeType: "Postgraduate", duration: "2 Years", status: "active" },
    { _id: "course_bba", name: "Bachelor of Business Administration", code: "BBA", numberOfSemesters: 6, degreeType: "Undergraduate", duration: "3 Years", status: "active" },
    { _id: "course_diploma", name: "Diploma in Engineering", code: "DIPLOMA", numberOfSemesters: 6, degreeType: "Diploma", duration: "3 Years", status: "active" },
];

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

const DEGREE_TYPES = [
    "Undergraduate",
    "Postgraduate",
    "Diploma",
    "Doctorate",
    "Certificate",
    "Other",
];

export default function AdminPanel() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const { userEmail } = useIsAdmin();
    const navigate = useNavigate();

    // ── PRIMARY DATA STATE ──────────────────────────────────────────────────
    const [stats, setStats] = useState(null);
    const [courses, setCourses] = useState(FALLBACK_COURSES);
    const [papers, setPapers] = useState([]);
    const [notes, setNotes] = useState([]);
    const [users, setUsers] = useState([]);

    // Layout mode
    const [isFullWidth, setIsFullWidth] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleBrowserFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.().catch(() => {});
            setIsFullscreen(false);
        }
    };

    // Loading states
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Active Navigation Tab: 'overview' | 'courses' | 'moderation' | 'papers' | 'notes' | 'users'
    const [activeTab, setActiveTab] = useState("overview");

    // Moderation sub-filter: 'all' | 'pyq' | 'note'
    const [moderationFilter, setModerationFilter] = useState("all");

    // Search & Filter state
    const [search, setSearch] = useState("");
    const [selectedCourseFilter, setSelectedCourseFilter] = useState("all");
    const [selectedSemFilter, setSelectedSemFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    // Selection for bulk moderation
    const [selectedIds, setSelectedIds] = useState(new Set());

    // PDF Preview
    const [previewPdf, setPreviewPdf] = useState(null);

    // ── MODAL STATES ────────────────────────────────────────────────────────
    // Course Modal
    const [courseModalOpen, setCourseModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [courseForm, setCourseForm] = useState({
        name: "",
        code: "",
        degreeType: "Undergraduate",
        duration: "4 Years",
        numberOfSemesters: 8,
        description: "",
        status: "active",
    });

    // Edit PYQ Modal
    const [editingPaper, setEditingPaper] = useState(null);
    const [editPaperModalOpen, setEditPaperModalOpen] = useState(false);
    const [paperEditSemesters, setPaperEditSemesters] = useState([]);
    const [editPaperForm, setEditPaperForm] = useState({
        title: "",
        courseId: "",
        course: "",
        semester: 1,
        examType: "End Semester",
        academicYear: "2024-25",
        status: "approved",
    });

    // Edit Note Modal
    const [editingNote, setEditingNote] = useState(null);
    const [editNoteModalOpen, setEditNoteModalOpen] = useState(false);
    const [editNoteForm, setEditNoteForm] = useState({
        title: "",
        courseId: "",
        course: "",
        semester: 1,
        unit: "Unit 1",
        author: "",
        status: "approved",
    });

    // Reject Reason Modal
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");

    // Cascade Delete Safety Modal
    const [cascadeWarning, setCascadeWarning] = useState(null);

    // ── AUTH HEADERS HELPER ──────────────────────────────────────────────────
    const getAuthHeaders = useCallback(async () => {
        try {
            const token = await getToken();
            const email = (
                user?.primaryEmailAddress?.emailAddress ||
                user?.emailAddresses?.[0]?.emailAddress ||
                userEmail ||
                ""
            ).toLowerCase().trim();

            return {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(email ? { "x-user-email": email } : {}),
            };
        } catch {
            const email = userEmail || "";
            return email ? { "x-user-email": email } : {};
        }
    }, [getToken, user, userEmail]);

    // ── DATA FETCHING ───────────────────────────────────────────────────────
    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true);
            const headers = await getAuthHeaders();

            const [
                statsSettled,
                courseSettled,
                paperSettled,
                noteSettled,
                userSettled,
            ] = await Promise.allSettled([
                axios.get(`${API_URL}/api/admin/stats`, { headers, timeout: 30000 }),
                axios.get(`${API_URL}/api/courses?status=all`, { headers, timeout: 30000 }).catch(() => axios.get(`${API_URL}/api/courses`, { timeout: 30000 })),
                axios.get(`${API_URL}/api/admin/pyqs`, { headers, timeout: 30000 }).catch(() => axios.get(`${API_URL}/api/pyqs`, { timeout: 30000 })),
                axios.get(`${API_URL}/api/admin/notes`, { headers, timeout: 30000 }).catch(() => axios.get(`${API_URL}/api/notes`, { timeout: 30000 })),
                axios.get(`${API_URL}/api/admin/users`, { headers, timeout: 30000 }).catch(() => ({ data: [] })),
            ]);

            const loadedCourses = (courseSettled.status === "fulfilled" && Array.isArray(courseSettled.value?.data) && courseSettled.value.data.length > 0)
                ? courseSettled.value.data
                : FALLBACK_COURSES;

            const loadedPapers = (paperSettled.status === "fulfilled" && Array.isArray(paperSettled.value?.data))
                ? paperSettled.value.data
                : [];

            const loadedNotes = (noteSettled.status === "fulfilled" && Array.isArray(noteSettled.value?.data))
                ? noteSettled.value.data
                : [];

            const loadedUsers = (userSettled.status === "fulfilled" && Array.isArray(userSettled.value?.data))
                ? userSettled.value.data
                : [];

            setCourses(loadedCourses);
            setPapers(loadedPapers);
            setNotes(loadedNotes);
            setUsers(loadedUsers);

            if (statsSettled.status === "fulfilled" && statsSettled.value?.data) {
                setStats(statsSettled.value.data);
            } else {
                // Calculated live metrics fallback
                const approvedP = loadedPapers.filter((p) => p.status === "approved" || !p.status).length;
                const pendingP = loadedPapers.filter((p) => p.status === "pending").length;
                const approvedN = loadedNotes.filter((n) => n.status === "approved" || !n.status).length;
                const pendingN = loadedNotes.filter((n) => n.status === "pending").length;

                setStats({
                    totalCourses: loadedCourses.length,
                    activeCourses: loadedCourses.filter((c) => c.status === "active").length,
                    totalPapers: loadedPapers.length,
                    pendingCount: pendingP,
                    approvedCount: approvedP,
                    totalNotes: loadedNotes.length,
                    pendingNotesCount: pendingN,
                    approvedNotesCount: approvedN,
                    totalPendingAll: pendingP + pendingN,
                    totalUsers: loadedUsers.length,
                });
            }
        } catch (err) {
            console.error("Fetch all admin data error:", err);
            toast.error("Failed to refresh repository data");
        } finally {
            setLoading(false);
        }
    }, [getAuthHeaders]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // ── MODERATION ACTIONS ──────────────────────────────────────────────────
    const handleStatusChange = async (type, id, newStatus, reason = "") => {
        try {
            setActionLoading(true);
            const headers = await getAuthHeaders();
            const endpoint = type === "pyq"
                ? `${API_URL}/api/admin/pyqs/${id}/status`
                : `${API_URL}/api/admin/notes/${id}/status`;

            await axios.patch(endpoint, { status: newStatus, rejectionReason: reason }, { headers });

            if (newStatus === "approved") {
                toast.success(`${type === "pyq" ? "Question Paper" : "Study Note"} Approved! 🎉`);
                confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
            } else if (newStatus === "rejected") {
                toast.error(`${type === "pyq" ? "Question Paper" : "Study Note"} Rejected`);
            } else {
                toast.success("Moved back to pending moderation");
            }

            setRejectTarget(null);
            setRejectionReason("");
            fetchAllData();
        } catch (err) {
            console.error("Status update error:", err);
            toast.error(err.response?.data?.error || "Failed to update status");
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkStatusChange = async (newStatus) => {
        if (selectedIds.size === 0) {
            toast.error("No items selected");
            return;
        }

        try {
            setActionLoading(true);
            const headers = await getAuthHeaders();
            const pyqIds = [];
            const noteIds = [];

            selectedIds.forEach((combinedId) => {
                if (combinedId.startsWith("pyq_")) pyqIds.push(combinedId.replace("pyq_", ""));
                if (combinedId.startsWith("note_")) noteIds.push(combinedId.replace("note_", ""));
            });

            const promises = [];
            if (pyqIds.length > 0) {
                promises.push(
                    axios.post(`${API_URL}/api/admin/pyqs/bulk-status`, { ids: pyqIds, status: newStatus }, { headers })
                );
            }
            if (noteIds.length > 0) {
                promises.push(
                    axios.post(`${API_URL}/api/admin/notes/bulk-status`, { ids: noteIds, status: newStatus }, { headers })
                );
            }

            await Promise.all(promises);

            toast.success(`Updated ${selectedIds.size} materials to '${newStatus}'!`);
            setSelectedIds(new Set());
            fetchAllData();
        } catch (err) {
            toast.error("Bulk update failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected materials?`)) return;

        try {
            setActionLoading(true);
            const headers = await getAuthHeaders();
            const pyqIds = [];
            const noteIds = [];

            selectedIds.forEach((combinedId) => {
                if (combinedId.startsWith("pyq_")) pyqIds.push(combinedId.replace("pyq_", ""));
                if (combinedId.startsWith("note_")) noteIds.push(combinedId.replace("note_", ""));
            });

            const promises = [];
            if (pyqIds.length > 0) {
                promises.push(axios.post(`${API_URL}/api/admin/pyqs/bulk-delete`, { ids: pyqIds }, { headers }));
            }
            if (noteIds.length > 0) {
                promises.push(axios.post(`${API_URL}/api/admin/notes/bulk-delete`, { ids: noteIds }, { headers }));
            }

            await Promise.all(promises);
            toast.success(`Permanently removed ${selectedIds.size} items.`);
            setSelectedIds(new Set());
            fetchAllData();
        } catch {
            toast.error("Failed to delete selected items");
        } finally {
            setActionLoading(false);
        }
    };

    // ── COURSE CRUD ─────────────────────────────────────────────────────────
    const handleOpenAddCourse = () => {
        setEditingCourse(null);
        setCourseForm({
            name: "",
            code: "",
            degreeType: "Undergraduate",
            duration: "4 Years",
            numberOfSemesters: 8,
            description: "",
            status: "active",
        });
        setCourseModalOpen(true);
    };

    const handleOpenEditCourse = (c) => {
        setEditingCourse(c);
        setCourseForm({
            name: c.name || "",
            code: c.code || "",
            degreeType: c.degreeType || "Undergraduate",
            duration: c.duration || "4 Years",
            numberOfSemesters: c.numberOfSemesters || 8,
            description: c.description || "",
            status: c.status || "active",
        });
        setCourseModalOpen(true);
    };

    const handleSaveCourse = async (e) => {
        e.preventDefault();
        if (!courseForm.name.trim() || !courseForm.code.trim()) {
            toast.error("Course name and course code are required.");
            return;
        }

        try {
            setActionLoading(true);
            const headers = await getAuthHeaders();

            if (editingCourse) {
                await axios.put(`${API_URL}/api/courses/${editingCourse._id}`, courseForm, { headers });
                toast.success(`Course '${courseForm.name}' updated!`);
            } else {
                await axios.post(`${API_URL}/api/courses`, courseForm, { headers });
                toast.success(`Course '${courseForm.name}' created with ${courseForm.numberOfSemesters} semesters!`);
            }
            setCourseModalOpen(false);
            fetchAllData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save course. Check authentication.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteCourse = async (c, force = false) => {
        try {
            setActionLoading(true);
            const headers = await getAuthHeaders();

            const url = `${API_URL}/api/courses/${c._id}${force ? "?force=true" : ""}`;
            await axios.delete(url, { headers, data: { force } });

            toast.success(`Course '${c.name}' deleted.`);
            setCascadeWarning(null);
            fetchAllData();
        } catch (err) {
            if (err.response?.status === 409 && err.response?.data?.error === "CASCADE_WARNING") {
                setCascadeWarning({
                    type: "course",
                    target: c,
                    ...err.response.data,
                });
            } else {
                toast.error(err.response?.data?.error || "Failed to delete course");
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleCourseStatus = async (c) => {
        try {
            const headers = await getAuthHeaders();
            const newStatus = c.status === "active" ? "inactive" : "active";
            await axios.patch(`${API_URL}/api/courses/${c._id}/status`, { status: newStatus }, { headers });
            toast.success(`Course status set to ${newStatus}`);
            fetchAllData();
        } catch {
            toast.error("Failed to update status");
        }
    };

    // ── EDIT PAPERS & NOTES ─────────────────────────────────────────────────
    const handleOpenEditPaper = (paper) => {
        setEditingPaper(paper);
        setEditPaperForm({
            title: paper.title || "",
            courseId: paper.courseId?._id || paper.courseId || "",
            course: paper.course || "",
            semester: paper.semester || 1,
            examType: paper.examType || "End Semester",
            academicYear: paper.academicYear || "2024-25",
            status: paper.status || "approved",
        });
        setEditPaperModalOpen(true);
    };

    const handleSavePaper = async (e) => {
        e.preventDefault();
        if (!editingPaper) return;
        try {
            setActionLoading(true);
            const headers = await getAuthHeaders();

            const payload = {
                ...editPaperForm,
                semester: Number(editPaperForm.semester) || 1,
            };

            await axios.put(`${API_URL}/api/pyqs/${editingPaper._id}`, payload, { headers });
            toast.success("Question paper updated successfully!");
            setEditPaperModalOpen(false);
            setEditingPaper(null);
            fetchAllData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update question paper");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeletePaper = async (paperId) => {
        if (!window.confirm("Are you sure you want to permanently delete this paper?")) return;
        try {
            const headers = await getAuthHeaders();
            await axios.delete(`${API_URL}/api/pyqs/${paperId}`, { headers });
            toast.success("Paper deleted");
            fetchAllData();
        } catch {
            toast.error("Failed to delete paper");
        }
    };

    const handleOpenEditNote = (note) => {
        setEditingNote(note);
        setEditNoteForm({
            title: note.title || "",
            courseId: note.courseId?._id || note.courseId || "",
            course: note.course || "",
            semester: note.semester || 1,
            unit: note.unit || "Unit 1",
            author: note.author || "",
            status: note.status || "approved",
        });
        setEditNoteModalOpen(true);
    };

    const handleSaveNote = async (e) => {
        e.preventDefault();
        if (!editingNote) return;
        try {
            setActionLoading(true);
            const headers = await getAuthHeaders();

            const payload = {
                ...editNoteForm,
                semester: Number(editNoteForm.semester) || 1,
            };

            await axios.put(`${API_URL}/api/notes/${editingNote._id}`, payload, { headers });
            toast.success("Study note updated successfully!");
            setEditNoteModalOpen(false);
            setEditingNote(null);
            fetchAllData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update study note");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!window.confirm("Are you sure you want to permanently delete this study note?")) return;
        try {
            const headers = await getAuthHeaders();
            await axios.delete(`${API_URL}/api/notes/${noteId}`, { headers });
            toast.success("Study note deleted");
            fetchAllData();
        } catch {
            toast.error("Failed to delete note");
        }
    };

    // ── CSV EXPORT ──────────────────────────────────────────────────────────
    const handleExportCSV = () => {
        let csvHeaders = ["Type", "ID", "Title", "Course", "Semester", "Exam/Unit", "Status", "UploadedAt"];
        let rows = [
            ...papers.map((p) => [
                "Question Paper",
                p._id,
                `"${(p.title || "").replace(/"/g, '""')}"`,
                `"${p.courseId?.name || p.course || ""}"`,
                p.semester || "",
                p.examType || "End Semester",
                p.status || "approved",
                p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",
            ]),
            ...notes.map((n) => [
                "Study Note",
                n._id,
                `"${(n.title || "").replace(/"/g, '""')}"`,
                `"${n.courseId?.name || n.course || ""}"`,
                n.semester || "",
                n.unit || "Unit 1",
                n.status || "approved",
                n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "",
            ]),
        ];

        let csvContent = "data:text/csv;charset=utf-8," + [csvHeaders.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `paperbridge_materials_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Academic repository exported to CSV!");
    };

    // ── FILTERED DATA ───────────────────────────────────────────────────────
    const pendingPapers = useMemo(() => papers.filter((p) => p.status === "pending"), [papers]);
    const pendingNotes = useMemo(() => notes.filter((n) => n.status === "pending"), [notes]);
    const totalPendingCount = pendingPapers.length + pendingNotes.length;

    // Filtered Courses
    const filteredCourses = useMemo(() => {
        return courses.filter((c) => {
            if (statusFilter !== "all" && c.status !== statusFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                return c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q);
            }
            return true;
        });
    }, [courses, statusFilter, search]);

    // Filtered Papers
    const filteredPapers = useMemo(() => {
        return papers.filter((p) => {
            const cId = p.courseId?._id || p.courseId;
            if (selectedCourseFilter !== "all" && cId !== selectedCourseFilter && p.course !== selectedCourseFilter) return false;
            if (selectedSemFilter !== "all" && String(p.semester) !== String(selectedSemFilter)) return false;
            if (statusFilter !== "all" && p.status !== statusFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                return (
                    p.title?.toLowerCase().includes(q) ||
                    p.course?.toLowerCase().includes(q) ||
                    p.academicYear?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [papers, selectedCourseFilter, selectedSemFilter, statusFilter, search]);

    // Filtered Notes
    const filteredNotes = useMemo(() => {
        return notes.filter((n) => {
            const cId = n.courseId?._id || n.courseId;
            if (selectedCourseFilter !== "all" && cId !== selectedCourseFilter && n.course !== selectedCourseFilter) return false;
            if (selectedSemFilter !== "all" && String(n.semester) !== String(selectedSemFilter)) return false;
            if (statusFilter !== "all" && n.status !== statusFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                return (
                    n.title?.toLowerCase().includes(q) ||
                    n.course?.toLowerCase().includes(q) ||
                    n.unit?.toLowerCase().includes(q) ||
                    n.author?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [notes, selectedCourseFilter, selectedSemFilter, statusFilter, search]);

    // Filtered Users
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            if (search) {
                const q = search.toLowerCase();
                return (
                    u.name?.toLowerCase().includes(q) ||
                    u.email?.toLowerCase().includes(q) ||
                    u.clerkId?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [users, search]);

    // Navigation items
    const navTabs = [
        { id: "overview", label: "Overview", icon: <FaShieldAlt /> },
        { id: "courses", label: "Courses & Programs", icon: <FaGraduationCap />, count: courses.length },
        { id: "moderation", label: "Moderation Queue", icon: <FaClock />, count: totalPendingCount, alert: totalPendingCount > 0 },
        { id: "papers", label: "Question Papers", icon: <FaFilePdf />, count: papers.length },
        { id: "notes", label: "Study Notes", icon: <FaStickyNote />, count: notes.length },
        { id: "users", label: "Registered Users", icon: <FaUsers />, count: users.length },
    ];

    return (
        <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#1A1614] dark:text-[#F5F2EC] flex flex-col font-sans transition-colors duration-300">
            {/* TOP ADMIN HEADER BAR */}
            <div className="bg-white dark:bg-[#161412] border-b border-[#EAE2D8] dark:border-[#2E2822] px-4 sm:px-6 lg:px-8 py-3.5 sticky top-0 z-30 shadow-2xs">
                <div className={`${isFullWidth ? "w-full" : "max-w-7xl mx-auto"} flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300`}>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/"
                            className="p-2.5 rounded-2xl bg-[#FAF8F5] dark:bg-[#24201C] hover:bg-[#F4EFEA] dark:hover:bg-[#2E2822] text-[#4A3E31] dark:text-[#FAF8F5] border border-[#EAE2D8] dark:border-[#2E2822] flex items-center justify-center transition cursor-pointer shadow-2xs mr-0.5 group"
                            title="Back to Website"
                        >
                            <FaArrowLeft className="text-xs group-hover:-translate-x-0.5 transition-transform" />
                        </Link>

                        <div className="w-10 h-10 rounded-2xl bg-[#0D1B2A] dark:bg-[#C89D5C] text-[#FAF8F5] dark:text-[#0D1B2A] flex items-center justify-center text-base font-bold shadow-xs">
                            <FaShieldAlt />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5] tracking-tight">
                                    PaperBridge Admin Console
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] text-[10px] font-bold uppercase border border-[#DDD2C4] dark:border-[#2E2822]">
                                    Live Management
                                </span>
                            </div>
                            <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E]">
                                Administrator: <span className="font-semibold text-[#0D1B2A] dark:text-[#FAF8F5]">{userEmail || "Authorized"}</span>
                            </p>
                        </div>
                    </div>

                    {/* Quick Global Actions */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <button
                            onClick={() => {
                                setIsFullWidth((prev) => !prev);
                                toggleBrowserFullscreen();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white dark:bg-[#1C1916] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] text-[#4A3E31] dark:text-[#FAF8F5] text-xs font-semibold rounded-full border border-[#EAE2D8] dark:border-[#2E2822] transition cursor-pointer shadow-2xs min-h-[36px]"
                            title={isFullWidth ? "Standard Layout" : "Full Screen View"}
                        >
                            {isFullWidth ? <FaCompress className="text-[#C89D5C] text-xs" /> : <FaExpand className="text-[#C89D5C] text-xs" />}
                            <span className="hidden sm:inline">{isFullWidth ? "Standard" : "Full Screen"}</span>
                        </button>

                        <button
                            onClick={handleExportCSV}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white dark:bg-[#1C1916] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] text-[#4A3E31] dark:text-[#FAF8F5] text-xs font-semibold rounded-full border border-[#EAE2D8] dark:border-[#2E2822] transition cursor-pointer shadow-2xs min-h-[36px]"
                            title="Export CSV"
                        >
                            <FaFileCsv className="text-[#C89D5C]" />
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>

                        <button
                            onClick={() => {
                                fetchAllData();
                                toast.success("Repository refreshed!");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white dark:bg-[#1C1916] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] text-[#4A3E31] dark:text-[#FAF8F5] text-xs font-semibold rounded-full border border-[#EAE2D8] dark:border-[#2E2822] transition cursor-pointer shadow-2xs min-h-[36px]"
                            title="Refresh Data"
                        >
                            <FaSyncAlt className="text-[#C89D5C]" />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>

                        <Link
                            to="/upload"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold rounded-full shadow-xs transition min-h-[36px]"
                        >
                            <FaPlus className="text-[10px]" />
                            <span>Upload</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* NAVIGATION TABS SCROLLER */}
            <div className="bg-[#FAF8F5] dark:bg-[#0F0E0D] border-b border-[#EAE2D8] dark:border-[#24201C] sticky top-[68px] z-20 overflow-x-auto no-scrollbar">
                <div className={`${isFullWidth ? "w-full px-4 sm:px-6 lg:px-8" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"} flex items-center gap-2 py-2.5 transition-all duration-300`}>
                    {navTabs.map((tab) => {
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition shrink-0 cursor-pointer ${
                                    active
                                        ? "bg-[#0D1B2A] text-white dark:bg-[#C89D5C] dark:text-[#0D1B2A] shadow-sm font-bold"
                                        : "bg-white dark:bg-[#161412] text-[#6B5B49] dark:text-[#C2B3A0] border border-[#EAE2D8] dark:border-[#2E2822] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C]"
                                }`}
                            >
                                <span className="text-sm">{tab.icon}</span>
                                <span>{tab.label}</span>
                                {tab.count !== undefined && (
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            tab.alert
                                                ? "bg-amber-500 text-white animate-pulse"
                                                : active
                                                ? "bg-white/20 text-white dark:text-[#0D1B2A]"
                                                : "bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378]"
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* MAIN CONTAINER */}
            <main className={`${isFullWidth ? "w-full px-4 sm:px-6 lg:px-8" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"} py-8 w-full flex-1 transition-all duration-300`}>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <FaSpinner className="text-4xl text-[#C89D5C] animate-spin mb-4" />
                        <p className="text-sm font-semibold text-[#8C7862] dark:text-[#A8957E]">
                            Loading academic repository...
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ═══════════════════════════════════════════════════════
                            1. OVERVIEW TAB
                        ═══════════════════════════════════════════════════════ */}
                        {activeTab === "overview" && (
                            <div className="space-y-8">
                                {/* Top 4 Stat Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div
                                        onClick={() => setActiveTab("courses")}
                                        className="cursor-pointer bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#C89D5C] rounded-3xl p-5 shadow-xs transition"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider">
                                                Courses & Programs
                                            </span>
                                            <FaGraduationCap className="text-[#C89D5C]" />
                                        </div>
                                        <div className="text-3xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            {stats?.totalCourses || courses.length}
                                        </div>
                                        <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] mt-0.5">
                                            {stats?.activeCourses || courses.filter((c) => c.status === "active").length} active degree tracks
                                        </p>
                                    </div>

                                    <div
                                        onClick={() => setActiveTab("moderation")}
                                        className="cursor-pointer bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] hover:border-amber-500 rounded-3xl p-5 shadow-xs transition relative overflow-hidden"
                                    >
                                        {totalPendingCount > 0 && (
                                            <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-bl-full" />
                                        )}
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider">
                                                Pending Moderation
                                            </span>
                                            <FaClock className={totalPendingCount > 0 ? "text-amber-500 animate-pulse" : "text-[#C89D5C]"} />
                                        </div>
                                        <div className="text-3xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            {totalPendingCount}
                                        </div>
                                        <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] mt-0.5">
                                            {pendingPapers.length} papers • {pendingNotes.length} notes awaiting review
                                        </p>
                                    </div>

                                    <div
                                        onClick={() => setActiveTab("papers")}
                                        className="cursor-pointer bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#C89D5C] rounded-3xl p-5 shadow-xs transition"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider">
                                                Academic Materials
                                            </span>
                                            <FaFilePdf className="text-[#C89D5C]" />
                                        </div>
                                        <div className="text-3xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            {papers.length + notes.length}
                                        </div>
                                        <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] mt-0.5">
                                            {papers.length} PYQs • {notes.length} study notes
                                        </p>
                                    </div>

                                    <div
                                        onClick={() => setActiveTab("users")}
                                        className="cursor-pointer bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#C89D5C] rounded-3xl p-5 shadow-xs transition"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider">
                                                Registered Users
                                            </span>
                                            <FaUsers className="text-[#C89D5C]" />
                                        </div>
                                        <div className="text-3xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            {stats?.totalUsers || users.length}
                                        </div>
                                        <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] mt-0.5">
                                            Active platform accounts
                                        </p>
                                    </div>
                                </div>

                                {/* Quick Moderation Alert Banner if pending items exist */}
                                {totalPendingCount > 0 && (
                                    <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0">
                                                <FaExclamationTriangle />
                                            </div>
                                            <div>
                                                <h4 className="font-serif font-bold text-sm text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                    {totalPendingCount} Student Uploads Awaiting Approval
                                                </h4>
                                                <p className="text-xs text-[#8C7862] dark:text-[#A8957E]">
                                                    Verify authenticity before publishing to the public repository.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setActiveTab("moderation")}
                                            className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
                                        >
                                            Open Moderation Queue →
                                        </button>
                                    </div>
                                )}

                                {/* Courses Quick Table */}
                                <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 shadow-xs">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="font-serif font-bold text-base text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                Academic Programs
                                            </h3>
                                            <p className="text-xs text-[#8C7862] dark:text-[#A8957E]">
                                                Configured courses and semester structures
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleOpenAddCourse}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold rounded-full transition shadow-2xs cursor-pointer"
                                        >
                                            <FaPlus className="text-[10px]" /> Add Course
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {courses.slice(0, 6).map((c) => (
                                            <div
                                                key={c._id}
                                                className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] flex items-center justify-between"
                                            >
                                                <div>
                                                    <span className="px-2 py-0.5 rounded-md bg-[#0D1B2A]/10 dark:bg-[#C89D5C]/20 text-[#0D1B2A] dark:text-[#E5C378] text-[10px] font-bold font-mono uppercase">
                                                        {c.code}
                                                    </span>
                                                    <h4 className="text-xs font-bold text-[#0D1B2A] dark:text-[#FAF8F5] mt-1 line-clamp-1">
                                                        {c.name}
                                                    </h4>
                                                    <p className="text-[10px] text-[#8C7862] dark:text-[#A8957E]">
                                                        {c.numberOfSemesters || 8} Semesters • {c.degreeType || "Undergraduate"}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleOpenEditCourse(c)}
                                                    className="p-2 text-[#8C7862] hover:text-[#0D1B2A] dark:hover:text-[#FAF8F5] rounded-lg hover:bg-white dark:hover:bg-[#24201C] transition cursor-pointer"
                                                >
                                                    <FaEdit className="text-xs" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════
                            2. COURSES TAB
                        ═══════════════════════════════════════════════════════ */}
                        {activeTab === "courses" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            Courses & Degree Programs
                                        </h2>
                                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E]">
                                            Manage academic curricula, degrees, and auto-generated semester structures.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleOpenAddCourse}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold rounded-full shadow-xs transition cursor-pointer"
                                    >
                                        <FaPlus className="text-xs" /> Add New Course
                                    </button>
                                </div>

                                {/* Filters */}
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="relative flex-1 min-w-[200px]">
                                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7862] text-xs" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search courses by name or code..."
                                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                        />
                                    </div>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-3.5 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>

                                {/* Courses Table */}
                                <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-[#FAF8F5] dark:bg-[#1C1916] border-b border-[#EAE2D8] dark:border-[#2E2822] text-[#8C7862]">
                                                    <th className="p-4 font-semibold">Course Code</th>
                                                    <th className="p-4 font-semibold">Program Name</th>
                                                    <th className="p-4 font-semibold">Degree Type</th>
                                                    <th className="p-4 font-semibold">Semesters</th>
                                                    <th className="p-4 font-semibold">Duration</th>
                                                    <th className="p-4 font-semibold">Status</th>
                                                    <th className="p-4 font-semibold text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#EAE2D8] dark:divide-[#2E2822]">
                                                {filteredCourses.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="p-8 text-center text-[#8C7862]">
                                                            No courses found matching your criteria.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredCourses.map((c) => (
                                                        <tr key={c._id} className="hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916] transition">
                                                            <td className="p-4 font-mono font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                                <span className="px-2 py-0.5 rounded-md bg-[#0D1B2A]/5 dark:bg-[#C89D5C]/10 border border-[#EAE2D8] dark:border-[#2E2822]">
                                                                    {c.code}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                                {c.name}
                                                            </td>
                                                            <td className="p-4 text-[#6B5B49] dark:text-[#C2B3A0]">
                                                                {c.degreeType || "Undergraduate"}
                                                            </td>
                                                            <td className="p-4 font-semibold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                                {c.numberOfSemesters || 8} Sems
                                                            </td>
                                                            <td className="p-4 text-[#8C7862]">
                                                                {c.duration || "4 Years"}
                                                            </td>
                                                            <td className="p-4">
                                                                <button
                                                                    onClick={() => handleToggleCourseStatus(c)}
                                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                                                                        c.status === "active"
                                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                                                            : "bg-stone-500/10 text-stone-500 border border-stone-500/30"
                                                                    }`}
                                                                >
                                                                    {c.status === "active" ? <FaToggleOn /> : <FaToggleOff />}
                                                                    <span>{c.status === "active" ? "Active" : "Inactive"}</span>
                                                                </button>
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => handleOpenEditCourse(c)}
                                                                        className="p-2 text-[#8C7862] hover:text-[#0D1B2A] dark:hover:text-[#FAF8F5] rounded-lg hover:bg-white dark:hover:bg-[#24201C] transition cursor-pointer"
                                                                        title="Edit Course"
                                                                    >
                                                                        <FaEdit />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteCourse(c)}
                                                                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                                                                        title="Delete Course"
                                                                    >
                                                                        <FaTrash />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════
                            3. MODERATION QUEUE TAB
                        ═══════════════════════════════════════════════════════ */}
                        {activeTab === "moderation" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            Moderation Queue
                                        </h2>
                                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E]">
                                            Review, verify, approve, or reject student uploaded question papers and study notes.
                                        </p>
                                    </div>

                                    {/* Bulk Actions */}
                                    {selectedIds.size > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-[#C89D5C] mr-2">
                                                {selectedIds.size} Selected
                                            </span>
                                            <button
                                                onClick={() => handleBulkStatusChange("approved")}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <FaCheckCircle className="text-[11px]" /> Approve All
                                            </button>
                                            <button
                                                onClick={() => handleBulkStatusChange("rejected")}
                                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <FaTimesCircle className="text-[11px]" /> Reject All
                                            </button>
                                            <button
                                                onClick={handleBulkDelete}
                                                className="p-2 bg-stone-200 dark:bg-[#24201C] hover:bg-rose-500 hover:text-white rounded-full text-xs transition cursor-pointer"
                                                title="Delete Selected"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Filter subtabs: All | Question Papers | Study Notes */}
                                <div className="flex items-center gap-2">
                                    {[
                                        { id: "all", label: `All Pending (${totalPendingCount})` },
                                        { id: "pyq", label: `Question Papers (${pendingPapers.length})` },
                                        { id: "note", label: `Study Notes (${pendingNotes.length})` },
                                    ].map((f) => (
                                        <button
                                            key={f.id}
                                            onClick={() => setModerationFilter(f.id)}
                                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                                                moderationFilter === f.id
                                                    ? "bg-[#0D1B2A] text-white dark:bg-[#C89D5C] dark:text-[#0D1B2A]"
                                                    : "bg-white dark:bg-[#161412] text-[#6B5B49] dark:text-[#C2B3A0] border border-[#EAE2D8] dark:border-[#2E2822]"
                                            }`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Pending Items List */}
                                <div className="space-y-3">
                                    {totalPendingCount === 0 ? (
                                        <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-12 text-center">
                                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-2xl mx-auto mb-3">
                                                <FaCheckCircle />
                                            </div>
                                            <h3 className="font-serif font-bold text-base text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                All Caught Up!
                                            </h3>
                                            <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mt-1 max-w-sm mx-auto">
                                                There are currently no materials waiting for moderation approval.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Pending PYQs */}
                                            {(moderationFilter === "all" || moderationFilter === "pyq") &&
                                                pendingPapers.map((paper) => {
                                                    const combinedId = `pyq_${paper._id}`;
                                                    const isChecked = selectedIds.has(combinedId);
                                                    return (
                                                        <div
                                                            key={paper._id}
                                                            className="p-5 rounded-3xl bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                                                        >
                                                            <div className="flex items-start gap-3 min-w-0">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => {
                                                                        const updated = new Set(selectedIds);
                                                                        if (isChecked) updated.delete(combinedId);
                                                                        else updated.add(combinedId);
                                                                        setSelectedIds(updated);
                                                                    }}
                                                                    className="mt-1 w-4 h-4 rounded-md accent-[#C89D5C]"
                                                                />
                                                                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0">
                                                                    <FaFilePdf />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase">
                                                                            Question Paper
                                                                        </span>
                                                                        <span className="text-[10px] text-[#8C7862]">
                                                                            {paper.courseId?.name || paper.course} • Sem {paper.semester} • {paper.academicYear}
                                                                        </span>
                                                                    </div>
                                                                    <h4 className="font-serif font-bold text-sm text-[#0D1B2A] dark:text-[#FAF8F5] mt-1 truncate">
                                                                        {paper.title}
                                                                    </h4>
                                                                    <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E]">
                                                                        Uploaded by {paper.userEmail || paper.uploadedBy || "Student"} on {new Date(paper.createdAt).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                                                {paper.fileUrl && (
                                                                    <button
                                                                        onClick={() => setPreviewPdf({ url: paper.fileUrl, title: paper.title })}
                                                                        className="px-3 py-1.5 rounded-full bg-[#FAF8F5] dark:bg-[#24201C] hover:bg-[#F4EFEA] text-xs font-bold text-[#0D1B2A] dark:text-[#FAF8F5] border border-[#DDD2C4] dark:border-[#2E2822] flex items-center gap-1.5 transition cursor-pointer"
                                                                    >
                                                                        <FaEye /> Preview PDF
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleStatusChange("pyq", paper._id, "approved")}
                                                                    disabled={actionLoading}
                                                                    className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                                                                >
                                                                    <FaCheck /> Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => setRejectTarget({ type: "pyq", id: paper._id, title: paper.title })}
                                                                    disabled={actionLoading}
                                                                    className="px-3.5 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                                                                >
                                                                    <FaTimes /> Reject
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                            {/* Pending Notes */}
                                            {(moderationFilter === "all" || moderationFilter === "note") &&
                                                pendingNotes.map((note) => {
                                                    const combinedId = `note_${note._id}`;
                                                    const isChecked = selectedIds.has(combinedId);
                                                    return (
                                                        <div
                                                            key={note._id}
                                                            className="p-5 rounded-3xl bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                                                        >
                                                            <div className="flex items-start gap-3 min-w-0">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => {
                                                                        const updated = new Set(selectedIds);
                                                                        if (isChecked) updated.delete(combinedId);
                                                                        else updated.add(combinedId);
                                                                        setSelectedIds(updated);
                                                                    }}
                                                                    className="mt-1 w-4 h-4 rounded-md accent-[#C89D5C]"
                                                                />
                                                                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-lg shrink-0">
                                                                    <FaStickyNote />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-bold uppercase">
                                                                            Study Note
                                                                        </span>
                                                                        <span className="text-[10px] text-[#8C7862]">
                                                                            {note.courseId?.name || note.course} • Sem {note.semester} • {note.unit || "Unit 1"}
                                                                        </span>
                                                                    </div>
                                                                    <h4 className="font-serif font-bold text-sm text-[#0D1B2A] dark:text-[#FAF8F5] mt-1 truncate">
                                                                        {note.title}
                                                                    </h4>
                                                                    <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E]">
                                                                        Author: {note.author || "Student"} • Uploaded {new Date(note.createdAt).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                                                {note.fileUrl && (
                                                                    <button
                                                                        onClick={() => setPreviewPdf({ url: note.fileUrl, title: note.title })}
                                                                        className="px-3 py-1.5 rounded-full bg-[#FAF8F5] dark:bg-[#24201C] hover:bg-[#F4EFEA] text-xs font-bold text-[#0D1B2A] dark:text-[#FAF8F5] border border-[#DDD2C4] dark:border-[#2E2822] flex items-center gap-1.5 transition cursor-pointer"
                                                                    >
                                                                        <FaEye /> Preview PDF
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleStatusChange("note", note._id, "approved")}
                                                                    disabled={actionLoading}
                                                                    className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                                                                >
                                                                    <FaCheck /> Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => setRejectTarget({ type: "note", id: note._id, title: note.title })}
                                                                    disabled={actionLoading}
                                                                    className="px-3.5 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                                                                >
                                                                    <FaTimes /> Reject
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════
                            4. QUESTION PAPERS TAB
                        ═══════════════════════════════════════════════════════ */}
                        {activeTab === "papers" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            Question Papers Repository
                                        </h2>
                                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E]">
                                            All uploaded previous year question papers across courses and semesters.
                                        </p>
                                    </div>
                                    <Link
                                        to="/upload"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold rounded-full shadow-xs transition"
                                    >
                                        <FaPlus className="text-xs" /> Upload Paper
                                    </Link>
                                </div>

                                {/* Filters */}
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <div className="relative col-span-1 sm:col-span-2">
                                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7862] text-xs" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search by title, exam year..."
                                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                        />
                                    </div>
                                    <select
                                        value={selectedCourseFilter}
                                        onChange={(e) => setSelectedCourseFilter(e.target.value)}
                                        className="px-3.5 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="all">All Courses</option>
                                        {courses.map((c) => (
                                            <option key={c._id} value={c._id}>
                                                {c.name} ({c.code})
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-3.5 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="approved">Approved</option>
                                        <option value="pending">Pending</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>

                                {/* Papers Table */}
                                <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-[#FAF8F5] dark:bg-[#1C1916] border-b border-[#EAE2D8] dark:border-[#2E2822] text-[#8C7862]">
                                                    <th className="p-4 font-semibold">Paper Title</th>
                                                    <th className="p-4 font-semibold">Course</th>
                                                    <th className="p-4 font-semibold">Semester</th>
                                                    <th className="p-4 font-semibold">Exam Year</th>
                                                    <th className="p-4 font-semibold">Status</th>
                                                    <th className="p-4 font-semibold text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#EAE2D8] dark:divide-[#2E2822]">
                                                {filteredPapers.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-[#8C7862]">
                                                            No question papers found matching your filters.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredPapers.map((paper) => (
                                                        <tr key={paper._id} className="hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916] transition">
                                                            <td className="p-4">
                                                                <div className="font-bold text-[#0D1B2A] dark:text-[#FAF8F5] line-clamp-1">
                                                                    {paper.title}
                                                                </div>
                                                                <span className="text-[10px] text-[#8C7862]">
                                                                    {paper.examType || "End Semester"}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-[#6B5B49] dark:text-[#C2B3A0]">
                                                                {paper.courseId?.name || paper.course || "—"}
                                                            </td>
                                                            <td className="p-4 font-semibold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                                Sem {paper.semester || "—"}
                                                            </td>
                                                            <td className="p-4 text-[#8C7862]">
                                                                {paper.academicYear || paper.year || "—"}
                                                            </td>
                                                            <td className="p-4">
                                                                <span
                                                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                                        paper.status === "approved" || !paper.status
                                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                                            : paper.status === "pending"
                                                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                                                            : "bg-rose-500/10 text-rose-600"
                                                                    }`}
                                                                >
                                                                    {paper.status || "approved"}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    {paper.fileUrl && (
                                                                        <button
                                                                            onClick={() => setPreviewPdf({ url: paper.fileUrl, title: paper.title })}
                                                                            className="p-2 text-[#8C7862] hover:text-[#0D1B2A] dark:hover:text-[#FAF8F5] rounded-lg transition cursor-pointer"
                                                                            title="Preview PDF"
                                                                        >
                                                                            <FaEye />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleOpenEditPaper(paper)}
                                                                        className="p-2 text-[#8C7862] hover:text-[#0D1B2A] dark:hover:text-[#FAF8F5] rounded-lg transition cursor-pointer"
                                                                        title="Edit Paper"
                                                                    >
                                                                        <FaEdit />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeletePaper(paper._id)}
                                                                        className="p-2 text-rose-500 hover:text-rose-700 rounded-lg transition cursor-pointer"
                                                                        title="Delete Paper"
                                                                    >
                                                                        <FaTrash />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════
                            5. STUDY NOTES TAB
                        ═══════════════════════════════════════════════════════ */}
                        {activeTab === "notes" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            Study Notes Repository
                                        </h2>
                                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E]">
                                            Handwritten and digital lecture notes, unit modules, and study summaries.
                                        </p>
                                    </div>
                                    <Link
                                        to="/upload"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold rounded-full shadow-xs transition"
                                    >
                                        <FaPlus className="text-xs" /> Upload Notes
                                    </Link>
                                </div>

                                {/* Filters */}
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <div className="relative col-span-1 sm:col-span-2">
                                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7862] text-xs" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search by notes title, author, unit..."
                                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                        />
                                    </div>
                                    <select
                                        value={selectedCourseFilter}
                                        onChange={(e) => setSelectedCourseFilter(e.target.value)}
                                        className="px-3.5 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="all">All Courses</option>
                                        {courses.map((c) => (
                                            <option key={c._id} value={c._id}>
                                                {c.name} ({c.code})
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-3.5 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="approved">Approved</option>
                                        <option value="pending">Pending</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>

                                {/* Notes Table */}
                                <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-[#FAF8F5] dark:bg-[#1C1916] border-b border-[#EAE2D8] dark:border-[#2E2822] text-[#8C7862]">
                                                    <th className="p-4 font-semibold">Note Title</th>
                                                    <th className="p-4 font-semibold">Course</th>
                                                    <th className="p-4 font-semibold">Semester</th>
                                                    <th className="p-4 font-semibold">Unit / Module</th>
                                                    <th className="p-4 font-semibold">Author</th>
                                                    <th className="p-4 font-semibold">Status</th>
                                                    <th className="p-4 font-semibold text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#EAE2D8] dark:divide-[#2E2822]">
                                                {filteredNotes.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="p-8 text-center text-[#8C7862]">
                                                            No study notes found matching your criteria.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredNotes.map((note) => (
                                                        <tr key={note._id} className="hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916] transition">
                                                            <td className="p-4 font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                                {note.title}
                                                            </td>
                                                            <td className="p-4 text-[#6B5B49] dark:text-[#C2B3A0]">
                                                                {note.courseId?.name || note.course || "—"}
                                                            </td>
                                                            <td className="p-4 font-semibold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                                Sem {note.semester || "—"}
                                                            </td>
                                                            <td className="p-4 text-[#8C7862]">
                                                                {note.unit || "Unit 1"}
                                                            </td>
                                                            <td className="p-4 text-[#8C7862]">
                                                                {note.author || "Student"}
                                                            </td>
                                                            <td className="p-4">
                                                                <span
                                                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                                        note.status === "approved" || !note.status
                                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                                            : note.status === "pending"
                                                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                                                            : "bg-rose-500/10 text-rose-600"
                                                                    }`}
                                                                >
                                                                    {note.status || "approved"}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    {note.fileUrl && (
                                                                        <button
                                                                            onClick={() => setPreviewPdf({ url: note.fileUrl, title: note.title })}
                                                                            className="p-2 text-[#8C7862] hover:text-[#0D1B2A] dark:hover:text-[#FAF8F5] rounded-lg transition cursor-pointer"
                                                                            title="Preview PDF"
                                                                        >
                                                                            <FaEye />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleOpenEditNote(note)}
                                                                        className="p-2 text-[#8C7862] hover:text-[#0D1B2A] dark:hover:text-[#FAF8F5] rounded-lg transition cursor-pointer"
                                                                        title="Edit Note"
                                                                    >
                                                                        <FaEdit />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteNote(note._id)}
                                                                        className="p-2 text-rose-500 hover:text-rose-700 rounded-lg transition cursor-pointer"
                                                                        title="Delete Note"
                                                                    >
                                                                        <FaTrash />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════
                            6. USERS DIRECTORY TAB
                        ═══════════════════════════════════════════════════════ */}
                        {activeTab === "users" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            Registered Users & Contributors
                                        </h2>
                                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E]">
                                            Real user profiles synchronized from Clerk and MongoDB authentication.
                                        </p>
                                    </div>
                                    <div className="relative min-w-[240px]">
                                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7862] text-xs" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search users by name or email..."
                                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                        />
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-[#FAF8F5] dark:bg-[#1C1916] border-b border-[#EAE2D8] dark:border-[#2E2822] text-[#8C7862]">
                                                    <th className="p-4 font-semibold">User Member</th>
                                                    <th className="p-4 font-semibold">Email Address</th>
                                                    <th className="p-4 font-semibold">Role</th>
                                                    <th className="p-4 font-semibold">Papers Uploaded</th>
                                                    <th className="p-4 font-semibold">Notes Uploaded</th>
                                                    <th className="p-4 font-semibold">Total Contributions</th>
                                                    <th className="p-4 font-semibold">Joined At</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#EAE2D8] dark:divide-[#2E2822]">
                                                {filteredUsers.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="p-8 text-center text-[#8C7862]">
                                                            No registered users found.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredUsers.map((u) => (
                                                        <tr key={u._id || u.clerkId} className="hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916] transition">
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-3">
                                                                    {u.imageUrl ? (
                                                                        <img
                                                                            src={u.imageUrl}
                                                                            alt={u.name}
                                                                            className="w-8 h-8 rounded-full object-cover border border-[#DDD2C4] dark:border-[#2E2822]"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-8 h-8 rounded-full bg-[#0D1B2A] dark:bg-[#C89D5C] text-[#FAF8F5] dark:text-[#0D1B2A] flex items-center justify-center font-bold text-xs">
                                                                            {(u.name || "U").charAt(0).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <div className="font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                                            {u.name || "Academic Member"}
                                                                        </div>
                                                                        <div className="text-[10px] font-mono text-[#8C7862] truncate max-w-[140px]">
                                                                            {u.clerkId}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-[#6B5B49] dark:text-[#C2B3A0] font-medium">
                                                                {u.email || "—"}
                                                            </td>
                                                            <td className="p-4">
                                                                <span
                                                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                                        u.role === "admin"
                                                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                                                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                                                                    }`}
                                                                >
                                                                    {u.role === "admin" ? <FaShieldAlt className="text-[9px]" /> : <FaUserCheck className="text-[9px]" />}
                                                                    <span className="capitalize">{u.role || "student"}</span>
                                                                </span>
                                                            </td>
                                                            <td className="p-4 font-semibold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                                {u.pyqUploads || 0}
                                                            </td>
                                                            <td className="p-4 font-semibold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                                {u.noteUploads || 0}
                                                            </td>
                                                            <td className="p-4 font-bold text-[#C89D5C]">
                                                                {u.totalUploads || 0}
                                                            </td>
                                                            <td className="p-4 text-[#8C7862]">
                                                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* ═══════════════════════════════════════════════════════════════
                MODALS
            ═══════════════════════════════════════════════════════════════ */}

            {/* COURSE ADD / EDIT MODAL */}
            {courseModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#EAE2D8] dark:border-[#2E2822]">
                            <h3 className="font-serif font-bold text-lg text-[#0D1B2A] dark:text-[#FAF8F5]">
                                {editingCourse ? "Edit Course" : "Add New Course / Program"}
                            </h3>
                            <button
                                onClick={() => setCourseModalOpen(false)}
                                className="text-[#8C7862] hover:text-[#0D1B2A] dark:hover:text-white cursor-pointer"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCourse} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                    Course Full Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={courseForm.name}
                                    onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                                    placeholder="e.g. B.Tech Computer Science and Engineering"
                                    className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Course Code *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={courseForm.code}
                                        onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. BTECH-CSE"
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs font-mono font-bold text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Degree Type
                                    </label>
                                    <select
                                        value={courseForm.degreeType}
                                        onChange={(e) => setCourseForm({ ...courseForm, degreeType: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        {DEGREE_TYPES.map((dt) => (
                                            <option key={dt} value={dt}>
                                                {dt}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Number of Semesters *
                                    </label>
                                    <select
                                        required
                                        value={courseForm.numberOfSemesters}
                                        onChange={(e) => setCourseForm({ ...courseForm, numberOfSemesters: Number(e.target.value) })}
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs font-bold text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                                            <option key={num} value={num}>
                                                {num} Semesters {num === 8 ? "(e.g. B.Tech)" : num === 6 ? "(e.g. BCA/BBA)" : num === 4 ? "(e.g. MCA/MBA)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Duration
                                    </label>
                                    <input
                                        type="text"
                                        value={courseForm.duration}
                                        onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                                        placeholder="e.g. 4 Years"
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                <button
                                    type="button"
                                    onClick={() => setCourseModalOpen(false)}
                                    className="px-5 py-2 rounded-full border border-[#DDD2C4] dark:border-[#2E2822] text-xs font-semibold text-[#4A3E31] dark:text-[#C2B3A0] cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-6 py-2 rounded-full bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold shadow-sm transition disabled:opacity-60 cursor-pointer"
                                >
                                    {actionLoading ? "Saving..." : "Save Course"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT QUESTION PAPER MODAL */}
            {editPaperModalOpen && editingPaper && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl shadow-2xl w-full max-w-xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#EAE2D8] dark:border-[#2E2822]">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] flex items-center justify-center">
                                    <FaEdit className="text-xs" />
                                </div>
                                <h3 className="font-serif font-bold text-lg text-[#0D1B2A] dark:text-[#FAF8F5]">
                                    Edit Question Paper
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setEditPaperModalOpen(false);
                                    setEditingPaper(null);
                                }}
                                className="text-[#8C7862] hover:text-[#0D1B2A] dark:hover:text-white cursor-pointer"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSavePaper} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                    Paper Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editPaperForm.title}
                                    onChange={(e) => setEditPaperForm({ ...editPaperForm, title: e.target.value })}
                                    placeholder="e.g. End Semester Exam 2024 - Database Management Systems"
                                    className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Course / Program
                                    </label>
                                    <select
                                        value={editPaperForm.courseId}
                                        onChange={(e) => {
                                            const cId = e.target.value;
                                            const c = courses.find((x) => x._id === cId);
                                            setEditPaperForm({
                                                ...editPaperForm,
                                                courseId: cId,
                                                course: c ? c.name : editPaperForm.course,
                                            });
                                        }}
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="">Select Course</option>
                                        {courses.map((c) => (
                                            <option key={c._id} value={c._id}>
                                                {c.name} ({c.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Semester Number
                                    </label>
                                    <select
                                        value={editPaperForm.semester}
                                        onChange={(e) => setEditPaperForm({ ...editPaperForm, semester: Number(e.target.value) })}
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                            <option key={s} value={s}>
                                                Semester {s}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Exam Type
                                    </label>
                                    <select
                                        value={editPaperForm.examType}
                                        onChange={(e) => setEditPaperForm({ ...editPaperForm, examType: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
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
                                        Academic Year
                                    </label>
                                    <select
                                        value={editPaperForm.academicYear}
                                        onChange={(e) => setEditPaperForm({ ...editPaperForm, academicYear: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        {ACADEMIC_YEARS.map((y) => (
                                            <option key={y} value={y}>
                                                {y}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Approval Status
                                    </label>
                                    <select
                                        value={editPaperForm.status}
                                        onChange={(e) => setEditPaperForm({ ...editPaperForm, status: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="approved">Approved</option>
                                        <option value="pending">Pending</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditPaperModalOpen(false);
                                        setEditingPaper(null);
                                    }}
                                    className="px-5 py-2 rounded-full border border-[#DDD2C4] dark:border-[#2E2822] text-xs font-semibold text-[#4A3E31] dark:text-[#C2B3A0] cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-6 py-2 rounded-full bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold shadow-sm transition disabled:opacity-60 cursor-pointer"
                                >
                                    {actionLoading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT STUDY NOTE MODAL */}
            {editNoteModalOpen && editingNote && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl shadow-2xl w-full max-w-xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#EAE2D8] dark:border-[#2E2822]">
                            <h3 className="font-serif font-bold text-lg text-[#0D1B2A] dark:text-[#FAF8F5]">
                                Edit Study Note
                            </h3>
                            <button
                                onClick={() => {
                                    setEditNoteModalOpen(false);
                                    setEditingNote(null);
                                }}
                                className="text-[#8C7862] hover:text-[#0D1B2A] dark:hover:text-white cursor-pointer"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSaveNote} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                    Note Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editNoteForm.title}
                                    onChange={(e) => setEditNoteForm({ ...editNoteForm, title: e.target.value })}
                                    placeholder="e.g. Unit 1 Complete Notes"
                                    className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Course
                                    </label>
                                    <select
                                        value={editNoteForm.courseId}
                                        onChange={(e) => {
                                            const cId = e.target.value;
                                            const c = courses.find((x) => x._id === cId);
                                            setEditNoteForm({
                                                ...editNoteForm,
                                                courseId: cId,
                                                course: c ? c.name : editNoteForm.course,
                                            });
                                        }}
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="">Select Course</option>
                                        {courses.map((c) => (
                                            <option key={c._id} value={c._id}>
                                                {c.name} ({c.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Semester
                                    </label>
                                    <select
                                        value={editNoteForm.semester}
                                        onChange={(e) => setEditNoteForm({ ...editNoteForm, semester: Number(e.target.value) })}
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                            <option key={s} value={s}>
                                                Semester {s}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Unit / Module
                                    </label>
                                    <input
                                        type="text"
                                        value={editNoteForm.unit}
                                        onChange={(e) => setEditNoteForm({ ...editNoteForm, unit: e.target.value })}
                                        placeholder="e.g. Unit 1"
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Author
                                    </label>
                                    <input
                                        type="text"
                                        value={editNoteForm.author}
                                        onChange={(e) => setEditNoteForm({ ...editNoteForm, author: e.target.value })}
                                        placeholder="e.g. Faculty / Student Name"
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditNoteModalOpen(false);
                                        setEditingNote(null);
                                    }}
                                    className="px-5 py-2 rounded-full border border-[#DDD2C4] dark:border-[#2E2822] text-xs font-semibold text-[#4A3E31] dark:text-[#C2B3A0] cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-6 py-2 rounded-full bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold shadow-sm transition disabled:opacity-60 cursor-pointer"
                                >
                                    {actionLoading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* REJECTION REASON MODAL */}
            {rejectTarget && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="font-serif font-bold text-base text-[#0D1B2A] dark:text-[#FAF8F5] mb-2">
                            Reject Material Submission
                        </h3>
                        <p className="text-xs text-[#8C7862] dark:text-[#A8957E] mb-4">
                            Provide a feedback note explaining why <strong>{rejectTarget.title}</strong> was rejected.
                        </p>
                        <textarea
                            rows={3}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Document is blurry, incorrect course metadata, or copyright violation..."
                            className="w-full p-3 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-2xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-rose-500 mb-4"
                        />
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => setRejectTarget(null)}
                                className="px-4 py-2 rounded-full border border-[#DDD2C4] dark:border-[#2E2822] text-xs font-semibold cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleStatusChange(rejectTarget.type, rejectTarget.id, "rejected", rejectionReason)}
                                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CASCADE WARNING MODAL */}
            {cascadeWarning && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#161412] border border-amber-500/30 rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl mb-4">
                            <FaExclamationTriangle />
                        </div>
                        <h3 className="font-serif font-bold text-base text-[#0D1B2A] dark:text-[#FAF8F5] mb-2">
                            Caution: Linked Materials Detected
                        </h3>
                        <p className="text-xs text-[#6B5B49] dark:text-[#C2B3A0] mb-4 leading-relaxed">
                            {cascadeWarning.message} Deleting this course will also delete all associated semesters and materials.
                        </p>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => setCascadeWarning(null)}
                                className="px-4 py-2 rounded-full border border-[#DDD2C4] dark:border-[#2E2822] text-xs font-semibold cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteCourse(cascadeWarning.target, true)}
                                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                            >
                                Force Delete Everything
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF PREVIEW MODAL */}
            {previewPdf && (
                <PDFViewer
                    fileUrl={previewPdf.url}
                    title={previewPdf.title}
                    onClose={() => setPreviewPdf(null)}
                />
            )}

            <Footer />
        </div>
    );
}
