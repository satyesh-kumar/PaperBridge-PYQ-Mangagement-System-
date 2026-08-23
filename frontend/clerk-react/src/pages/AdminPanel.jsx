import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/react";
import {
    FaShieldAlt,
    FaUniversity,
    FaGraduationCap,
    FaLayerGroup,
    FaBook,
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
    FaCalendarAlt,
    FaMapMarkerAlt,
    FaGlobe,
    FaArrowLeft,
    FaExpand,
    FaCompress,
} from "react-icons/fa";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import Navbar2 from "../components/Navbar2";
import Footer from "../components/Footer";
import PDFViewer from "../components/PDFViewer";
import { useIsAdmin } from "../hooks/useIsAdmin";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const FALLBACK_UNIVERSITIES = [
    { _id: "uni_uu", name: "United University", code: "UU", location: "Prayagraj, UP", state: "Uttar Pradesh", country: "India", status: "active" },
    { _id: "uni_au", name: "University of Allahabad", code: "AU", location: "Prayagraj, UP", state: "Uttar Pradesh", country: "India", status: "active" },
    { _id: "uni_aktu", name: "Dr. A.P.J. Abdul Kalam Technical University", code: "AKTU", location: "Lucknow, UP", state: "Uttar Pradesh", country: "India", status: "active" },
    { _id: "uni_du", name: "University of Delhi", code: "DU", location: "New Delhi", state: "Delhi", country: "India", status: "active" },
];

