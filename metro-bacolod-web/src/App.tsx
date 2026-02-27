import { useEffect, useState } from 'react';
import api from './services/api';
import { Routes, Route } from 'react-router-dom';
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import GlassToastContainer from './components/GlassToast';
import LandingPage from './pages/LandingPage';
import Archive from "./pages/Archive";
import VerifyEmail from "./pages/VerifyEmail";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Properties from "./pages/Properties";
import Professionals from "./pages/Professionals";
import Services from "./pages/Services";
import Resources from "./pages/Resources";
import Messages from "./pages/Messages";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./context/ThemeContext";
import CompleteProfile from "./pages/CompleteProfile";
import Admin from "./pages/Admin";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import "./dark-mode.css";
import { Analytics } from "@vercel/analytics/react";

function App() {
  const [ , setMessage] = useState<string>('Connecting...');

  useEffect(() => {
    // This function runs when the page loads
    const checkConnection = async () => {
      try {
        // We call the backend route here
        const response = await api.get('/'); 
        setMessage(response.data); 
      } catch (error) {
        console.error("Connection Error:", error);
        setMessage('Error: Could not connect to backend.');
      }
    };

    checkConnection();
  }, []);

  return (
    <ErrorBoundary>
    <ThemeProvider>
      {/* Glassmorphic toast notifications for the whole app */}
      <GlassToastContainer />
      <Routes>
        {/* ========================================== */}
        {/* PUBLIC ROUTES (Anyone can view these)      */}
        {/* ========================================== */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/professionals" element={<Professionals />} />
        <Route path="/services" element={<Services />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />

        {/* ========================================== */}
        {/* PROTECTED ROUTES (Must be logged in)       */}
        {/* ========================================== */}
        <Route 
          path="/dashboard" 
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
        />
        <Route 
          path="/profile" 
          element={<ProtectedRoute><Profile /></ProtectedRoute>} 
        />
        <Route 
          path="/profile/:userId" 
          element={<ProtectedRoute><Profile /></ProtectedRoute>} 
        />
        <Route 
          path="/archive" 
          element={<ProtectedRoute><Archive /></ProtectedRoute>} 
        />
        <Route 
          path="/settings" 
          element={<ProtectedRoute><Settings /></ProtectedRoute>} 
        />
        <Route 
          path="/messages" 
          element={<ProtectedRoute><Messages /></ProtectedRoute>} 
        />
        <Route 
          path="/complete-profile" 
          element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} 
        />
        <Route 
          path="/admin" 
          element={<ProtectedRoute><Admin /></ProtectedRoute>} 
        />

        {/* ========================================== */}
        {/* CATCH-ALL 404 ROUTE                        */}
        {/* ========================================== */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Analytics />
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;