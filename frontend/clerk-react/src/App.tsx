import './App.css'
import { Toaster } from "react-hot-toast";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import UploadPYQ from "./pages/UploadPYQ";
import BrowsePYQ from "./pages/BrowsePYQ";

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
      <Toaster position="top-right" />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<BrowsePYQ />} />
        <Route path="/upload" element={<UploadPYQ />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* Catch-all — redirect unknown paths to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
