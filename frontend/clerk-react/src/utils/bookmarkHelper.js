// Bookmark & Favorites Helper using LocalStorage with reactive custom events

const STORAGE_KEY = "paperbridge_bookmarks";

export function getBookmarks() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function isBookmarked(id) {
    if (!id) return false;
    const bookmarks = getBookmarks();
    return bookmarks.some((item) => item._id === id);
}

export function toggleBookmark(item) {
    if (!item || !item._id) return false;
    let bookmarks = getBookmarks();
    const index = bookmarks.findIndex((b) => b._id === item._id);

    let isSaved = false;
    if (index >= 0) {
        bookmarks.splice(index, 1);
        isSaved = false;
    } else {
        bookmarks.unshift({
            _id: item._id,
            title: item.title,
            course: item.courseId?.name || item.course,
            university: item.universityId?.name || item.university,
            semester: item.semester,
            examType: item.examType,
            year: item.academicYear || item.year,
            fileUrl: item.fileUrl,
            itemType: item.unit ? "note" : "pyq",
            savedAt: new Date().toISOString(),
        });
        isSaved = true;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
        // Dispatch custom event so any component updates instantly
        window.dispatchEvent(new CustomEvent("paperbridge_bookmarks_updated", { detail: { bookmarks } }));
    } catch (e) {
        console.error("Failed to save bookmark:", e);
    }

    return isSaved;
}
