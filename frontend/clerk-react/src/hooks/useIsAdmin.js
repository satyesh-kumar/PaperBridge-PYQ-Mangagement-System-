import { useUser } from "@clerk/react";

const DEFAULT_ADMIN_EMAILS = [
    "satyeshkumar578@gmail.com",
    "satyeshkumar@gmail.com",
    "satyesh@paperbridge.com",
    "admin@paperbridge.com",
];

/**
 * Hook to verify if the currently authenticated Clerk user has Administrator privileges.
 * Admin permissions can be granted via:
 * 1. Email address matching VITE_ADMIN_EMAILS in .env or DEFAULT_ADMIN_EMAILS.
 * 2. Clerk publicMetadata { role: "admin" } or { isAdmin: true }.
 */
export function useIsAdmin() {
    const { user, isLoaded, isSignedIn } = useUser();

    if (!isLoaded || !isSignedIn || !user) {
        return {
            isAdmin: false,
            isLoaded,
            userEmail: null,
            adminEmails: DEFAULT_ADMIN_EMAILS,
        };
    }

    const envAdminEmailsRaw = import.meta.env.VITE_ADMIN_EMAILS || "";
    const envList = envAdminEmailsRaw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    const adminEmails = Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...envList]));

    // Primary email
    const primaryEmail = user.primaryEmailAddress?.emailAddress?.toLowerCase().trim();

    // All associated emails
    const allUserEmails = (user.emailAddresses || []).map((e) =>
        (e.emailAddress || "").toLowerCase().trim()
    );

    const emailMatch =
        (primaryEmail && adminEmails.includes(primaryEmail)) ||
        allUserEmails.some((email) => adminEmails.includes(email));

    const metadataRole = user.publicMetadata?.role;
    const metadataIsAdmin = user.publicMetadata?.isAdmin;
    const metadataMatch = metadataRole === "admin" || metadataIsAdmin === true;

    const isAdmin = Boolean(emailMatch || metadataMatch);

    return {
        isAdmin,
        isLoaded,
        userEmail: primaryEmail || allUserEmails[0] || null,
        adminEmails,
    };
}

