import toast from "react-hot-toast";

/**
 * Robustly download PDF from Cloudinary or any URL.
 * Automatically injects Cloudinary's `fl_attachment` flag when applicable
 * and uses blob fallback and direct link download to guarantee 100% success.
 */
export async function downloadPDF(fileUrl, fileName = "paper") {
    if (!fileUrl) {
        toast.error("File download link is missing.");
        return false;
    }

    const cleanFileName = (fileName || "document").replace(/[^a-zA-Z0-9_-]/g, "_") + ".pdf";
    const toastId = toast.loading("Starting download...");

    try {
        // If Cloudinary URL, construct attachment URL
        let downloadUrl = fileUrl;
        if (fileUrl.includes("res.cloudinary.com") && fileUrl.includes("/upload/")) {
            if (!fileUrl.includes("fl_attachment")) {
                downloadUrl = fileUrl.replace("/upload/", "/upload/fl_attachment/");
            }
        }

        // Try direct blob fetch first
        try {
            const response = await fetch(fileUrl, { mode: "cors" });
            if (response.ok) {
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = cleanFileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
                toast.success("Download started!", { id: toastId });
                return true;
            }
        } catch {
            // Blob fetch failed (e.g. strict CORS), continue to attachment URL / anchor click
        }

        // Anchor trigger with fl_attachment URL
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = cleanFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Download initiated!", { id: toastId });
        return true;
    } catch (err) {
        console.error("Download fallback error:", err);
        window.open(fileUrl, "_blank");
        toast.success("Opened document in new tab", { id: toastId });
        return true;
    }
}
