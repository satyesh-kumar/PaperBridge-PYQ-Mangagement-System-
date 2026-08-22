import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/react";
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
    FaServer,
    FaFileCsv,
    FaSpinner,
    FaPlus,
    FaSyncAlt,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
    FaBan,
    FaStickyNote,
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

    // 1-Click Approve
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

            confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
            toast.success(`"${item.title}" approved!`, { id: toastId });
            fetchStats();
        } catch (err) {
            console.error("Approve error:", err);
            toast.error("Failed to approve item", { id: toastId });
        }
    };

    // Reject Modal Confirm
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

    // Bulk Approve
    const handleBulkApprove = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        const toastId = toast.loading(`Approving ${ids.length} selected items...`);
        try {
            const token = await getToken();

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

            toast.success(`Successfully approved ${ids.length} items!`, { id: toastId });
            fetchStats();
        } catch (err) {
            console.error("Bulk approve error:", err);
            toast.error("Bulk approve failed", { id: toastId });
        }
    };

    // Bulk Reject
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

    // Delete Confirm
    const confirmDelete = async () => {
        setIsDeleting(true);
        const toastId = toast.loading(deletingBulk ? "Deleting items..." : "Deleting item...");
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
                toast.success(`Deleted ${ids.length} items!`, { id: toastId });
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

    // Edit Metadata Handlers
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

    const totalPendingCount =
        papers.filter((p) => p.status === "pending").length +
        notes.filter((n) => n.status === "pending").length;

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
            <Navbar2 />

            {/* TOP ADMIN BAR */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-4 sticky top-14 z-30">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-sm font-bold shadow-xs">
                            <FaShieldAlt />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                    PaperBridge Admin Console
                                </h1>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">
                                    Root Access
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Logged in as: <span className="font-semibold text-slate-700 dark:text-slate-200">{userEmail}</span>
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={handleExportCSV}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-2xs"
                        >
                            <FaFileCsv className="text-slate-500" /> Export CSV
                        </button>

                        <button
                            onClick={() => {
                                fetchAllData();
                                fetchStats();
                                toast.success("Repository refreshed!");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer shadow-2xs"
                        >
                            <FaSyncAlt className="text-slate-500" /> Refresh
                        </button>

                        <Link
                            to="/upload"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold rounded-lg shadow-xs transition"
                        >
                            <FaPlus className="text-[10px]" /> Upload Material
                        </Link>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
                {/* METRICS GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div
                        onClick={() => setActiveTab("moderation")}
                        className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-slate-300 transition"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Moderation Queue
                            </span>
                            <FaClock className={totalPendingCount > 0 ? "text-amber-500" : "text-slate-400"} />
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {totalPendingCount}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Pending submissions</p>
                    </div>

                    <div
                        onClick={() => setActiveTab("papers")}
                        className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-slate-300 transition"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Question Papers
                            </span>
                            <FaFilePdf className="text-slate-400" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {papers.length}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Live PYQ repository</p>
                    </div>

                    <div
                        onClick={() => setActiveTab("notes")}
                        className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-slate-300 transition"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Study Notes
                            </span>
                            <FaStickyNote className="text-slate-400" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {notes.length}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Unit notes & summaries</p>
                    </div>

                    <div
                        onClick={() => setActiveTab("users")}
                        className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-slate-300 transition"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Registered Users
                            </span>
                            <FaUsers className="text-slate-400" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {stats?.totalUsers ?? (statsLoading ? "..." : 1)}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Student contributors</p>
                    </div>
                </div>

                {/* TAB SWITCHER */}
                <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 overflow-x-auto">
                    <button
                        onClick={() => {
                            setActiveTab("moderation");
                            setCurrentPage(1);
                            setSelectedIds(new Set());
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            activeTab === "moderation"
                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <FaClock className="text-xs" /> Moderation Queue
                        {totalPendingCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                                {totalPendingCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => {
                            setActiveTab("papers");
                            setCurrentPage(1);
                            setSelectedIds(new Set());
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            activeTab === "papers"
                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <FaFilePdf className="text-xs" /> PYQ Papers ({papers.length})
                    </button>

                    <button
                        onClick={() => {
                            setActiveTab("notes");
                            setCurrentPage(1);
                            setSelectedIds(new Set());
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            activeTab === "notes"
                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <FaStickyNote className="text-xs" /> Study Notes ({notes.length})
                    </button>

                    <button
                        onClick={() => setActiveTab("users")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            activeTab === "users"
                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <FaUsers className="text-xs" /> User Directory
                    </button>

                    <button
                        onClick={() => setActiveTab("system")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            activeTab === "system"
                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <FaServer className="text-xs" /> System Health
                    </button>
                </div>

                {/* DATA VIEWS */}
                {(activeTab === "moderation" || activeTab === "papers" || activeTab === "notes") && (
                    <div>
                        {/* SEARCH & FILTERS BAR */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs mb-4 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                            <div className="relative flex-1">
                                <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                                    <FaSearch className="text-slate-400 mr-2 text-xs" />
                                    <input
                                        type="text"
                                        placeholder={`Search by title, subject, course, university...`}
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full bg-transparent outline-none text-xs text-slate-800 dark:text-white placeholder:text-slate-400 font-medium"
                                    />
                                    {search && (
                                        <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-700 text-xs">
                                            <FaTimes />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {activeTab === "moderation" && (
                                    <select
                                        value={moderationFilter}
                                        onChange={(e) => setModerationFilter(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none"
                                    >
                                        <option value="all">All Queues ({totalPendingCount})</option>
                                        <option value="pyq">Question Papers Only</option>
                                        <option value="note">Study Notes Only</option>
                                    </select>
                                )}

                                {activeTab !== "moderation" && (
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => {
                                            setStatusFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none"
                                    >
                                        <option value="All">All Statuses</option>
                                        <option value="pending">Pending Review</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                )}

                                <select
                                    value={courseFilter}
                                    onChange={(e) => {
                                        setCourseFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none"
                                >
                                    <option value="All">All Courses</option>
                                    {COURSES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* BATCH OPERATIONS BAR */}
                        {selectedIds.size > 0 && (
                            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-4 flex items-center justify-between gap-3 text-xs">
                                <span className="font-semibold text-slate-800 dark:text-white">
                                    {selectedIds.size} Selected
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleBulkApprove}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
                                    >
                                        Approve Selected
                                    </button>
                                    <button
                                        onClick={handleBulkReject}
                                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition"
                                    >
                                        Reject Selected
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDeletingBulk(true);
                                            setDeletingItem(null);
                                        }}
                                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition"
                                    >
                                        Delete Selected
                                    </button>
                                    <button
                                        onClick={() => setSelectedIds(new Set())}
                                        className="px-2 py-1 text-slate-500 hover:text-slate-800"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* EMPTY MODERATION QUEUE */}
                        {activeTab === "moderation" && !loading && currentList.length === 0 && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center shadow-xs my-4">
                                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mx-auto mb-2">
                                    ✓
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">
                                    Moderation Queue is Clear
                                </h3>
                                <p className="text-xs text-slate-500">
                                    All submitted question papers and study notes have been reviewed.
                                </p>
                            </div>
                        )}

                        {/* DATA TABLE */}
                        {currentList.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold">
                                            <tr>
                                                <th className="py-3 px-4 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={paginatedItems.length > 0 && selectedIds.size === paginatedItems.length}
                                                        onChange={toggleSelectAll}
                                                        className="rounded border-slate-300 text-slate-900"
                                                    />
                                                </th>
                                                <th className="py-3 px-4">Title / Document</th>
                                                <th className="py-3 px-4">Subject & Unit</th>
                                                <th className="py-3 px-4">Course & Sem</th>
                                                <th className="py-3 px-4">Institution / Author</th>
                                                <th className="py-3 px-4">Status</th>
                                                <th className="py-3 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                                            {paginatedItems.map((item) => {
                                                const isSelected = selectedIds.has(item._id);
                                                const status = item.status || "approved";
                                                const isNote = item.unit !== undefined || item.subject !== undefined;

                                                return (
                                                    <tr
                                                        key={item._id}
                                                        className={`transition-colors ${
                                                            isSelected
                                                                ? "bg-slate-100/70 dark:bg-slate-800/60"
                                                                : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                                                        }`}
                                                    >
                                                        <td className="py-3 px-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectOne(item._id)}
                                                                className="rounded border-slate-300 text-slate-900"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                {isNote ? <FaStickyNote className="text-slate-400 shrink-0" /> : <FaFilePdf className="text-red-500 shrink-0" />}
                                                                <div>
                                                                    <span
                                                                        onClick={() => setPreviewPdf(item)}
                                                                        className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 cursor-pointer line-clamp-1 max-w-xs block"
                                                                    >
                                                                        {item.title}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400">
                                                                        {isNote ? "Study Note" : "PYQ"} • ID: {item._id.slice(-6)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {item.subject || item.title || "-"}
                                                            </span>
                                                            <span className="text-slate-500 block text-[11px]">
                                                                {item.unit || item.examType || "-"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span>{item.course || "-"}</span>
                                                            <span className="text-slate-400 block text-[11px]">
                                                                {item.semester ? `Sem ${item.semester}` : "-"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-500">
                                                            <span className="block truncate max-w-[120px]">
                                                                {item.university || item.branch || "-"}
                                                            </span>
                                                            {item.author && (
                                                                <span className="text-[10px] text-slate-400 truncate block">
                                                                    By {item.author}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            {status === "pending" && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                                    Pending
                                                                </span>
                                                            )}
                                                            {status === "approved" && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    Approved
                                                                </span>
                                                            )}
                                                            {status === "rejected" && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                                                    Rejected
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {status !== "approved" && (
                                                                    <button
                                                                        onClick={() => handleApproveItem(item, isNote ? "note" : "pyq")}
                                                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition"
                                                                        title="Approve"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                )}

                                                                {status !== "rejected" && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setRejectingItem({ ...item, itemType: isNote ? "note" : "pyq" });
                                                                            setRejectionReason("");
                                                                        }}
                                                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                                                                        title="Reject"
                                                                    >
                                                                        <FaBan className="text-xs" />
                                                                    </button>
                                                                )}

                                                                <button
                                                                    onClick={() => setPreviewPdf(item)}
                                                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                                                                    title="Preview"
                                                                >
                                                                    <FaEye className="text-xs" />
                                                                </button>

                                                                <button
                                                                    onClick={() => handleOpenEdit(item)}
                                                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                                                                    title="Edit"
                                                                >
                                                                    <FaEdit className="text-xs" />
                                                                </button>

                                                                <button
                                                                    onClick={() => {
                                                                        setDeletingItem(item);
                                                                        setDeletingBulk(false);
                                                                    }}
                                                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded transition"
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
                            <div className="flex items-center justify-between mt-4 text-xs">
                                <span className="text-slate-500 font-medium">
                                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                                    {Math.min(currentPage * pageSize, currentList.length)} of {currentList.length} records
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-2.5 py-1 bg-white border border-slate-200 rounded font-semibold disabled:opacity-40"
                                    >
                                        Prev
                                    </button>
                                    <span className="px-2 font-bold text-slate-800">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-2.5 py-1 bg-white border border-slate-200 rounded font-semibold disabled:opacity-40"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* USER DIRECTORY */}
                {activeTab === "users" && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">User Directory</h3>
                                <p className="text-xs text-slate-400">Authenticated students and contributors</p>
                            </div>
                            <button
                                onClick={fetchUsers}
                                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                            >
                                Refresh
                            </button>
                        </div>

                        {usersLoading ? (
                            <div className="text-center py-8 text-slate-400 text-xs">Loading user registry...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                                        <tr>
                                            <th className="py-2.5 px-3">Clerk User ID</th>
                                            <th className="py-2.5 px-3">PYQ Uploads</th>
                                            <th className="py-2.5 px-3">Notes Uploads</th>
                                            <th className="py-2.5 px-3">Total Contributions</th>
                                            <th className="py-2.5 px-3">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {users.map((u) => (
                                            <tr key={u._id} className="hover:bg-slate-50">
                                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{u.clerkId}</td>
                                                <td className="py-2.5 px-3">{u.pyqUploads || 0}</td>
                                                <td className="py-2.5 px-3">{u.noteUploads || 0}</td>
                                                <td className="py-2.5 px-3 font-semibold">{u.totalUploads || 0}</td>
                                                <td className="py-2.5 px-3 text-slate-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* SYSTEM HEALTH */}
                {activeTab === "system" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
                            <h3 className="text-sm font-bold mb-3">Backend Connectivity</h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                                    <span className="text-slate-500">API Endpoint</span>
                                    <span className="font-mono text-slate-800">{API_URL}</span>
                                </div>
                                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                                    <span className="text-slate-500">Latency</span>
                                    <span className="font-bold text-slate-800">
                                        {pingLatency === null ? "Not tested" : `${pingLatency} ms`}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleTestPing}
                                disabled={pinging}
                                className="mt-3 w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                            >
                                {pinging ? "Pinging..." : "Test Connection"}
                            </button>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
                            <h3 className="text-sm font-bold mb-3">Admin Privileges</h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                                    <span className="text-slate-500">Active User</span>
                                    <span className="font-bold text-slate-800">{userEmail}</span>
                                </div>
                                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                                    <span className="text-slate-500">Admin Whitelist</span>
                                    <span className="font-mono text-slate-800">{adminEmails.join(", ")}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* REJECT MODAL */}
            {rejectingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-lg text-xs">
                        <h3 className="text-sm font-bold mb-1">Reject Submission</h3>
                        <p className="text-slate-500 mb-3">
                            Rejecting &ldquo;{rejectingItem.title}&rdquo;.
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Rejection reason for student..."
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3 outline-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={confirmRejectItem}
                                disabled={isRejecting}
                                className="flex-1 py-2 bg-amber-600 text-white rounded-lg font-semibold"
                            >
                                {isRejecting ? "Rejecting..." : "Confirm Reject"}
                            </button>
                            <button
                                onClick={() => setRejectingItem(null)}
                                className="px-3 py-2 border border-slate-200 rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {(deletingItem || deletingBulk) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-lg text-xs">
                        <h3 className="text-sm font-bold mb-1">Confirm Deletion</h3>
                        <p className="text-slate-500 mb-4">
                            {deletingBulk ? `Permanently delete ${selectedIds.size} items?` : `Permanently delete "${deletingItem?.title}"?`}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 py-2 bg-rose-600 text-white rounded-lg font-semibold"
                            >
                                {isDeleting ? "Deleting..." : "Permanently Delete"}
                            </button>
                            <button
                                onClick={() => {
                                    setDeletingItem(null);
                                    setDeletingBulk(false);
                                }}
                                className="px-3 py-2 border border-slate-200 rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT PYQ MODAL */}
            {editingPaper && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-lg text-xs">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold">Edit Question Paper</h3>
                            <button onClick={() => setEditingPaper(null)} className="text-slate-400">✕</button>
                        </div>
                        <form onSubmit={handleSavePaperEdit} className="space-y-3">
                            <div>
                                <label className="block font-semibold mb-1">Title</label>
                                <input
                                    type="text"
                                    value={editPaperForm.title}
                                    onChange={(e) => setEditPaperForm({ ...editPaperForm, title: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-semibold mb-1">Course</label>
                                    <select
                                        value={editPaperForm.course}
                                        onChange={(e) => setEditPaperForm({ ...editPaperForm, course: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                                    >
                                        {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1">Status</label>
                                    <select
                                        value={editPaperForm.status}
                                        onChange={(e) => setEditPaperForm({ ...editPaperForm, status: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="submit" className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-semibold">
                                    {savingEdit ? "Saving..." : "Save"}
                                </button>
                                <button type="button" onClick={() => setEditingPaper(null)} className="px-3 py-2 border border-slate-200 rounded-lg">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT NOTE MODAL */}
            {editingNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-lg text-xs">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold">Edit Study Note</h3>
                            <button onClick={() => setEditingNote(null)} className="text-slate-400">✕</button>
                        </div>
                        <form onSubmit={handleSaveNoteEdit} className="space-y-3">
                            <div>
                                <label className="block font-semibold mb-1">Title</label>
                                <input
                                    type="text"
                                    value={editNoteForm.title}
                                    onChange={(e) => setEditNoteForm({ ...editNoteForm, title: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-semibold mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={editNoteForm.subject}
                                        onChange={(e) => setEditNoteForm({ ...editNoteForm, subject: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold mb-1">Unit</label>
                                    <select
                                        value={editNoteForm.unit}
                                        onChange={(e) => setEditNoteForm({ ...editNoteForm, unit: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                                    >
                                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="submit" className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-semibold">
                                    {savingEdit ? "Saving..." : "Save"}
                                </button>
                                <button type="button" onClick={() => setEditingNote(null)} className="px-3 py-2 border border-slate-200 rounded-lg">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL PDF VIEWER */}
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