const FALLBACK_COURSES = [
    { _id: "course_btech", name: "B.Tech Computer Science", code: "B.Tech CSE", numberOfSemesters: 8, degreeType: "Undergraduate", duration: "4 Years", status: "active" },
    { _id: "course_bca", name: "Bachelor of Computer Applications", code: "BCA", numberOfSemesters: 6, degreeType: "Undergraduate", duration: "3 Years", status: "active" },
    { _id: "course_mca", name: "Master of Computer Applications", code: "MCA", numberOfSemesters: 4, degreeType: "Postgraduate", duration: "2 Years", status: "active" },
    { _id: "course_mba", name: "Master of Business Administration", code: "MBA", numberOfSemesters: 4, degreeType: "Postgraduate", duration: "2 Years", status: "active" },
    { _id: "course_bba", name: "Bachelor of Business Administration", code: "BBA", numberOfSemesters: 6, degreeType: "Undergraduate", duration: "3 Years", status: "active" },
    { _id: "course_diploma", name: "Diploma in Engineering", code: "Diploma", numberOfSemesters: 6, degreeType: "Diploma", duration: "3 Years", status: "active" },
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
    const [universities, setUniversities] = useState(FALLBACK_UNIVERSITIES);
    const [courses, setCourses] = useState(FALLBACK_COURSES);
    const [semesters, setSemesters] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [papers, setPapers] = useState([]);
    const [notes, setNotes] = useState([]);
    const [users, setUsers] = useState([]);

    // Full-screen and Width layout mode
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

    // Active Navigation Tab
    // 'overview' | 'universities' | 'courses' | 'semesters' | 'subjects' | 'moderation' | 'papers' | 'notes' | 'users'
    const [activeTab, setActiveTab] = useState("overview");

    // Moderation sub-filter: 'all' | 'pyq' | 'note'
    const [moderationFilter, setModerationFilter] = useState("all");

    // Search & Filter state
    const [search, setSearch] = useState("");
    const [selectedUniFilter, setSelectedUniFilter] = useState("all");
    const [selectedCourseFilter, setSelectedCourseFilter] = useState("all");
    const [selectedSemFilter, setSelectedSemFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    // Selection for bulk moderation
    const [selectedIds, setSelectedIds] = useState(new Set());

    // PDF Preview
    const [previewPdf, setPreviewPdf] = useState(null);

    // ── MODAL STATES ────────────────────────────────────────────────────────
    // University Modal
    const [uniModalOpen, setUniModalOpen] = useState(false);
    const [editingUni, setEditingUni] = useState(null);
    const [uniForm, setUniForm] = useState({
        name: "",
        code: "",
        location: "",
        state: "",
        country: "India",
        website: "",
        description: "",
        status: "active",
    });

    // Course Modal
    const [courseModalOpen, setCourseModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [courseForm, setCourseForm] = useState({
        name: "",
        code: "",
        universityId: "",
        degreeType: "Undergraduate",
        duration: "4 Years",
        numberOfSemesters: 8,
        description: "",
        status: "active",
    });

    // Subject Modal
    const [subjectModalOpen, setSubjectModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [subjectForm, setSubjectForm] = useState({
        name: "",
        code: "",
        universityId: "",
        courseId: "",
        semesterId: "",
        description: "",
        status: "active",
    });

    // Edit PYQ Modal
    const [editingPaper, setEditingPaper] = useState(null);
    const [editPaperModalOpen, setEditPaperModalOpen] = useState(false);
    const [paperEditSemesters, setPaperEditSemesters] = useState([]);
    const [editPaperForm, setEditPaperForm] = useState({
        title: "",
        universityId: "",
        courseId: "",
        semesterId: "",
        subjectId: "",
        university: "",
        course: "",
        semester: 1,
        subject: "",
        subjectCode: "",
        branch: "",
        examType: "End Semester",
        academicYear: "2024-25",
        status: "approved",
    });

    // Edit Note Modal
    const [editingNote, setEditingNote] = useState(null);
    const [editNoteForm, setEditNoteForm] = useState({
        title: "",
        subject: "",
        unit: "Complete Syllabus",
        universityId: "",
        courseId: "",
        semesterId: "",
        course: "",
        semester: 1,
        author: "",
        status: "approved",
    });

    // Reject Reason Modal
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");

    // Cascade Delete Safety Modal
    const [cascadeWarning, setCascadeWarning] = useState(null);

    // ── DATA FETCHING ───────────────────────────────────────────────────────
    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true);
            const token = await getToken();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const [
                statsSettled,
                uniSettled,
                courseSettled,
                subSettled,
                paperSettled,
                noteSettled,
                userSettled,
            ] = await Promise.allSettled([
                axios.get(`${API_URL}/api/admin/stats`, { headers, timeout: 8000 }),
                axios.get(`${API_URL}/api/universities?status=all`, { headers, timeout: 8000 }).catch(() => axios.get(`${API_URL}/api/universities`, { timeout: 8000 })),
                axios.get(`${API_URL}/api/courses?status=all`, { headers, timeout: 8000 }).catch(() => axios.get(`${API_URL}/api/courses`, { timeout: 8000 })),
                axios.get(`${API_URL}/api/subjects?status=all`, { headers, timeout: 8000 }).catch(() => axios.get(`${API_URL}/api/subjects`, { timeout: 8000 })),
                axios.get(`${API_URL}/api/admin/pyqs`, { headers, timeout: 8000 }).catch(() => axios.get(`${API_URL}/api/pyqs`, { timeout: 8000 })),
                axios.get(`${API_URL}/api/admin/notes`, { headers, timeout: 8000 }).catch(() => axios.get(`${API_URL}/api/notes`, { timeout: 8000 })),
                axios.get(`${API_URL}/api/admin/users`, { headers, timeout: 8000 }).catch(() => ({ data: [] })),
            ]);

            const loadedUnis = (uniSettled.status === "fulfilled" && Array.isArray(uniSettled.value?.data) && uniSettled.value.data.length > 0)
                ? uniSettled.value.data
                : FALLBACK_UNIVERSITIES;

            const loadedCourses = (courseSettled.status === "fulfilled" && Array.isArray(courseSettled.value?.data) && courseSettled.value.data.length > 0)
                ? courseSettled.value.data
                : FALLBACK_COURSES;

            const loadedSubs = (subSettled.status === "fulfilled" && Array.isArray(subSettled.value?.data))
                ? subSettled.value.data
                : [];

            const loadedPapers = (paperSettled.status === "fulfilled" && Array.isArray(paperSettled.value?.data))
                ? paperSettled.value.data
                : [];

            const loadedNotes = (noteSettled.status === "fulfilled" && Array.isArray(noteSettled.value?.data))
                ? noteSettled.value.data
                : [];

            const loadedUsers = (userSettled.status === "fulfilled" && Array.isArray(userSettled.value?.data))
                ? userSettled.value.data
                : [];

            setUniversities(loadedUnis);
            setCourses(loadedCourses);
            setSubjects(loadedSubs);
            setPapers(loadedPapers);
            setNotes(loadedNotes);
            setUsers(loadedUsers);

            if (statsSettled.status === "fulfilled" && statsSettled.value?.data) {
                setStats(statsSettled.value.data);
            } else {
                // Calculated live metrics
                const approvedP = loadedPapers.filter((p) => p.status === "approved" || !p.status).length;
                const pendingP = loadedPapers.filter((p) => p.status === "pending").length;
                const approvedN = loadedNotes.filter((n) => n.status === "approved" || !n.status).length;
                const pendingN = loadedNotes.filter((n) => n.status === "pending").length;
                setStats({
                    totalPapers: loadedPapers.length,
                    approvedPapers: approvedP,
                    pendingPapers: pendingP,
                    totalNotes: loadedNotes.length,
                    approvedNotes: approvedN,
                    pendingNotes: pendingN,
                    totalUsers: loadedUsers.length,
                    totalUniversities: loadedUnis.length,
                    totalCourses: loadedCourses.length,
                    totalSubjects: loadedSubs.length,
                    totalDownloads: loadedPapers.reduce((acc, p) => acc + (p.downloadCount || 0), 0),
                });
            }
        } catch (err) {
            console.error("Admin data load fallback error:", err);
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Fetch semesters when course changes in forms or filters
    const fetchSemestersForCourse = async (courseId) => {
        if (!courseId) return [];
        try {
            const res = await axios.get(`${API_URL}/api/semesters?courseId=${courseId}`);
            return res.data || [];
        } catch {
            return [];
        }
    };

    // ── UNIVERSITY CRUD ─────────────────────────────────────────────────────
    const handleOpenAddUni = () => {
        setEditingUni(null);
        setUniForm({
            name: "",
            code: "",
            location: "",
            state: "",
            country: "India",
            website: "",
            description: "",
            status: "active",
        });
        setUniModalOpen(true);
    };

    const handleOpenEditUni = (uni) => {
        setEditingUni(uni);
        setUniForm({
            name: uni.name || "",
            code: uni.code || "",
            location: uni.location || "",
            state: uni.state || "",
            country: uni.country || "India",
            website: uni.website || "",
            description: uni.description || "",
            status: uni.status || "active",
        });
        setUniModalOpen(true);
    };

    const handleSaveUni = async (e) => {
        e.preventDefault();
        if (!uniForm.name.trim() || !uniForm.code.trim()) {
            toast.error("University name and code are required.");
            return;
        }

        try {
            setActionLoading(true);
            const token = await getToken();
            const headers = { Authorization: `Bearer ${token}` };

            if (editingUni) {
                await axios.put(`${API_URL}/api/universities/${editingUni._id}`, uniForm, { headers });
                toast.success(`University '${uniForm.name}' updated!`);
            } else {
                await axios.post(`${API_URL}/api/universities`, uniForm, { headers });
                toast.success(`University '${uniForm.name}' created!`);
            }
            setUniModalOpen(false);
            fetchAllData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save university");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUni = async (uni, force = false) => {
        try {
            setActionLoading(true);
            const token = await getToken();
            const headers = { Authorization: `Bearer ${token}` };

            const url = `${API_URL}/api/universities/${uni._id}${force ? "?force=true" : ""}`;
            await axios.delete(url, { headers });

            toast.success(`University '${uni.name}' deleted.`);
            setCascadeWarning(null);
            fetchAllData();
        } catch (err) {
            if (err.response?.status === 409 && err.response?.data?.error === "CASCADE_WARNING") {
                setCascadeWarning({
                    type: "university",
                    target: uni,
                    ...err.response.data,
                });
            } else {
                toast.error(err.response?.data?.error || "Failed to delete university");
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleUniStatus = async (uni) => {
        try {
            const newStatus = uni.status === "active" ? "inactive" : "active";
            const token = await getToken();
            await axios.patch(
                `${API_URL}/api/universities/${uni._id}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`University status changed to '${newStatus}'`);
            fetchAllData();
        } catch {
            toast.error("Failed to update status");
        }
    };

    // ── COURSE CRUD ─────────────────────────────────────────────────────────
    const handleOpenAddCourse = () => {
        setEditingCourse(null);
        setCourseForm({
            name: "",
            code: "",
            universityId: universities[0]?._id || "",
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
            universityId: c.universityId?._id || c.universityId || "",
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
        if (!courseForm.name.trim() || !courseForm.code.trim() || !courseForm.universityId) {
            toast.error("Course name, code, and university are required.");
            return;
        }

        try {
            setActionLoading(true);
            const token = await getToken();
            const headers = { Authorization: `Bearer ${token}` };

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
            toast.error(err.response?.data?.error || "Failed to save course");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteCourse = async (c, force = false) => {
        try {
            setActionLoading(true);
            const token = await getToken();
            const headers = { Authorization: `Bearer ${token}` };

            const url = `${API_URL}/api/courses/${c._id}${force ? "?force=true" : ""}`;
            await axios.delete(url, { headers });

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

    // ── SUBJECT CRUD ────────────────────────────────────────────────────────
    const [subjectModalSemesters, setSubjectModalSemesters] = useState([]);

    const handleOpenAddSubject = async () => {
        setEditingSubject(null);
        const defaultUni = universities[0]?._id || "";
        const defaultCourses = courses.filter((c) => (c.universityId?._id || c.universityId) === defaultUni);
        const defaultCourse = defaultCourses[0]?._id || courses[0]?._id || "";

        let sems = [];
        if (defaultCourse) {
            sems = await fetchSemestersForCourse(defaultCourse);
        }
        setSubjectModalSemesters(sems);

        setSubjectForm({
            name: "",
            code: "",
            universityId: defaultUni,
            courseId: defaultCourse,
            semesterId: sems[0]?._id || "",
            description: "",
            status: "active",
        });
        setSubjectModalOpen(true);
    };

    const handleOpenEditSubject = async (sub) => {
        setEditingSubject(sub);
        const courseId = sub.courseId?._id || sub.courseId || "";
        let sems = [];
        if (courseId) {
            sems = await fetchSemestersForCourse(courseId);
        }
        setSubjectModalSemesters(sems);

        setSubjectForm({
            name: sub.name || "",
            code: sub.code || "",
            universityId: sub.universityId?._id || sub.universityId || "",
            courseId,
            semesterId: sub.semesterId?._id || sub.semesterId || sems[0]?._id || "",
            description: sub.description || "",
            status: sub.status || "active",
        });
        setSubjectModalOpen(true);
    };

    const handleSubjectCourseChange = async (newCourseId) => {
        const sems = await fetchSemestersForCourse(newCourseId);
        setSubjectModalSemesters(sems);
        setSubjectForm((prev) => ({
            ...prev,
            courseId: newCourseId,
            semesterId: sems[0]?._id || "",
        }));
    };

    const handleSaveSubject = async (e) => {
        e.preventDefault();
        if (!subjectForm.name.trim() || !subjectForm.code.trim() || !subjectForm.courseId || !subjectForm.semesterId) {
            toast.error("Subject name, code, course, and semester are required.");
            return;
        }

        try {
            setActionLoading(true);
            const token = await getToken();
            const headers = { Authorization: `Bearer ${token}` };

            if (editingSubject) {
                await axios.put(`${API_URL}/api/subjects/${editingSubject._id}`, subjectForm, { headers });
                toast.success(`Subject '${subjectForm.name}' updated!`);
            } else {
                await axios.post(`${API_URL}/api/subjects`, subjectForm, { headers });
                toast.success(`Subject '${subjectForm.name}' created!`);
            }
            setSubjectModalOpen(false);
            fetchAllData();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save subject");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteSubject = async (sub, force = false) => {
        try {
            setActionLoading(true);
            const token = await getToken();
            const headers = { Authorization: `Bearer ${token}` };

            const url = `${API_URL}/api/subjects/${sub._id}${force ? "?force=true" : ""}`;
            await axios.delete(url, { headers });

            toast.success(`Subject '${sub.name}' deleted.`);
            setCascadeWarning(null);
            fetchAllData();
        } catch (err) {
            if (err.response?.status === 409 && err.response?.data?.error === "CASCADE_WARNING") {
                setCascadeWarning({
                    type: "subject",
                    target: sub,
                    ...err.response.data,
                });
            } else {
                toast.error(err.response?.data?.error || "Failed to delete subject");
            }
        } finally {
            setActionLoading(false);
        }
    };

    // ── MODERATION & STATUS ACTIONS ─────────────────────────────────────────
    const handleApprovePaper = async (paperId) => {
        try {
            const token = await getToken();
            const userEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
            await axios.patch(
                `${API_URL}/api/admin/pyqs/${paperId}/status`,
                { status: "approved" },
                { 
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        ...(userEmail ? { "x-user-email": userEmail } : {})
                    } 
                }
            );
            confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
            toast.success("Question paper approved & published!");
            fetchAllData();
        } catch (err) {
            console.error("Approve paper error:", err);
            toast.error(err.response?.data?.error || "Failed to approve question paper");
        }
    };

    const handleApproveNote = async (noteId) => {
        try {
            const token = await getToken();
            const userEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
            await axios.patch(
                `${API_URL}/api/admin/notes/${noteId}/status`,
                { status: "approved" },
                { 
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        ...(userEmail ? { "x-user-email": userEmail } : {})
                    } 
                }
            );
            confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
            toast.success("Study note approved & published!");
            fetchAllData();
        } catch (err) {
            console.error("Approve note error:", err);
            toast.error(err.response?.data?.error || "Failed to approve study note");
        }
    };

    const handleConfirmReject = async () => {
        if (!rejectTarget) return;
        try {
            setActionLoading(true);
            const token = await getToken();
            const userEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
            const headers = { 
                Authorization: `Bearer ${token}`,
                ...(userEmail ? { "x-user-email": userEmail } : {})
            };

            if (rejectTarget.type === "pyq") {
                await axios.patch(
                    `${API_URL}/api/admin/pyqs/${rejectTarget.item._id}/status`,
                    { status: "rejected", rejectionReason },
                    { headers }
                );
                toast.success("Question paper rejected");
            } else {
                await axios.patch(
                    `${API_URL}/api/admin/notes/${rejectTarget.item._id}/status`,
                    { status: "rejected", rejectionReason },
                    { headers }
                );
                toast.success("Study note rejected");
            }
            setRejectTarget(null);
            setRejectionReason("");
            fetchAllData();
        } catch (err) {
            console.error("Reject error:", err);
            toast.error(err.response?.data?.error || "Failed to reject submission");
        } finally {
            setActionLoading(false);
        }
    };

    const handleOpenEditPaper = async (paper) => {
        setEditingPaper(paper);
        const uId = paper.universityId?._id || paper.universityId || "";
        const cId = paper.courseId?._id || paper.courseId || "";
        const sId = paper.semesterId?._id || paper.semesterId || "";
        const subId = paper.subjectId?._id || paper.subjectId || "";

        setEditPaperForm({
            title: paper.title || "",
            universityId: uId,
            courseId: cId,
            semesterId: sId,
            subjectId: subId,
            university: paper.universityId?.name || paper.university || "",
            course: paper.courseId?.name || paper.course || "",
            semester: paper.semester || 1,
            subject: paper.subjectId?.name || paper.subject || "",
            subjectCode: paper.subjectId?.code || paper.subjectCode || "",
            branch: paper.branch || "",
            examType: paper.examType || "End Semester",
            academicYear: paper.academicYear || paper.year || "2024-25",
            status: paper.status || "approved",
        });

        if (cId) {
            const sems = await fetchSemestersForCourse(cId);
            setPaperEditSemesters(sems);
        } else {
            setPaperEditSemesters([]);
        }

        setEditPaperModalOpen(true);
    };

    const handleEditPaperCourseChange = async (courseId) => {
        const selectedC = courses.find((c) => c._id === courseId);
        setEditPaperForm((prev) => ({
            ...prev,
            courseId,
            course: selectedC ? selectedC.name : "",
            semesterId: "",
            semester: 1,
            subjectId: "",
            subject: "",
        }));

        if (courseId) {
            const sems = await fetchSemestersForCourse(courseId);
            setPaperEditSemesters(sems);
        } else {
            setPaperEditSemesters([]);
        }
    };

    const handleSavePaper = async (e) => {
        e.preventDefault();
        if (!editingPaper) return;
        try {
            setActionLoading(true);
            const token = await getToken();
            const headers = { Authorization: `Bearer ${token}` };

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
            const token = await getToken();
            await axios.delete(`${API_URL}/api/pyqs/${paperId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success("Paper deleted");
            fetchAllData();
        } catch {
            toast.error("Failed to delete paper");
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!window.confirm("Are you sure you want to permanently delete this study note?")) return;
        try {
            const token = await getToken();
            await axios.delete(`${API_URL}/api/notes/${noteId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success("Study note deleted");
            fetchAllData();
        } catch {
            toast.error("Failed to delete note");
        }
    };

    // ── CSV EXPORT ──────────────────────────────────────────────────────────
    const handleExportCSV = () => {
        let headers = ["ID", "Title", "University", "Course", "Semester", "Type", "Status", "UploadedAt"];
        let rows = papers.map((p) => [
            p._id,
            `"${(p.title || "").replace(/"/g, '""')}"`,
            `"${p.universityId?.name || p.university || ""}"`,
            `"${p.courseId?.name || p.course || ""}"`,
            p.semester || "",
            p.examType || "End Semester",
            p.status || "approved",
            p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",
        ]);

        let csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `paperbridge_repository_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Repository exported to CSV!");
    };

    // ── FILTERED DATA ───────────────────────────────────────────────────────
    const pendingPapers = useMemo(() => papers.filter((p) => p.status === "pending"), [papers]);
    const pendingNotes = useMemo(() => notes.filter((n) => n.status === "pending"), [notes]);
    const totalPendingCount = pendingPapers.length + pendingNotes.length;

    // Filtered Universities
    const filteredUniversities = useMemo(() => {
        return universities.filter((u) => {
            if (statusFilter !== "all" && u.status !== statusFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                return (
                    u.name?.toLowerCase().includes(q) ||
                    u.code?.toLowerCase().includes(q) ||
                    u.location?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [universities, statusFilter, search]);

    // Filtered Courses
    const filteredCourses = useMemo(() => {
        return courses.filter((c) => {
            const uniId = c.universityId?._id || c.universityId;
            if (selectedUniFilter !== "all" && uniId !== selectedUniFilter) return false;
            if (statusFilter !== "all" && c.status !== statusFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                return c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q);
            }
            return true;
        });
    }, [courses, selectedUniFilter, statusFilter, search]);

    // Filtered Subjects
    const filteredSubjects = useMemo(() => {
        return subjects.filter((s) => {
            const uniId = s.universityId?._id || s.universityId;
            const cId = s.courseId?._id || s.courseId;
            if (selectedUniFilter !== "all" && uniId !== selectedUniFilter) return false;
            if (selectedCourseFilter !== "all" && cId !== selectedCourseFilter) return false;
            if (selectedSemFilter !== "all" && s.semesterNumber !== Number(selectedSemFilter)) return false;
            if (statusFilter !== "all" && s.status !== statusFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                return s.name?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q);
            }
            return true;
        });
    }, [subjects, selectedUniFilter, selectedCourseFilter, selectedSemFilter, statusFilter, search]);

    // Filtered Papers
    const filteredPapers = useMemo(() => {
        return papers.filter((p) => {
            const uniId = p.universityId?._id || p.universityId;
            const cId = p.courseId?._id || p.courseId;
            if (selectedUniFilter !== "all" && uniId !== selectedUniFilter) return false;
            if (selectedCourseFilter !== "all" && cId !== selectedCourseFilter) return false;
            if (statusFilter !== "all" && p.status !== statusFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                return (
                    p.title?.toLowerCase().includes(q) ||
                    p.subject?.toLowerCase().includes(q) ||
                    p.course?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [papers, selectedUniFilter, selectedCourseFilter, statusFilter, search]);

    // Navigation items
    const navTabs = [
        { id: "overview", label: "Overview", icon: <FaShieldAlt /> },
        { id: "universities", label: "Universities", icon: <FaUniversity />, count: universities.length },
        { id: "courses", label: "Courses", icon: <FaGraduationCap />, count: courses.length },
        { id: "subjects", label: "Subjects", icon: <FaBook />, count: subjects.length },
        { id: "moderation", label: "Moderation Queue", icon: <FaClock />, count: totalPendingCount, alert: totalPendingCount > 0 },
        { id: "papers", label: "Question Papers", icon: <FaFilePdf />, count: papers.length },
        { id: "notes", label: "Study Notes", icon: <FaStickyNote />, count: notes.length },
        { id: "users", label: "Users", icon: <FaUsers />, count: users.length },
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
                                    Multi-University Architecture
                                </span>
                            </div>
                            <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E]">
                                Root Admin: <span className="font-semibold text-[#0D1B2A] dark:text-[#FAF8F5]">{userEmail}</span>
                            </p>
                        </div>
                    </div>

                    {/* Quick Global Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Back to Home Button */}
                        <Link
                            to="/"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] text-[#4A3E31] dark:text-[#FAF8F5] text-xs font-semibold rounded-full border border-[#EAE2D8] dark:border-[#2E2822] transition cursor-pointer shadow-2xs"
                        >
                            <FaArrowLeft className="text-[10px]" /> Back to Site
                        </Link>

                        {/* Fullscreen & Wide View Toggle */}
                        <button
                            onClick={() => {
                                setIsFullWidth((prev) => !prev);
                                toggleBrowserFullscreen();
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#1C1916] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] text-[#4A3E31] dark:text-[#FAF8F5] text-xs font-semibold rounded-full border border-[#EAE2D8] dark:border-[#2E2822] transition cursor-pointer shadow-2xs"
                            title={isFullWidth ? "Standard Layout" : "Full Screen View"}
                        >
                            {isFullWidth ? <FaCompress className="text-[#C89D5C] text-xs" /> : <FaExpand className="text-[#C89D5C] text-xs" />}
                            <span>{isFullWidth ? "Standard Width" : "Full Screen"}</span>
                        </button>

                        <button
                            onClick={handleExportCSV}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#1C1916] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] text-[#4A3E31] dark:text-[#FAF8F5] text-xs font-semibold rounded-full border border-[#EAE2D8] dark:border-[#2E2822] transition cursor-pointer shadow-2xs"
                        >
                            <FaFileCsv className="text-[#C89D5C]" /> Export CSV
                        </button>

                        <button
                            onClick={() => {
                                fetchAllData();
                                toast.success("Repository refreshed!");
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#1C1916] hover:bg-[#FAF8F5] dark:hover:bg-[#24201C] text-[#4A3E31] dark:text-[#FAF8F5] text-xs font-semibold rounded-full border border-[#EAE2D8] dark:border-[#2E2822] transition cursor-pointer shadow-2xs"
                        >
                            <FaSyncAlt className="text-[#C89D5C]" /> Refresh
                        </button>

                        <Link
                            to="/upload"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold rounded-full shadow-xs transition"
                        >
                            <FaPlus className="text-[10px]" /> Upload Material ↗
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
                            Loading dynamic academic repository...
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
                                        onClick={() => setActiveTab("universities")}
                                        className="cursor-pointer bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#C89D5C] rounded-3xl p-5 shadow-xs transition"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider">
                                                Universities
                                            </span>
                                            <FaUniversity className="text-[#C89D5C]" />
                                        </div>
                                        <div className="text-3xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            {stats?.totalUniversities || universities.length}
                                        </div>
                                        <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] mt-0.5">
                                            {stats?.activeUniversities || 0} active institutions
                                        </p>
                                    </div>

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
                                            {stats?.totalSemesters || 0} configured semesters
                                        </p>
                                    </div>

                                    <div
                                        onClick={() => setActiveTab("subjects")}
                                        className="cursor-pointer bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#C89D5C] rounded-3xl p-5 shadow-xs transition"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider">
                                                Active Subjects
                                            </span>
                                            <FaBook className="text-[#C89D5C]" />
                                        </div>
                                        <div className="text-3xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            {stats?.totalSubjects || subjects.length}
                                        </div>
                                        <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] mt-0.5">
                                            Curriculum courses
                                        </p>
                                    </div>

                                    <div
                                        onClick={() => setActiveTab("moderation")}
                                        className="cursor-pointer bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#C89D5C] rounded-3xl p-5 shadow-xs transition"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-[#8C7862] dark:text-[#A8957E] uppercase tracking-wider">
                                                Moderation Queue
                                            </span>
                                            <FaClock className={totalPendingCount > 0 ? "text-amber-500" : "text-[#8C7862]"} />
                                        </div>
                                        <div className="text-3xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            {totalPendingCount}
                                        </div>
                                        <p className="text-[11px] text-[#8C7862] dark:text-[#A8957E] mt-0.5">
                                            Pending student uploads
                                        </p>
                                    </div>
                                </div>

                                {/* Aggregations Grid: Papers by University & Course */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Breakdown: Papers by University */}
                                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 shadow-xs">
                                        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EAE2D8] dark:border-[#2E2822]">
                                            <h3 className="font-serif font-bold text-base text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                Papers by University
                                            </h3>
                                            <FaUniversity className="text-[#C89D5C] text-sm" />
                                        </div>
                                        {stats?.papersByUniversity?.length ? (
                                            <div className="space-y-3">
                                                {stats.papersByUniversity.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs">
                                                        <span className="font-medium text-[#4A3E31] dark:text-[#C2B3A0] truncate max-w-[240px]">
                                                            {item._id || "Unspecified"}
                                                        </span>
                                                        <span className="px-3 py-1 bg-[#F4EFEA] dark:bg-[#24201C] font-bold text-[#0D1B2A] dark:text-[#FAF8F5] rounded-full">
                                                            {item.count} papers
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-[#8C7862]">No papers uploaded yet.</p>
                                        )}
                                    </div>

                                    {/* Breakdown: Papers by Course */}
                                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 shadow-xs">
                                        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EAE2D8] dark:border-[#2E2822]">
                                            <h3 className="font-serif font-bold text-base text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                Papers by Course / Program
                                            </h3>
                                            <FaGraduationCap className="text-[#C89D5C] text-sm" />
                                        </div>
                                        {stats?.papersByCourse?.length ? (
                                            <div className="space-y-3">
                                                {stats.papersByCourse.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs">
                                                        <span className="font-medium text-[#4A3E31] dark:text-[#C2B3A0] truncate max-w-[240px]">
                                                            {item._id || "General"}
                                                        </span>
                                                        <span className="px-3 py-1 bg-[#F4EFEA] dark:bg-[#24201C] font-bold text-[#0D1B2A] dark:text-[#FAF8F5] rounded-full">
                                                            {item.count} papers
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-[#8C7862]">No course data yet.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Recent Additions Feed */}
                                <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 shadow-xs">
                                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EAE2D8] dark:border-[#2E2822]">
                                        <div>
                                            <h3 className="font-serif font-bold text-base text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                Recently Uploaded Question Papers
                                            </h3>
                                            <p className="text-xs text-[#8C7862]">Live stream of latest submissions</p>
                                        </div>
                                        <button
                                            onClick={() => setActiveTab("papers")}
                                            className="text-xs font-bold text-[#C89D5C] hover:underline"
                                        >
                                            View All ↗
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-[#EAE2D8] dark:border-[#2E2822] text-[#8C7862]">
                                                    <th className="pb-3 font-semibold">Title</th>
                                                    <th className="pb-3 font-semibold">University</th>
                                                    <th className="pb-3 font-semibold">Course</th>
                                                    <th className="pb-3 font-semibold">Semester</th>
                                                    <th className="pb-3 font-semibold">Status</th>
                                                    <th className="pb-3 font-semibold text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#EAE2D8] dark:divide-[#2E2822]">
                                                {papers.slice(0, 5).map((p) => (
                                                    <tr key={p._id} className="hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916]">
                                                        <td className="py-3 font-medium text-[#0D1B2A] dark:text-[#FAF8F5] max-w-xs truncate">
                                                            {p.title}
                                                        </td>
                                                        <td className="py-3 text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            {p.universityId?.name || p.university || "—"}
                                                        </td>
                                                        <td className="py-3 text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            {p.courseId?.name || p.course || "—"}
                                                        </td>
                                                        <td className="py-3 text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            Sem {p.semester || 1}
                                                        </td>
                                                        <td className="py-3">
                                                            <span
                                                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                                    p.status === "approved"
                                                                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                                                        : p.status === "rejected"
                                                                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                                                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                                                }`}
                                                            >
                                                                {p.status || "approved"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            <button
                                                                onClick={() => setPreviewPdf(p)}
                                                                className="px-3 py-1 bg-[#F4EFEA] dark:bg-[#24201C] hover:bg-[#EAE2D8] text-[#0D1B2A] dark:text-[#FAF8F5] rounded-full text-[11px] font-semibold transition"
                                                            >
                                                                Preview
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════
                            2. UNIVERSITIES TAB
                        ═══════════════════════════════════════════════════════ */}
                        {activeTab === "universities" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 shadow-xs">
                                    <div>
                                        <h2 className="text-xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            University Management
                                        </h2>
                                        <p className="text-xs text-[#8C7862]">
                                            Manage institutions, affiliated colleges, codes, and locations
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleOpenAddUni}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] rounded-full text-xs font-bold shadow-sm transition"
                                    >
                                        <FaPlus /> Add University
                                    </button>
                                </div>

                                {/* Filters */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <FaSearch className="absolute left-4 top-3 text-[#A8957E] text-xs" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search university by name, code, or city..."
                                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                        />
                                    </div>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="active">Active Only</option>
                                        <option value="inactive">Inactive Only</option>
                                    </select>
                                </div>

                                {/* Universities Cards Grid */}
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {filteredUniversities.map((uni) => (
                                        <div
                                            key={uni._id}
                                            className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] hover:border-[#C89D5C] rounded-3xl p-6 shadow-xs flex flex-col justify-between transition"
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="px-3 py-1 rounded-full bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378] font-mono text-xs font-bold">
                                                        {uni.code}
                                                    </span>
                                                    <button
                                                        onClick={() => handleToggleUniStatus(uni)}
                                                        className={`text-lg transition ${
                                                            uni.status === "active" ? "text-emerald-500" : "text-stone-400"
                                                        }`}
                                                        title="Toggle Active Status"
                                                    >
                                                        {uni.status === "active" ? <FaToggleOn /> : <FaToggleOff />}
                                                    </button>
                                                </div>

                                                <h3 className="font-serif font-bold text-lg text-[#0D1B2A] dark:text-[#FAF8F5] mb-1.5">
                                                    {uni.name}
                                                </h3>

                                                <div className="flex items-center gap-3 text-xs text-[#8C7862] dark:text-[#A8957E] mb-4">
                                                    <span className="flex items-center gap-1">
                                                        <FaMapMarkerAlt className="text-[10px]" />
                                                        {uni.location || "India"}, {uni.state}
                                                    </span>
                                                    {uni.website && (
                                                        <a
                                                            href={uni.website}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="hover:text-[#C89D5C] flex items-center gap-1"
                                                        >
                                                            <FaGlobe className="text-[10px]" /> Web ↗
                                                        </a>
                                                    )}
                                                </div>

                                                {uni.description && (
                                                    <p className="text-xs text-[#6B5B49] dark:text-[#C2B3A0] line-clamp-2 mb-4 leading-relaxed">
                                                        {uni.description}
                                                    </p>
                                                )}

                                                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#EAE2D8] dark:border-[#2E2822] text-center mb-4">
                                                    <div>
                                                        <div className="font-serif font-bold text-sm text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                            {uni.coursesCount || 0}
                                                        </div>
                                                        <div className="text-[10px] text-[#8C7862]">Courses</div>
                                                    </div>
                                                    <div>
                                                        <div className="font-serif font-bold text-sm text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                            {uni.papersCount || 0}
                                                        </div>
                                                        <div className="text-[10px] text-[#8C7862]">Papers</div>
                                                    </div>
                                                    <div>
                                                        <div className="font-serif font-bold text-sm text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                            {uni.notesCount || 0}
                                                        </div>
                                                        <div className="text-[10px] text-[#8C7862]">Notes</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                                <button
                                                    onClick={() => handleOpenEditUni(uni)}
                                                    className="p-2 text-[#4A3E31] dark:text-[#C2B3A0] hover:text-[#0D1B2A] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] rounded-full transition"
                                                    title="Edit University"
                                                >
                                                    <FaEdit className="text-xs" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUni(uni)}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition"
                                                    title="Delete University"
                                                >
                                                    <FaTrash className="text-xs" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════
                            3. COURSES TAB
                        ═══════════════════════════════════════════════════════ */}
                        {activeTab === "courses" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 shadow-xs">
                                    <div>
                                        <h2 className="text-xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            Course & Program Management
                                        </h2>
                                        <p className="text-xs text-[#8C7862]">
                                            Configure dynamic degrees, durations, and semester limits (1..12)
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleOpenAddCourse}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] rounded-full text-xs font-bold shadow-sm transition"
                                    >
                                        <FaPlus /> Add Course
                                    </button>
                                </div>

                                {/* Filters */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <FaSearch className="absolute left-4 top-3 text-[#A8957E] text-xs" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search course by name or code..."
                                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                        />
                                    </div>
                                    <select
                                        value={selectedUniFilter}
                                        onChange={(e) => setSelectedUniFilter(e.target.value)}
                                        className="px-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="all">All Universities</option>
                                        {universities.map((u) => (
                                            <option key={u._id} value={u._id}>
                                                {u.name} ({u.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Course List Table */}
                                <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-[#FAF8F5] dark:bg-[#1C1916] border-b border-[#EAE2D8] dark:border-[#2E2822] text-[#8C7862]">
                                                    <th className="p-4 font-semibold">Course / Program</th>
                                                    <th className="p-4 font-semibold">Code</th>
                                                    <th className="p-4 font-semibold">University</th>
                                                    <th className="p-4 font-semibold">Degree Type</th>
                                                    <th className="p-4 font-semibold">Semesters</th>
                                                    <th className="p-4 font-semibold">Subjects</th>
                                                    <th className="p-4 font-semibold">Papers</th>
                                                    <th className="p-4 font-semibold text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#EAE2D8] dark:divide-[#2E2822]">
                                                {filteredCourses.map((c) => (
                                                    <tr key={c._id} className="hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916]">
                                                        <td className="p-4 font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                            {c.name}
                                                        </td>
                                                        <td className="p-4 font-mono font-bold text-[#8C6239] dark:text-[#E5C378]">
                                                            {c.code}
                                                        </td>
                                                        <td className="p-4 text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            {c.universityId?.name || "—"}
                                                        </td>
                                                        <td className="p-4 text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            <span className="px-2.5 py-0.5 rounded-full bg-[#F4EFEA] dark:bg-[#24201C] text-[10px] font-semibold">
                                                                {c.degreeType || "Undergraduate"}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 font-semibold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                            {c.numberOfSemesters || 8} Semesters
                                                        </td>
                                                        <td className="p-4 font-semibold text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            {c.subjectsCount || 0}
                                                        </td>
                                                        <td className="p-4 font-semibold text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            {c.papersCount || 0}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleOpenEditCourse(c)}
                                                                    className="p-1.5 text-[#4A3E31] dark:text-[#C2B3A0] hover:text-[#0D1B2A] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] rounded-full transition"
                                                                >
                                                                    <FaEdit className="text-xs" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteCourse(c)}
                                                                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition"
                                                                >
                                                                    <FaTrash className="text-xs" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════
                            4. SUBJECTS TAB
                        ═══════════════════════════════════════════════════════ */}
                        {activeTab === "subjects" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 shadow-xs">
                                    <div>
                                        <h2 className="text-xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            Subject & Curriculum Management
                                        </h2>
                                        <p className="text-xs text-[#8C7862]">
                                            Manage semester subjects, subject codes, and course curricula
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleOpenAddSubject}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] rounded-full text-xs font-bold shadow-sm transition"
                                    >
                                        <FaPlus /> Add Subject
                                    </button>
                                </div>

                                {/* Filters */}
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <div className="relative">
                                        <FaSearch className="absolute left-4 top-3 text-[#A8957E] text-xs" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search subject or code..."
                                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                        />
                                    </div>
                                    <select
                                        value={selectedUniFilter}
                                        onChange={(e) => setSelectedUniFilter(e.target.value)}
                                        className="px-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="all">All Universities</option>
                                        {universities.map((u) => (
                                            <option key={u._id} value={u._id}>
                                                {u.name}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedCourseFilter}
                                        onChange={(e) => setSelectedCourseFilter(e.target.value)}
                                        className="px-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="all">All Courses</option>
                                        {courses.map((c) => (
                                            <option key={c._id} value={c._id}>
                                                {c.name} ({c.code})
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedSemFilter}
                                        onChange={(e) => setSelectedSemFilter(e.target.value)}
                                        className="px-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="all">All Semesters</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => (
                                            <option key={s} value={s}>
                                                Semester {s}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Subjects Table */}
                                <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-[#FAF8F5] dark:bg-[#1C1916] border-b border-[#EAE2D8] dark:border-[#2E2822] text-[#8C7862]">
                                                    <th className="p-4 font-semibold">Subject Name</th>
                                                    <th className="p-4 font-semibold">Code</th>
                                                    <th className="p-4 font-semibold">Course</th>
                                                    <th className="p-4 font-semibold">Semester</th>
                                                    <th className="p-4 font-semibold">Papers</th>
                                                    <th className="p-4 font-semibold text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#EAE2D8] dark:divide-[#2E2822]">
                                                {filteredSubjects.map((sub) => (
                                                    <tr key={sub._id} className="hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916]">
                                                        <td className="p-4 font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                            {sub.name}
                                                        </td>
                                                        <td className="p-4 font-mono font-bold text-[#8C6239] dark:text-[#E5C378]">
                                                            {sub.code}
                                                        </td>
                                                        <td className="p-4 text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            {sub.courseId?.name || "—"}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="px-2.5 py-0.5 rounded-full bg-[#F4EFEA] dark:bg-[#24201C] text-[10px] font-semibold text-[#8C6239] dark:text-[#E5C378]">
                                                                Sem {sub.semesterNumber || 1}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 font-semibold text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            {sub.papersCount || 0}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleOpenEditSubject(sub)}
                                                                    className="p-1.5 text-[#4A3E31] dark:text-[#C2B3A0] hover:text-[#0D1B2A] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] rounded-full transition"
                                                                >
                                                                    <FaEdit className="text-xs" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteSubject(sub)}
                                                                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition"
                                                                >
                                                                    <FaTrash className="text-xs" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════
                            5. MODERATION QUEUE TAB
                        ═══════════════════════════════════════════════════════ */}
                        {activeTab === "moderation" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 shadow-xs">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                                            <h2 className="text-xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                Submissions Moderation Queue
                                            </h2>
                                        </div>
                                        <p className="text-xs text-[#8C7862]">
                                            {totalPendingCount} items awaiting verification and approval
                                        </p>
                                    </div>

                                    {/* Sub Filter */}
                                    <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F5] dark:bg-[#1C1916] rounded-full border border-[#EAE2D8] dark:border-[#2E2822]">
                                        <button
                                            onClick={() => setModerationFilter("all")}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                                                moderationFilter === "all"
                                                    ? "bg-[#0D1B2A] text-white dark:bg-[#C89D5C] dark:text-[#0D1B2A]"
                                                    : "text-[#6B5B49] dark:text-[#C2B3A0]"
                                            }`}
                                        >
                                            All ({totalPendingCount})
                                        </button>
                                        <button
                                            onClick={() => setModerationFilter("pyq")}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                                                moderationFilter === "pyq"
                                                    ? "bg-[#0D1B2A] text-white dark:bg-[#C89D5C] dark:text-[#0D1B2A]"
                                                    : "text-[#6B5B49] dark:text-[#C2B3A0]"
                                            }`}
                                        >
                                            Papers ({pendingPapers.length})
                                        </button>
                                        <button
                                            onClick={() => setModerationFilter("note")}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                                                moderationFilter === "note"
                                                    ? "bg-[#0D1B2A] text-white dark:bg-[#C89D5C] dark:text-[#0D1B2A]"
                                                    : "text-[#6B5B49] dark:text-[#C2B3A0]"
                                            }`}
                                        >
                                            Notes ({pendingNotes.length})
                                        </button>
                                    </div>
                                </div>

                                {totalPendingCount === 0 ? (
                                    <div className="text-center py-16 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-8">
                                        <FaCheckCircle className="text-4xl text-emerald-500 mx-auto mb-3" />
                                        <h3 className="font-serif font-bold text-lg text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            Moderation Queue is Clean!
                                        </h3>
                                        <p className="text-xs text-[#8C7862] mt-1">
                                            All student uploads have been verified and approved.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Pending Papers */}
                                        {(moderationFilter === "all" || moderationFilter === "pyq") &&
                                            pendingPapers.map((paper) => (
                                                <div
                                                    key={paper._id}
                                                    className="bg-white dark:bg-[#161412] border border-amber-500/30 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-start gap-3.5">
                                                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0 border border-amber-500/20">
                                                            <FaFilePdf />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F4EFEA] dark:bg-[#24201C] text-[#8C6239] dark:text-[#E5C378]">
                                                                    PYQ
                                                                </span>
                                                                <span className="font-serif font-bold text-sm text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                                    {paper.title}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-[#8C7862] mt-1">
                                                                {paper.universityId?.name || paper.university} • {paper.courseId?.name || paper.course} • Sem {paper.semester} • {paper.examType} ({paper.academicYear || paper.year})
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 self-end md:self-center">
                                                        <button
                                                            onClick={() => setPreviewPdf(paper)}
                                                            className="px-3 py-1.5 bg-[#FAF8F5] dark:bg-[#24201C] text-[#0D1B2A] dark:text-[#FAF8F5] rounded-full text-xs font-semibold border border-[#EAE2D8] dark:border-[#2E2822] hover:bg-[#F4EFEA]"
                                                        >
                                                            <FaEye className="inline mr-1" /> Preview
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprovePaper(paper._id)}
                                                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold shadow-xs flex items-center gap-1"
                                                        >
                                                            <FaCheck /> Approve
                                                        </button>
                                                        <button
                                                            onClick={() => setRejectTarget({ type: "pyq", item: paper })}
                                                            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold shadow-xs flex items-center gap-1"
                                                        >
                                                            <FaTimes /> Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                        {/* Pending Notes */}
                                        {(moderationFilter === "all" || moderationFilter === "note") &&
                                            pendingNotes.map((note) => (
                                                <div
                                                    key={note._id}
                                                    className="bg-white dark:bg-[#161412] border border-amber-500/30 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-start gap-3.5">
                                                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0 border border-emerald-500/20">
                                                            <FaStickyNote />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                                                    NOTE
                                                                </span>
                                                                <span className="font-serif font-bold text-sm text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                                    {note.title}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-[#8C7862] mt-1">
                                                                {note.subject} • {note.unit} • {note.course} • Sem {note.semester} • Author: {note.author || "Student"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 self-end md:self-center">
                                                        <button
                                                            onClick={() => setPreviewPdf(note)}
                                                            className="px-3 py-1.5 bg-[#FAF8F5] dark:bg-[#24201C] text-[#0D1B2A] dark:text-[#FAF8F5] rounded-full text-xs font-semibold border border-[#EAE2D8] dark:border-[#2E2822] hover:bg-[#F4EFEA]"
                                                        >
                                                            <FaEye className="inline mr-1" /> Preview
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproveNote(note._id)}
                                                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold shadow-xs flex items-center gap-1"
                                                        >
                                                            <FaCheck /> Approve
                                                        </button>
                                                        <button
                                                            onClick={() => setRejectTarget({ type: "note", item: note })}
                                                            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold shadow-xs flex items-center gap-1"
                                                        >
                                                            <FaTimes /> Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════
                            6. ALL PAPERS TAB
                        ═══════════════════════════════════════════════════════ */}
                        {activeTab === "papers" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 shadow-xs">
                                    <div>
                                        <h2 className="text-xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                            Question Papers Repository
                                        </h2>
                                        <p className="text-xs text-[#8C7862]">
                                            Total {papers.length} question papers indexed
                                        </p>
                                    </div>
                                    <Link
                                        to="/upload"
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] rounded-full text-xs font-bold shadow-sm transition"
                                    >
                                        <FaPlus /> Upload New Paper
                                    </Link>
                                </div>

                                {/* Filters */}
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <div className="relative">
                                        <FaSearch className="absolute left-4 top-3 text-[#A8957E] text-xs" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search title, subject..."
                                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                        />
                                    </div>
                                    <select
                                        value={selectedUniFilter}
                                        onChange={(e) => setSelectedUniFilter(e.target.value)}
                                        className="px-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="all">All Universities</option>
                                        {universities.map((u) => (
                                            <option key={u._id} value={u._id}>
                                                {u.name}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedCourseFilter}
                                        onChange={(e) => setSelectedCourseFilter(e.target.value)}
                                        className="px-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="all">All Courses</option>
                                        {courses.map((c) => (
                                            <option key={c._id} value={c._id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-4 py-2 bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="approved">Approved</option>
                                        <option value="pending">Pending</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>

                                {/* Table */}
                                <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-[#FAF8F5] dark:bg-[#1C1916] border-b border-[#EAE2D8] dark:border-[#2E2822] text-[#8C7862]">
                                                    <th className="p-4 font-semibold">Paper Title</th>
                                                    <th className="p-4 font-semibold">University</th>
                                                    <th className="p-4 font-semibold">Course</th>
                                                    <th className="p-4 font-semibold">Semester</th>
                                                    <th className="p-4 font-semibold">Type</th>
                                                    <th className="p-4 font-semibold">Year</th>
                                                    <th className="p-4 font-semibold">Status</th>
                                                    <th className="p-4 font-semibold text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#EAE2D8] dark:divide-[#2E2822]">
                                                {filteredPapers.map((p) => (
                                                    <tr key={p._id} className="hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916]">
                                                        <td className="p-4 font-bold text-[#0D1B2A] dark:text-[#FAF8F5] max-w-xs truncate">
                                                            {p.title}
                                                        </td>
                                                        <td className="p-4 text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            {p.universityId?.name || p.university || "—"}
                                                        </td>
                                                        <td className="p-4 text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            {p.courseId?.name || p.course || "—"}
                                                        </td>
                                                        <td className="p-4 text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            Sem {p.semester || 1}
                                                        </td>
                                                        <td className="p-4 text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            {p.examType || "End Semester"}
                                                        </td>
                                                        <td className="p-4 font-mono font-semibold text-[#8C6239] dark:text-[#E5C378]">
                                                            {p.academicYear || p.year}
                                                        </td>
                                                        <td className="p-4">
                                                            <span
                                                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                                    p.status === "approved"
                                                                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                                                        : p.status === "rejected"
                                                                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                                                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                                                }`}
                                                            >
                                                                {p.status || "approved"}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => handleOpenEditPaper(p)}
                                                                    className="p-1.5 text-[#8C6239] dark:text-[#E5C378] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] rounded-full transition cursor-pointer"
                                                                    title="Edit Question Paper"
                                                                >
                                                                    <FaEdit className="text-xs" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setPreviewPdf(p)}
                                                                    className="p-1.5 text-[#4A3E31] dark:text-[#C2B3A0] hover:text-[#0D1B2A] hover:bg-[#F4EFEA] dark:hover:bg-[#24201C] rounded-full transition cursor-pointer"
                                                                    title="Preview Paper"
                                                                >
                                                                    <FaEye className="text-xs" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeletePaper(p._id)}
                                                                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition cursor-pointer"
                                                                    title="Delete Paper"
                                                                >
                                                                    <FaTrash className="text-xs" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════
                            7. USERS DIRECTORY TAB
                        ═══════════════════════════════════════════════════════ */}
                        {activeTab === "users" && (
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl p-6 shadow-xs">
                                    <h2 className="text-xl font-serif font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                        Registered Users & Contributors
                                    </h2>
                                    <p className="text-xs text-[#8C7862] mt-0.5">
                                        Total {users.length} active registered student accounts
                                    </p>
                                </div>

                                <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-[#FAF8F5] dark:bg-[#1C1916] border-b border-[#EAE2D8] dark:border-[#2E2822] text-[#8C7862]">
                                                    <th className="p-4 font-semibold">User ID</th>
                                                    <th className="p-4 font-semibold">Paper Uploads</th>
                                                    <th className="p-4 font-semibold">Notes Uploads</th>
                                                    <th className="p-4 font-semibold">Total Contributions</th>
                                                    <th className="p-4 font-semibold">Joined At</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#EAE2D8] dark:divide-[#2E2822]">
                                                {users.map((u) => (
                                                    <tr key={u._id} className="hover:bg-[#FAF8F5] dark:hover:bg-[#1C1916]">
                                                        <td className="p-4 font-mono font-bold text-[#0D1B2A] dark:text-[#FAF8F5]">
                                                            {u.clerkId}
                                                        </td>
                                                        <td className="p-4 font-semibold text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            {u.pyqUploads || 0}
                                                        </td>
                                                        <td className="p-4 font-semibold text-[#6B5B49] dark:text-[#C2B3A0]">
                                                            {u.noteUploads || 0}
                                                        </td>
                                                        <td className="p-4 font-bold text-[#C89D5C]">
                                                            {u.totalUploads || 0}
                                                        </td>
                                                        <td className="p-4 text-[#8C7862]">
                                                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                                                        </td>
                                                    </tr>
                                                ))}
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

            {/* 1. UNIVERSITY ADD / EDIT MODAL */}
            {uniModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#EAE2D8] dark:border-[#2E2822]">
                            <h3 className="font-serif font-bold text-lg text-[#0D1B2A] dark:text-[#FAF8F5]">
                                {editingUni ? "Edit University" : "Add New University"}
                            </h3>
                            <button
                                onClick={() => setUniModalOpen(false)}
                                className="text-[#8C7862] hover:text-[#0D1B2A] dark:hover:text-white"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSaveUni} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                    University Full Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={uniForm.name}
                                    onChange={(e) => setUniForm({ ...uniForm, name: e.target.value })}
                                    placeholder="e.g. United University"
                                    className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Short Code / Acronym *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={uniForm.code}
                                        onChange={(e) => setUniForm({ ...uniForm, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. UU"
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs font-mono font-bold text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        City / Location
                                    </label>
                                    <input
                                        type="text"
                                        value={uniForm.location}
                                        onChange={(e) => setUniForm({ ...uniForm, location: e.target.value })}
                                        placeholder="e.g. Prayagraj"
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        State
                                    </label>
                                    <input
                                        type="text"
                                        value={uniForm.state}
                                        onChange={(e) => setUniForm({ ...uniForm, state: e.target.value })}
                                        placeholder="e.g. Uttar Pradesh"
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Official Website
                                    </label>
                                    <input
                                        type="url"
                                        value={uniForm.website}
                                        onChange={(e) => setUniForm({ ...uniForm, website: e.target.value })}
                                        placeholder="https://..."
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                    Description / Overview
                                </label>
                                <textarea
                                    rows={3}
                                    value={uniForm.description}
                                    onChange={(e) => setUniForm({ ...uniForm, description: e.target.value })}
                                    placeholder="Brief overview of the university..."
                                    className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-2xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                <button
                                    type="button"
                                    onClick={() => setUniModalOpen(false)}
                                    className="px-5 py-2 rounded-full border border-[#DDD2C4] dark:border-[#2E2822] text-xs font-semibold text-[#4A3E31] dark:text-[#C2B3A0]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-6 py-2 rounded-full bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold shadow-sm transition disabled:opacity-60"
                                >
                                    {actionLoading ? "Saving..." : "Save University"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. COURSE ADD / EDIT MODAL */}
            {courseModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#EAE2D8] dark:border-[#2E2822]">
                            <h3 className="font-serif font-bold text-lg text-[#0D1B2A] dark:text-[#FAF8F5]">
                                {editingCourse ? "Edit Course" : "Add New Course / Program"}
                            </h3>
                            <button
                                onClick={() => setCourseModalOpen(false)}
                                className="text-[#8C7862] hover:text-[#0D1B2A] dark:hover:text-white"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCourse} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                    Affiliated University *
                                </label>
                                <select
                                    required
                                    value={courseForm.universityId}
                                    onChange={(e) => setCourseForm({ ...courseForm, universityId: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                >
                                    <option value="">Select University</option>
                                    {universities.map((u) => (
                                        <option key={u._id} value={u._id}>
                                            {u.name} ({u.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

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
                                    className="px-5 py-2 rounded-full border border-[#DDD2C4] dark:border-[#2E2822] text-xs font-semibold text-[#4A3E31] dark:text-[#C2B3A0]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-6 py-2 rounded-full bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold shadow-sm transition disabled:opacity-60"
                                >
                                    {actionLoading ? "Saving..." : "Save Course"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. SUBJECT ADD / EDIT MODAL */}
            {subjectModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#EAE2D8] dark:border-[#2E2822]">
                            <h3 className="font-serif font-bold text-lg text-[#0D1B2A] dark:text-[#FAF8F5]">
                                {editingSubject ? "Edit Subject" : "Add New Subject"}
                            </h3>
                            <button
                                onClick={() => setSubjectModalOpen(false)}
                                className="text-[#8C7862] hover:text-[#0D1B2A] dark:hover:text-white"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSubject} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                    Target Course *
                                </label>
                                <select
                                    required
                                    value={subjectForm.courseId}
                                    onChange={(e) => handleSubjectCourseChange(e.target.value)}
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

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Semester *
                                    </label>
                                    <select
                                        required
                                        value={subjectForm.semesterId}
                                        onChange={(e) => setSubjectForm({ ...subjectForm, semesterId: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="">Select Semester</option>
                                        {subjectModalSemesters.map((sem) => (
                                            <option key={sem._id} value={sem._id}>
                                                {sem.name} (Sem {sem.number})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Subject Code *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={subjectForm.code}
                                        onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. BCS401"
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs font-mono font-bold text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                    Subject Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={subjectForm.name}
                                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                                    placeholder="e.g. Operating Systems"
                                    className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE2D8] dark:border-[#2E2822]">
                                <button
                                    type="button"
                                    onClick={() => setSubjectModalOpen(false)}
                                    className="px-5 py-2 rounded-full border border-[#DDD2C4] dark:border-[#2E2822] text-xs font-semibold text-[#4A3E31] dark:text-[#C2B3A0]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-6 py-2 rounded-full bg-[#0D1B2A] hover:bg-[#1E293B] dark:bg-[#C89D5C] dark:hover:bg-[#E5C378] text-[#FAF8F5] dark:text-[#0D1B2A] text-xs font-bold shadow-sm transition disabled:opacity-60"
                                >
                                    {actionLoading ? "Saving..." : "Save Subject"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 3.5. EDIT QUESTION PAPER MODAL */}
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
                            {/* Title */}
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

                            {/* University & Course */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        University
                                    </label>
                                    <select
                                        value={editPaperForm.universityId}
                                        onChange={(e) => {
                                            const uId = e.target.value;
                                            const u = universities.find((x) => x._id === uId);
                                            setEditPaperForm({
                                                ...editPaperForm,
                                                universityId: uId,
                                                university: u ? u.name : editPaperForm.university,
                                            });
                                        }}
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden"
                                    >
                                        <option value="">Select University</option>
                                        {universities.map((u) => (
                                            <option key={u._id} value={u._id}>
                                                {u.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Course / Program
                                    </label>
                                    <select
                                        value={editPaperForm.courseId}
                                        onChange={(e) => handleEditPaperCourseChange(e.target.value)}
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
                            </div>

                            {/* Semester & Subject */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Subject Name
                                    </label>
                                    <input
                                        type="text"
                                        value={editPaperForm.subject}
                                        onChange={(e) => setEditPaperForm({ ...editPaperForm, subject: e.target.value })}
                                        placeholder="e.g. Data Structures & Algorithms"
                                        className="w-full px-4 py-2 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-full text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-[#C89D5C]"
                                    />
                                </div>
                            </div>

                            {/* Exam Type, Academic Year, Status */}
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
                                        <option value="" disabled>Select Year</option>
                                        {ACADEMIC_YEARS.map((yr) => (
                                            <option key={yr} value={yr}>
                                                {yr}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#4A3E31] dark:text-[#C2B3A0] mb-1">
                                        Publication Status
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
                                    {actionLoading ? "Saving Changes..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 4. CASCADE DELETE SAFETY WARNING MODAL */}
            {cascadeWarning && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#161412] border-2 border-amber-500 rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
                            <FaExclamationTriangle className="text-2xl" />
                            <h3 className="font-serif font-bold text-lg text-[#0D1B2A] dark:text-[#FAF8F5]">
                                Cascade Deletion Warning
                            </h3>
                        </div>

                        <p className="text-xs text-[#4A3E31] dark:text-[#C2B3A0] leading-relaxed mb-4">
                            {cascadeWarning.message}
                        </p>

                        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 rounded-2xl text-xs space-y-1 mb-6 text-amber-900 dark:text-amber-200 font-medium">
                            <div>• Courses affected: {cascadeWarning.coursesCount || 0}</div>
                            <div>• Subjects affected: {cascadeWarning.subjectsCount || 0}</div>
                            <div>• Question Papers affected: {cascadeWarning.papersCount || 0}</div>
                            <div>• Study Notes affected: {cascadeWarning.notesCount || 0}</div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-end gap-2">
                            <button
                                onClick={() => setCascadeWarning(null)}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-[#DDD2C4] dark:border-[#2E2822] text-xs font-semibold text-[#4A3E31] dark:text-[#C2B3A0]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (cascadeWarning.type === "university") {
                                        handleToggleUniStatus(cascadeWarning.target);
                                        setCascadeWarning(null);
                                    }
                                }}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition"
                            >
                                Deactivate Instead (Safe)
                            </button>
                            <button
                                onClick={() => {
                                    if (cascadeWarning.type === "university") {
                                        handleDeleteUni(cascadeWarning.target, true);
                                    } else if (cascadeWarning.type === "course") {
                                        handleDeleteCourse(cascadeWarning.target, true);
                                    } else if (cascadeWarning.type === "subject") {
                                        handleDeleteSubject(cascadeWarning.target, true);
                                    }
                                }}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition"
                            >
                                Confirm Force Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. REJECT MODERATION REASON MODAL */}
            {rejectTarget && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#161412] border border-[#EAE2D8] dark:border-[#2E2822] rounded-3xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="font-serif font-bold text-base text-[#0D1B2A] dark:text-[#FAF8F5] mb-2">
                            Reject Submission
                        </h3>
                        <p className="text-xs text-[#8C7862] mb-4">
                            Provide feedback explaining why this document was declined:
                        </p>
                        <textarea
                            rows={3}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Blurred pages, incorrect subject, or incomplete question paper..."
                            className="w-full px-4 py-2.5 bg-[#FAF8F5] dark:bg-[#1C1916] border border-[#DDD2C4] dark:border-[#2E2822] rounded-2xl text-xs text-[#0D1B2A] dark:text-[#FAF8F5] focus:outline-hidden focus:border-rose-500 mb-4"
                        />
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => setRejectTarget(null)}
                                className="px-4 py-2 rounded-full border border-[#DDD2C4] dark:border-[#2E2822] text-xs font-semibold text-[#4A3E31] dark:text-[#C2B3A0]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmReject}
                                disabled={actionLoading}
                                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-60"
                            >
                                {actionLoading ? "Declining..." : "Confirm Decline"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. MODAL PDF VIEWER */}
            {previewPdf && (
                <PDFViewer
                    fileUrl={previewPdf.fileUrl}
                    title={previewPdf.title}
                    onClose={() => setPreviewPdf(null)}
                />
            )}

            {/* FOOTER */}
            <Footer />
        </div>
    );
}
