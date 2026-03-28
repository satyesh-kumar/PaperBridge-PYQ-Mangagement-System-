import './App.css'
import { Toaster } from "react-hot-toast";
import { Routes, Route, Link } from "react-router-dom"
import Home from "./pages/Home.jsx"
import Dashboard from "./pages/Dashboard.jsx"

import UploadPYQ from "./pages/UploadPYQ"

import BrowserPYQ from "./pages/BrowsePYQ"


function App() {

  return (
    <>

      <Toaster position="top-right" />

      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/Dashboard" element={<Dashboard />} />

        <Route path="/upload" element={<UploadPYQ />} />
        <Route path="/browse" element={<BrowserPYQ />} />

  
      </Routes>

    </>
  )
}

export default App

