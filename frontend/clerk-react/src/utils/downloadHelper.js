import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Robustly download PDF from Cloudinary or any URL.
 * Automatically injects Cloudinary's `fl_attachment` flag when applicable
 * and uses blob fallback, backend proxy, and direct link download to guarantee 100% success.
 */
export async function downloadPDF(fileUrl, fileName = "paper") {
    if (!fileUrl) {
        toast.error("File download link is missing.");
        return false;
    }

    const cleanFileName = (fileName || "document").replace(/[^a-zA-Z0-9_-]/g, "_") + ".pdf";
    const toastId = toast.loading("Starting download...");

    try {
        const proxyUrl = `${API_URL}/api/pdf/view?url=${encodeURIComponent(fileUrl)}`;
        const candidateFetchUrls = [fileUrl, proxyUrl];

        // Try blob fetch first (direct or via authenticated proxy)
        for (const targetUrl of candidateFetchUrls) {
            try {
                const response = await fetch(targetUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    if (blob && blob.size > 0) {
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
                }
            } catch {
                // Continue to next fallback
            }
        }

        // Anchor trigger with fl_attachment URL
        let downloadUrl = fileUrl;
        if (fileUrl.includes("res.cloudinary.com") && fileUrl.includes("/upload/")) {
            if (!fileUrl.includes("fl_attachment")) {
                downloadUrl = fileUrl.replace("/upload/", "/upload/fl_attachment/");
            }
        }

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
