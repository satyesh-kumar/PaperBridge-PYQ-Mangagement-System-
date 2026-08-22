import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth, useUser } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FaShieldAlt,
    FaFilePdf,
    FaEye,
    FaTrash,
    FaEdit,
    FaSearch,
    FaTimes,
    FaCheck,
    FaUsers,
    FaDatabase,
    FaServer,
    FaFileCsv,
    FaGraduationCap,
    FaCalendarAlt,
    FaSpinner,
    FaPlus,
    FaSyncAlt,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
    FaBan,
    FaStickyNote,
    FaUniversity,
    FaUserGraduate,
    FaBook,
    FaLayerGroup,
} from "react-icons/fa";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import Navbar2 from "../components/Navbar2";
import PDFViewer from "../components/PDFViewer";
import { useIsAdmin } from "../hooks/useIsAdmin";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const COURSES = ["B.Tech", "MCA", "MBA", "BCA", "BBA", "Diploma", "Law", "Other"];
const EXAM_TYPES = [
    { label: "Mid Term 1", value: "mid1" },
    { label: "Mid Term 2", value: "mid2" },
    { label: "End Semester", value: "semester" },
    { label: "Makeup / Backlog", value: "makeup" },
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
];

function AdminPanel() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const { userEmail, adminEmails } = useIsAdmin();

    const [papers, setPapers] = useState([]);
    const [notes, setNotes] = useState([]);
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(false);

    // Active tab: 'moderation' | 'papers' | 'notes' | 'users' | 'system'
    const [activeTab, setActiveTab] = useState("moderation");
    // Moderation sub-filter: 'all' | 'pyq' | 'note'
    const [moderationFilter, setModerationFilter] = useState("all");

    // Search & Filter
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [courseFilter, setCourseFilter] = useState("All");

    // Selection
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Modals & Forms
    const [previewPdf, setPreviewPdf] = useState(null);

    // Edit PYQ Modal State
    const [editingPaper, setEditingPaper] = useState(null);
    const [editPaperForm, setEditPaperForm] = useState({
        title: "",
        course: "",
        semester: "",
        examType: "",
        year: "",
        branch: "",
        status: "approved",
    });

    // Edit Note Modal State
    const [editingNote, setEditingNote] = useState(null);
    const [editNoteForm, setEditNoteForm] = useState({
        title: "",
        subject: "",
        unit: "",
        university: "",
        course: "",
        semester: "",
        branch: "",
        author: "",
        description: "",
        status: "approved",
    });

    const [savingEdit, setSavingEdit] = useState(false);

    // Reject Modal State
    const [rejectingItem, setRejectingItem] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);

    // Delete Modal State
    const [deletingItem, setDeletingItem] = useState(null);
    const [deletingBulk, setDeletingBulk] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // System ping test
    const [pingLatency, setPingLatency] = useState(null);
    const [pinging, setPinging] = useState(false);

    // Fetch repository data
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const [papersRes, notesRes] = await Promise.all([
                axios.get(`${API_URL}/api/admin/pyqs`, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 15000,
                }).catch(() => axios.get(`${API_URL}/api/pyqs`)),
                axios.get(`${API_URL}/api/admin/notes`, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 15000,
                }).catch(() => axios.get(`${API_URL}/api/notes`)),
            ]);

            setPapers(Array.isArray(papersRes.data) ? papersRes.data : []);
            setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
        } catch (err) {
            console.error("Admin fetch data error:", err);
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    // Fetch admin statistics
    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const token = await getToken();
            const res = await axios.get(`${API_URL}/api/admin/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStats(res.data);
        } catch (err) {
            console.error("Admin stats fetch error:", err);
        } finally {
            setStatsLoading(false);
        }
    }, [getToken]);

    // Fetch user directory
    const fetchUsers = useCallback(async () => {
        setUsersLoading(true);
        try {
            const token = await getToken();
            const res = await axios.get(`${API_URL}/api/admin/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(res.data || []);
        } catch (err) {
            console.error("Admin users fetch error:", err);
        } finally {
            setUsersLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        fetchAllData();
        fetchStats();
    }, [fetchAllData, fetchStats]);

    useEffect(() => {
        if (activeTab === "users" && users.length === 0) {
            fetchUsers();
        }
    }, [activeTab, fetchUsers, users.length]);

    // Computed Moderation Queue
    const pendingItems = useMemo(() => {
        const pList = papers
            .filter((p) => p.status === "pending")
            .map((p) => ({ ...p, itemType: "pyq" }));
        const nList = notes
            .filter((n) => n.status === "pending")
            .map((n) => ({ ...n, itemType: "note" }));

        let combined = [...pList, ...nList];

        if (moderationFilter === "pyq") combined = pList;
        if (moderationFilter === "note") combined = nList;

        if (search.trim()) {
            const q = search.toLowerCase().trim();
            combined = combined.filter((i) => {
                return (
                    (i.title && i.title.toLowerCase().includes(q)) ||
                    (i.subject && i.subject.toLowerCase().includes(q)) ||
                    (i.course && i.course.toLowerCase().includes(q)) ||
                    (i.author && i.author.toLowerCase().includes(q))
                );
            });
        }

        return combined.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }, [papers, notes, moderationFilter, search]);

    // Filtered Papers for "All Papers" Tab
    const filteredPapers = useMemo(() => {
        return papers.filter((paper) => {
            const matchesSearch =
                !search ||
                (paper.title && paper.title.toLowerCase().includes(search.toLowerCase())) ||
                (paper.course && paper.course.toLowerCase().includes(search.toLowerCase())) ||
                (paper.branch && paper.branch.toLowerCase().includes(search.toLowerCase()));

            const matchesStatus =
                statusFilter === "All"
                    ? true
                    : statusFilter === "pending"
                    ? paper.status === "pending"
                    : statusFilter === "approved"
                    ? paper.status === "approved" || !paper.status
                    : paper.status === "rejected";

            const matchesCourse = courseFilter === "All" || paper.course === courseFilter;

            return matchesSearch && matchesStatus && matchesCourse;
        });
    }, [papers, search, statusFilter, courseFilter]);

    // Filtered Notes for "Notes Repository" Tab
    const filteredNotes = useMemo(() => {
        return notes.filter((note) => {
            const matchesSearch =
                !search ||
                (note.title && note.title.toLowerCase().includes(search.toLowerCase())) ||
                (note.subject && note.subject.toLowerCase().includes(search.toLowerCase())) ||
                (note.unit && note.unit.toLowerCase().includes(search.toLowerCase())) ||
                (note.university && note.university.toLowerCase().includes(search.toLowerCase())) ||
                (note.author && note.author.toLowerCase().includes(search.toLowerCase()));

            const matchesStatus =
                statusFilter === "All"
                    ? true
                    : statusFilter === "pending"
                    ? note.status === "pending"
                    : statusFilter === "approved"
                    ? note.status === "approved" || !note.status
                    : note.status === "rejected";

            const matchesCourse = courseFilter === "All" || note.course === courseFilter;

            return matchesSearch && matchesStatus && matchesCourse;
        });
    }, [notes, search, statusFilter, courseFilter]);

    // Current active list
    const currentList =
        activeTab === "moderation"
            ? pendingItems
            : activeTab === "papers"
            ? filteredPapers
            : filteredNotes;

    const totalPages = Math.ceil(currentList.length / pageSize) || 1;
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return currentList.slice(start, start + pageSize);
    }, [currentList, currentPage, pageSize]);

    // Selection Handlers
    const toggleSelectAll = () => {
        if (selectedIds.size === paginatedItems.length && paginatedItems.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedItems.map((p) => p._id)));
        }
    };

    const toggleSelectOne = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // ── 1-CLICK APPROVE ───────────────────────────────────────────────────────────
    const handleApproveItem = async (item, itemType) => {
        const type = itemType || (item.unit || item.subject ? "note" : "pyq");
        const endpoint = type === "note" ? `/api/admin/notes/${item._id}/status` : `/api/admin/pyqs/${item._id}/status`;

        const toastId = toast.loading(`Approving "${item.title}"...`);
        try {
            const token = await getToken();
            await axios.patch(
                `${API_URL}${endpoint}`,
                { status: "approved" },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (type === "note") {
                setNotes((prev) => prev.map((n) => (n._id === item._id ? { ...n, status: "approved" } : n)));
            } else {
                setPapers((prev) => prev.map((p) => (p._id === item._id ? { ...p, status: "approved" } : p)));
            }

            confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
            toast.success(`"${item.title}" approved & live! 🎉`, { id: toastId });
            fetchStats();
        } catch (err) {
            console.error("Approve error:", err);
            toast.error("Failed to approve item", { id: toastId });
        }
    };

    // ── REJECT MODAL CONFIRM ──────────────────────────────────────────────────────
    const confirmRejectItem = async () => {
        if (!rejectingItem) return;
        setIsRejecting(true);
        const type = rejectingItem.itemType || (rejectingItem.unit || rejectingItem.subject ? "note" : "pyq");
        const endpoint = type === "note" ? `/api/admin/notes/${rejectingItem._id}/status` : `/api/admin/pyqs/${rejectingItem._id}/status`;

        const toastId = toast.loading("Declining submission...");
        try {
            const token = await getToken();
            await axios.patch(
                `${API_URL}${endpoint}`,
                { status: "rejected", rejectionReason: rejectionReason.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (type === "note") {
                setNotes((prev) =>
                    prev.map((n) =>
                        n._id === rejectingItem._id
                            ? { ...n, status: "rejected", rejectionReason: rejectionReason.trim() }
                            : n
                    )
                );
            } else {
                setPapers((prev) =>
                    prev.map((p) =>
                        p._id === rejectingItem._id
                            ? { ...p, status: "rejected", rejectionReason: rejectionReason.trim() }
                            : p
                    )
                );
            }

            toast.success("Submission marked as rejected.", { id: toastId });
            setRejectingItem(null);
            setRejectionReason("");
            fetchStats();
        } catch (err) {
            console.error("Reject error:", err);
            toast.error("Failed to reject submission", { id: toastId });
        } finally {
            setIsRejecting(false);
        }
    };

    // ── BULK APPROVE ──────────────────────────────────────────────────────────────
    const handleBulkApprove = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        const toastId = toast.loading(`Approving ${ids.length} selected items...`);
        try {
            const token = await getToken();

            // Run bulk for papers and notes
            await Promise.all([
                axios.post(
                    `${API_URL}/api/admin/pyqs/bulk-status`,
                    { ids, status: "approved" },
                    { headers: { Authorization: `Bearer ${token}` } }
                ).catch(() => null),
                axios.post(
                    `${API_URL}/api/admin/notes/bulk-status`,
                    { ids, status: "approved" },
                    { headers: { Authorization: `Bearer ${token}` } }
                ).catch(() => null),
            ]);

            setPapers((prev) => prev.map((p) => (selectedIds.has(p._id) ? { ...p, status: "approved" } : p)));
            setNotes((prev) => prev.map((n) => (selectedIds.has(n._id) ? { ...n, status: "approved" } : n)));
            setSelectedIds(new Set());

            confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
            toast.success(`Successfully approved ${ids.length} items! 🎉`, { id: toastId });
            fetchStats();
        } catch (err) {
            console.error("Bulk approve error:", err);
            toast.error("Bulk approve failed", { id: toastId });
        }
    };

    // ── BULK REJECT ───────────────────────────────────────────────────────────────
    const handleBulkReject = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        const toastId = toast.loading(`Rejecting ${ids.length} items...`);
        try {
            const token = await getToken();
            await Promise.all([
                axios.post(
                    `${API_URL}/api/admin/pyqs/bulk-status`,
                    { ids, status: "rejected" },
                    { headers: { Authorization: `Bearer ${token}` } }
                ).catch(() => null),
                axios.post(
                    `${API_URL}/api/admin/notes/bulk-status`,
                    { ids, status: "rejected" },
                    { headers: { Authorization: `Bearer ${token}` } }
                ).catch(() => null),
            ]);

            setPapers((prev) => prev.map((p) => (selectedIds.has(p._id) ? { ...p, status: "rejected" } : p)));
            setNotes((prev) => prev.map((n) => (selectedIds.has(n._id) ? { ...n, status: "rejected" } : n)));
            setSelectedIds(new Set());

            toast.success(`Marked ${ids.length} items as rejected`, { id: toastId });
            fetchStats();
        } catch (err) {
            console.error("Bulk reject error:", err);
            toast.error("Bulk reject failed", { id: toastId });
        }
    };

    // ── DELETE CONFIRM ────────────────────────────────────────────────────────────
    const confirmDelete = async () => {
        setIsDeleting(true);
        const toastId = toast.loading(deletingBulk ? "Purging items..." : "Deleting item...");
        try {
            const token = await getToken();

            if (deletingBulk) {
                const ids = Array.from(selectedIds);
                await Promise.all([
                    axios.post(`${API_URL}/api/admin/pyqs/bulk-delete`, { ids }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
                    axios.post(`${API_URL}/api/admin/notes/bulk-delete`, { ids }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
                ]);

                setPapers((prev) => prev.filter((p) => !selectedIds.has(p._id)));
                setNotes((prev) => prev.filter((n) => !selectedIds.has(n._id)));
                setSelectedIds(new Set());
                toast.success(`Successfully purged ${ids.length} items!`, { id: toastId });
                setDeletingBulk(false);
            } else if (deletingItem) {
                const type = deletingItem.unit || deletingItem.subject ? "note" : "pyq";
                const endpoint = type === "note" ? `/api/notes/${deletingItem._id}` : `/api/pyqs/${deletingItem._id}`;

                await axios.delete(`${API_URL}${endpoint}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (type === "note") {
                    setNotes((prev) => prev.filter((n) => n._id !== deletingItem._id));
                } else {
                    setPapers((prev) => prev.filter((p) => p._id !== deletingItem._id));
                }

                toast.success(`Deleted "${deletingItem.title}"`, { id: toastId });
                setDeletingItem(null);
            }
            fetchStats();
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Failed to delete", { id: toastId });
        } finally {
            setIsDeleting(false);
        }
    };

    // ── EDIT METADATA HANDLERS ───────────────────────────────────────────────────
    const handleOpenEdit = (item) => {
        const isNote = item.unit !== undefined || item.subject !== undefined;
        if (isNote) {
            setEditingNote(item);
            setEditNoteForm({
                title: item.title || "",
                subject: item.subject || "",
                unit: item.unit || "Unit 1",
                university: item.university || "Uttaranchal University",
                course: item.course || "B.Tech",
                semester: String(item.semester || 1),
                branch: item.branch || "",
                author: item.author || "",
                description: item.description || "",
                status: item.status || "approved",
            });
        } else {
            setEditingPaper(item);
            setEditPaperForm({
                title: item.title || "",
                course: item.course || "B.Tech",
                semester: String(item.semester || 1),
                examType: item.examType || "semester",
                year: String(item.year || new Date().getFullYear()),
                branch: item.branch || "",
                status: item.status || "approved",
            });
        }
    };

    const handleSavePaperEdit = async (e) => {
        e.preventDefault();
        setSavingEdit(true);
        const toastId = toast.loading("Saving paper changes...");
        try {
            const token = await getToken();
            const res = await axios.put(`${API_URL}/api/pyqs/${editingPaper._id}`, editPaperForm, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setPapers((prev) => prev.map((p) => (p._id === editingPaper._id ? { ...p, ...res.data } : p)));
            toast.success("Paper updated successfully!", { id: toastId });
            setEditingPaper(null);
            fetchStats();
        } catch (err) {
            console.error("Edit paper error:", err);
            toast.error("Failed to update paper", { id: toastId });
        } finally {
            setSavingEdit(false);
        }
    };

    const handleSaveNoteEdit = async (e) => {
        e.preventDefault();
        setSavingEdit(true);
        const toastId = toast.loading("Saving study notes changes...");
        try {
            const token = await getToken();
            const res = await axios.put(`${API_URL}/api/notes/${editingNote._id}`, editNoteForm, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotes((prev) => prev.map((n) => (n._id === editingNote._id ? { ...n, ...res.data } : n)));
            toast.success("Study note updated successfully!", { id: toastId });
            setEditingNote(null);
            fetchStats();
        } catch (err) {
            console.error("Edit note error:", err);
            toast.error("Failed to update study note", { id: toastId });
        } finally {
            setSavingEdit(false);
        }
    };

    // Export to CSV
    const handleExportCSV = () => {
        const targetList = selectedIds.size > 0
            ? currentList.filter((i) => selectedIds.has(i._id))
            : currentList;

        if (targetList.length === 0) {
            toast.error("No records available to export");
            return;
        }

        const isNotesTab = activeTab === "notes";
        const headers = isNotesTab
            ? ["ID", "Title", "Subject", "Unit", "University", "Course", "Semester", "Author", "Status", "File URL", "Created At"]
            : ["ID", "Title", "Course", "Semester", "Exam Type", "Year", "Branch", "Status", "File URL", "Created At"];

        const rows = targetList.map((item) => {
            if (isNotesTab) {
                return [
                    `"${item._id}"`,
                    `"${(item.title || "").replace(/"/g, '""')}"`,
                    `"${item.subject || ""}"`,
                    `"${item.unit || ""}"`,
                    `"${item.university || ""}"`,
                    `"${item.course || ""}"`,
                    `"${item.semester || ""}"`,
                    `"${item.author || ""}"`,
                    `"${item.status || "approved"}"`,
                    `"${item.fileUrl || ""}"`,
                    `"${item.createdAt || ""}"`,
                ];
            }
            return [
                `"${item._id}"`,
                `"${(item.title || "").replace(/"/g, '""')}"`,
                `"${item.course || ""}"`,
                `"${item.semester || ""}"`,
                `"${item.examType || ""}"`,
                `"${item.year || ""}"`,
                `"${item.branch || ""}"`,
                `"${item.status || "approved"}"`,
                `"${item.fileUrl || ""}"`,
                `"${item.createdAt || ""}"`,
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `PaperBridge_${activeTab}_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported ${targetList.length} records to CSV!`);
    };

    // System Ping
    const handleTestPing = async () => {
        setPinging(true);
        const t0 = performance.now();
        try {
            await axios.get(`${API_URL}/`, { timeout: 8000 });
            const t1 = performance.now();
            setPingLatency(Math.round(t1 - t0));
            toast.success(`Backend live (${Math.round(t1 - t0)}ms)`);
        } catch {
            setPingLatency(-1);
            toast.error("Backend unresponsive");
        } finally {
            setPinging(false);
        }
    };

    // Status Badge Helper
    const renderStatusBadge = (status) => {
        if (status === "pending") {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Pending Review
                </span>
            );
        }
        if (status === "rejected") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    <FaTimesCircle className="text-[10px]" /> Rejected
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <FaCheckCircle className="text-[10px]" /> Approved
            </span>
        );
    };

    const totalPendingCount =
        papers.filter((p) => p.status === "pending").length +
        notes.filter((n) => n.status === "pending").length;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300">
            <Navbar2 />

            {/* TOP ADMIN EXECUTIVE BAR */}
            <div className="bg-white/80 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-5 sticky top-16 z-30">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Title & Badge */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-lg shadow-lg shadow-indigo-500/20">
                            <FaShieldAlt />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    PaperBridge Admin Console
                                </h1>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                                    Active Root
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Logged in as: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{userEmail}</span>
                            </p>
                        </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            onClick={handleExportCSV}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        >
                            <FaFileCsv className="text-emerald-600 dark:text-emerald-400" /> Export CSV
                        </button>

                        <button
                            onClick={() => {
                                fetchAllData();
                                fetchStats();
                                toast.success("Repository refreshed!");
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        >
                            <FaSyncAlt className="text-indigo-600 dark:text-indigo-400" /> Refresh
                        </button>

                        <Link
                            to="/upload"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                        >
                            <FaPlus className="text-xs" /> Upload Material
                        </Link>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT WRAPPER */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
                {/* EXECUTIVE METRICS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    {/* Metric 1: Moderation Queue */}
                    <div
                        onClick={() => setActiveTab("moderation")}
                        className={`cursor-pointer rounded-2xl p-5 relative overflow-hidden transition shadow-sm border ${
                            totalPendingCount > 0
                                ? "bg-amber-500/10 border-amber-500/40 hover:border-amber-500"
                                : "bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/50"
                        }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                {totalPendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                                Pending Moderation
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-bold">
                                <FaClock />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
                            {totalPendingCount}
                            {totalPendingCount > 0 && (
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Needs Action</span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">PYQs & Study Notes pending review</p>
                    </div>

                    {/* Metric 2: Live PYQs */}
                    <div
                        onClick={() => setActiveTab("papers")}
                        className="cursor-pointer bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-500/50 transition shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Live PYQ Vault
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm">
                                <FaFilePdf />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {papers.length}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Exam question papers</p>
                    </div>

                    {/* Metric 3: Live Notes */}
                    <div
                        onClick={() => setActiveTab("notes")}
                        className="cursor-pointer bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Live Study Notes
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">
                                <FaStickyNote />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {notes.length}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Unit summaries & lecture slides</p>
                    </div>

                    {/* Metric 4: Registered Users */}
                    <div
                        onClick={() => setActiveTab("users")}
                        className="cursor-pointer bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/50 transition shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Registered Users
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm">
                                <FaUsers />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {stats?.totalUsers ?? (statsLoading ? "..." : 1)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Student & faculty accounts</p>
                    </div>
                </div>

                {/* TAB SWITCHER */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 overflow-x-auto">
                    {/* Tab 1: Moderation Queue */}
                    <button
                        onClick={() => {
                            setActiveTab("moderation");
                            setCurrentPage(1);
                            setSelectedIds(new Set());
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                            activeTab === "moderation"
                                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <FaClock /> Moderation Queue
                        {totalPendingCount > 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                activeTab === "moderation" ? "bg-black/30 text-white" : "bg-amber-500 text-white"
                            }`}>
                                {totalPendingCount}
                            </span>
                        )}
                    </button>

                    {/* Tab 2: All PYQs */}
                    <button
                        onClick={() => {
                            setActiveTab("papers");
                            setCurrentPage(1);
                            setSelectedIds(new Set());
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                            activeTab === "papers"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <FaFilePdf /> PYQ Papers ({papers.length})
                    </button>

                    {/* Tab 3: All Notes */}
                    <button
                        onClick={() => {
                            setActiveTab("notes");
                            setCurrentPage(1);
                            setSelectedIds(new Set());
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                            activeTab === "notes"
                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <FaStickyNote /> Study Notes ({notes.length})
                    </button>

                    {/* Tab 4: Users */}
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                            activeTab === "users"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <FaUsers /> User Directory
                    </button>

                    {/* Tab 5: System */}
                    <button
                        onClick={() => setActiveTab("system")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                            activeTab === "system"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <FaServer /> System Health
                    </button>
                </div>

                {/* ── TAB 1, 2, 3: DATA TABLES (MODERATION, PYQS, NOTES) ───────────────── */}
                {(activeTab === "moderation" || activeTab === "papers" || activeTab === "notes") && (
                    <div>
                        {/* SEARCH & FILTERS BAR */}
                        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
                            {/* Search */}
                            <div className="relative flex-1">
                                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-inner">
                                    <FaSearch className="text-slate-400 mr-2.5 text-xs" />
                                    <input
                                        type="text"
                                        placeholder={`Search ${activeTab === "moderation" ? "moderation queue" : activeTab === "papers" ? "PYQs" : "study notes"} by title, subject, course, university...`}
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full bg-transparent outline-none text-xs text-slate-800 dark:text-white placeholder:text-slate-400 font-medium"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch("")}
                                            className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs"
                                        >
                                            <FaTimes />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                                {activeTab === "moderation" && (
                                    <select
                                        value={moderationFilter}
                                        onChange={(e) => setModerationFilter(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Queue Types ({totalPendingCount})</option>
                                        <option value="pyq" className="dark:bg-slate-900">📄 Question Papers Only</option>
                                        <option value="note" className="dark:bg-slate-900">📝 Study Notes Only</option>
                                    </select>
                                )}

                                {activeTab !== "moderation" && (
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => {
                                            setStatusFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                                    >
                                        <option value="All" className="dark:bg-slate-900">All Statuses</option>
                                        <option value="pending" className="dark:bg-slate-900">⏳ Pending Review</option>
                                        <option value="approved" className="dark:bg-slate-900">✅ Approved Only</option>
                                        <option value="rejected" className="dark:bg-slate-900">❌ Rejected Only</option>
                                    </select>
                                )}

                                <select
                                    value={courseFilter}
                                    onChange={(e) => {
                                        setCourseFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                                >
                                    <option value="All" className="dark:bg-slate-900">All Courses</option>
                                    {COURSES.map((c) => (
                                        <option key={c} value={c} className="dark:bg-slate-900">
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* BATCH OPERATIONS BAR */}
                        {selectedIds.size > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-indigo-600/10 dark:bg-indigo-950/70 border border-indigo-500/40 rounded-2xl p-3.5 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-md"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                                        {selectedIds.size}
                                    </span>
                                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-200">
                                        Items Selected
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={handleBulkApprove}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                        <FaCheckCircle className="text-xs" /> Bulk Approve ({selectedIds.size})
                                    </button>
                                    <button
                                        onClick={handleBulkReject}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                        <FaTimesCircle className="text-xs" /> Bulk Reject
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDeletingBulk(true);
                                            setDeletingItem(null);
                                        }}
                                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                        <FaTrash className="text-xs" /> Bulk Delete
                                    </button>
                                    <button
                                        onClick={() => setSelectedIds(new Set())}
                                        className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* EMPTY MODERATION QUEUE */}
                        {activeTab === "moderation" && !loading && currentList.length === 0 && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm my-6">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4">
                                    ✓
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                    Moderation Queue is Clear!
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                                    All submitted question papers and study notes have been verified and approved.
                                </p>
                            </div>
                        )}

                        {/* DATA TABLE */}
                        {currentList.length > 0 && (
                            <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                                            <tr>
                                                <th className="py-3.5 px-4 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            paginatedItems.length > 0 &&
                                                            selectedIds.size === paginatedItems.length
                                                        }
                                                        onChange={toggleSelectAll}
                                                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </th>
                                                <th className="py-3.5 px-4">Title / Material</th>
                                                <th className="py-3.5 px-4">Subject & Unit</th>
                                                <th className="py-3.5 px-4">Course & Sem</th>
                                                <th className="py-3.5 px-4">Institution / Author</th>
                                                <th className="py-3.5 px-4">Status</th>
                                                <th className="py-3.5 px-4 text-right">Moderation Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                                            {paginatedItems.map((item) => {
                                                const isSelected = selectedIds.has(item._id);
                                                const status = item.status || "approved";
                                                const isNote = item.unit !== undefined || item.subject !== undefined;

                                                return (
                                                    <tr
                                                        key={item._id}
                                                        className={`transition-colors ${
                                                            isSelected
                                                                ? "bg-indigo-50/50 dark:bg-indigo-950/30"
                                                                : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                                        }`}
                                                    >
                                                        <td className="py-3.5 px-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectOne(item._id)}
                                                                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                                    isNote ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600" : "bg-red-50 dark:bg-red-950/50 text-red-500"
                                                                }`}>
                                                                    {isNote ? <FaStickyNote /> : <FaFilePdf />}
                                                                </div>
                                                                <div>
                                                                    <span
                                                                        onClick={() => setPreviewPdf(item)}
                                                                        className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer line-clamp-1 max-w-xs block"
                                                                    >
                                                                        {item.title}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400">
                                                                        {isNote ? "Study Note" : "Question Paper"} • ID: {item._id.slice(-6)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {item.subject || item.title || "-"}
                                                            </span>
                                                            <span className="text-emerald-600 dark:text-emerald-400 block text-[11px] font-bold">
                                                                {item.unit || item.examType || "-"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {item.course || "-"}
                                                            </span>
                                                            <span className="text-slate-400 block text-[11px]">
                                                                {item.semester ? `Sem ${item.semester}` : "-"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                                                            <span className="block truncate max-w-[120px]">
                                                                {item.university || item.branch || "-"}
                                                            </span>
                                                            {item.author && (
                                                                <span className="text-[10px] text-slate-400 truncate block">
                                                                    By {item.author}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            {renderStatusBadge(status)}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {status !== "approved" && (
                                                                    <button
                                                                        onClick={() => handleApproveItem(item, isNote ? "note" : "pyq")}
                                                                        className="p-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-lg transition cursor-pointer font-semibold flex items-center gap-1 text-xs"
                                                                        title="Approve"
                                                                    >
                                                                        <FaCheck className="text-xs" />
                                                                        <span className="hidden xl:inline">Approve</span>
                                                                    </button>
                                                                )}

                                                                {status !== "rejected" && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setRejectingItem({ ...item, itemType: isNote ? "note" : "pyq" });
                                                                            setRejectionReason("");
                                                                        }}
                                                                        className="p-2 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
                                                                        title="Reject"
                                                                    >
                                                                        <FaBan className="text-xs" />
                                                                    </button>
                                                                )}

                                                                <button
                                                                    onClick={() => setPreviewPdf(item)}
                                                                    className="p-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg transition cursor-pointer"
                                                                    title="Preview Document"
                                                                >
                                                                    <FaEye className="text-xs" />
                                                                </button>

                                                                <button
                                                                    onClick={() => handleOpenEdit(item)}
                                                                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
                                                                    title="Edit Details"
                                                                >
                                                                    <FaEdit className="text-xs" />
                                                                </button>

                                                                <button
                                                                    onClick={() => {
                                                                        setDeletingItem(item);
                                                                        setDeletingBulk(false);
                                                                    }}
                                                                    className="p-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg transition cursor-pointer"
                                                                    title="Delete"
                                                                >
                                                                    <FaTrash className="text-xs" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* PAGINATION */}
                        {currentList.length > pageSize && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                                <span className="text-slate-500 font-medium">
                                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                                    {Math.min(currentPage * pageSize, currentList.length)} of {currentList.length} records
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold disabled:opacity-40"
                                    >
                                        Prev
                                    </button>
                                    <span className="px-2 font-bold text-slate-800 dark:text-white">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold disabled:opacity-40"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 4: USER DIRECTORY ────────────────────────────────────────────── */}
                {activeTab === "users" && (
                    <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Student & Contributor Directory</h3>
                                <p className="text-xs text-slate-500">Synced via Clerk Authentication and User DB</p>
                            </div>
                            <button
                                onClick={fetchUsers}
                                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                            >
                                <FaSyncAlt className="text-xs" /> Refresh Users
                            </button>
                        </div>

                        {usersLoading ? (
                            <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
                                <FaSpinner className="animate-spin" /> Loading user registry...
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs">
                                No registered user records found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold">
                                        <tr>
                                            <th className="py-3 px-4">Clerk User ID</th>
                                            <th className="py-3 px-4">PYQ Uploads</th>
                                            <th className="py-3 px-4">Notes Uploads</th>
                                            <th className="py-3 px-4">Total Contributions</th>
                                            <th className="py-3 px-4">First Active</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                        {users.map((u) => (
                                            <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                    {u.clerkId}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                    {u.pyqUploads || 0}
                                                </td>
                                                <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    {u.noteUploads || 0}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                                                        {u.totalUploads || 0} materials
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-500">
                                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB 5: SYSTEM HEALTH ────────────────────────────────────────────── */}
                {activeTab === "system" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm p-6">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Backend Connectivity</h3>
                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-500 font-semibold">API Endpoint</span>
                                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{API_URL}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-500 font-semibold">Live Latency</span>
                                    <span className="font-bold text-slate-800 dark:text-white">
                                        {pingLatency === null ? "Not tested" : pingLatency === -1 ? "Failed" : `${pingLatency} ms`}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleTestPing}
                                disabled={pinging}
                                className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {pinging ? <FaSpinner className="animate-spin" /> : <FaServer />} Test API Health
                            </button>
                        </div>

                        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm p-6">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Admin Security Privileges</h3>
                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-500 font-semibold">Your Session</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{userEmail}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-slate-500 font-semibold">Configured Admins</span>
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{adminEmails.join(", ")}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── REJECT MODAL ────────────────────────────────────────────────────── */}
            {rejectingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-slate-800 dark:text-slate-100"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-xl mb-4">
                            <FaBan />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                            Reject Submission
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            Rejecting &ldquo;<span className="font-semibold text-slate-800 dark:text-slate-200">{rejectingItem.title}</span>&rdquo;. The uploader will see this status and reason on their student dashboard.
                        </p>

                        <div className="mb-5">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                Rejection Reason (Optional)
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="e.g. Blurry scan, duplicate notes, wrong university metadata..."
                                rows={3}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-white outline-none focus:border-amber-500"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={confirmRejectItem}
                                disabled={isRejecting}
                                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                            >
                                {isRejecting ? "Rejecting..." : "Confirm Rejection"}
                            </button>
                            <button
                                onClick={() => setRejectingItem(null)}
                                className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ── DELETE MODAL ────────────────────────────────────────────────────── */}
            {(deletingItem || deletingBulk) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-slate-800 dark:text-slate-100"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center text-xl mb-4">
                            <FaTrash />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                            {deletingBulk ? `Purge ${selectedIds.size} Items?` : "Delete Material?"}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                            {deletingBulk
                                ? `Are you sure you want to permanently delete these ${selectedIds.size} selected items? This action cannot be undone.`
                                : `Are you sure you want to delete "${deletingItem?.title}"? It will be permanently removed from the repository.`}
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                            >
                                {isDeleting ? "Deleting..." : "Yes, Permanently Delete"}
                            </button>
                            <button
                                onClick={() => {
                                    setDeletingItem(null);
                                    setDeletingBulk(false);
                                }}
                                className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ── EDIT PYQ MODAL ─────────────────────────────────────────────────── */}
            {editingPaper && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-slate-800 dark:text-slate-100"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Question Paper</h3>
                            <button onClick={() => setEditingPaper(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSavePaperEdit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject / Title</label>
                                <input
                                    type="text"
                                    value={editPaperForm.title}
                                    onChange={(e) => setEditPaperForm({ ...editPaperForm, title: e.target.value })}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Course</label>
                                    <select
                                        value={editPaperForm.course}
                                        onChange={(e) => setEditPaperForm({ ...editPaperForm, course: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                    >
                                        {COURSES.map((c) => (
                                            <option key={c} value={c} className="dark:bg-slate-900">{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Semester</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={editPaperForm.semester}
                                        onChange={(e) => setEditPaperForm({ ...editPaperForm, semester: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Exam Type</label>
                                    <select
                                        value={editPaperForm.examType}
                                        onChange={(e) => setEditPaperForm({ ...editPaperForm, examType: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                    >
                                        {EXAM_TYPES.map((t) => (
                                            <option key={t.value} value={t.value} className="dark:bg-slate-900">{t.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                    <select
                                        value={editPaperForm.status}
                                        onChange={(e) => setEditPaperForm({ ...editPaperForm, status: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                    >
                                        <option value="pending" className="dark:bg-slate-900">⏳ Pending Review</option>
                                        <option value="approved" className="dark:bg-slate-900">✅ Approved</option>
                                        <option value="rejected" className="dark:bg-slate-900">❌ Rejected</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition cursor-pointer"
                                >
                                    {savingEdit ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingPaper(null)}
                                    className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* ── EDIT NOTE MODAL ─────────────────────────────────────────────────── */}
            {editingNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-slate-800 dark:text-slate-100"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Study Notes</h3>
                            <button onClick={() => setEditingNote(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSaveNoteEdit} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notes Title</label>
                                <input
                                    type="text"
                                    value={editNoteForm.title}
                                    onChange={(e) => setEditNoteForm({ ...editNoteForm, title: e.target.value })}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={editNoteForm.subject}
                                        onChange={(e) => setEditNoteForm({ ...editNoteForm, subject: e.target.value })}
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit / Module</label>
                                    <select
                                        value={editNoteForm.unit}
                                        onChange={(e) => setEditNoteForm({ ...editNoteForm, unit: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                    >
                                        {UNITS.map((u) => (
                                            <option key={u} value={u} className="dark:bg-slate-900">{u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">University</label>
                                    <input
                                        type="text"
                                        value={editNoteForm.university}
                                        onChange={(e) => setEditNoteForm({ ...editNoteForm, university: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Author / Professor</label>
                                    <input
                                        type="text"
                                        value={editNoteForm.author}
                                        onChange={(e) => setEditNoteForm({ ...editNoteForm, author: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Course</label>
                                    <select
                                        value={editNoteForm.course}
                                        onChange={(e) => setEditNoteForm({ ...editNoteForm, course: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                    >
                                        {COURSES.map((c) => (
                                            <option key={c} value={c} className="dark:bg-slate-900">{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                    <select
                                        value={editNoteForm.status}
                                        onChange={(e) => setEditNoteForm({ ...editNoteForm, status: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 outline-none font-medium"
                                    >
                                        <option value="pending" className="dark:bg-slate-900">⏳ Pending Review</option>
                                        <option value="approved" className="dark:bg-slate-900">✅ Approved</option>
                                        <option value="rejected" className="dark:bg-slate-900">❌ Rejected</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition cursor-pointer"
                                >
                                    {savingEdit ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingNote(null)}
                                    className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* ── MODAL PDF VIEWER ─────────────────────────────────────────────────── */}
            {previewPdf && (
                <PDFViewer
                    fileUrl={previewPdf.fileUrl}
                    title={previewPdf.title}
                    onClose={() => setPreviewPdf(null)}
                />
            )}
        </div>
    );
}

export default AdminPanel;
