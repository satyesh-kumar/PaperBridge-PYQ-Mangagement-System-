import './App.css'
import { Toaster } from "react-hot-toast";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import UploadPYQ from "./pages/UploadPYQ";
import BrowsePYQ from "./pages/BrowsePYQ";
import BrowseNotes from "./pages/BrowseNotes";
import AdminPanel from "./pages/AdminPanel.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import CommandPalette from "./components/CommandPalette.jsx";

/** Redirect signed-out users to home, otherwise render the child */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null; // wait for Clerk to initialise
  if (!isSignedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <>
      <ScrollToTop />
      <CommandPalette />
      <Toaster position="top-right" />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<BrowsePYQ />} />
        <Route path="/notes" element={<BrowseNotes />} />
        <Route path="/upload" element={<UploadPYQ />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />
        {/* Catch-all — redirect unknown paths to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
