import { useEffect, useState } from 'react';
import api from './services/api';
import { Routes, Route } from 'react-router-dom';
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LandingPage from './pages/LandingPage';
import Archive from "./pages/Archive";
import VerifyEmail from "./pages/VerifyEmail";
import { Analytics } from "@vercel/analytics/react";

function App() {
  const [ , setMessage] = useState<string>('Connecting...');

  useEffect(() => {
    // This function runs when the page loads
    const checkConnection = async () => {
      try {
        // We call the backend route here
        const response = await api.get('/'); 
        setMessage(response.data); // Should display: "Metro Bacolod Connect Backend is Working!"
      } catch (error) {
        console.error("Connection Error:", error);
        setMessage('Error: Could not connect to backend.');
      }
    };

    checkConnection();
  }, []);

  return (
    <>
    {/* This container handles the popups for the whole app */}
      <ToastContainer 
        position="top-left" 
        autoClose={3000} 
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark" // Matches your dark theme
      />
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/archive" element={<Archive />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
    </Routes>
    <Analytics />
  </>
  );
}

export default App;