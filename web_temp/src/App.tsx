import { useEffect, useState } from 'react';
import api from './services/api';
import { Routes, Route } from 'react-router-dom';
import Login from "./pages/Login";
import Register from "./pages/Register";
import CompleteProfile from "./pages/CompleteProfile";
import Dashboard from "./pages/Dashboard";

function App() {
  const [message, setMessage] = useState<string>('Connecting...');

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
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  </>
  );
}

export default App;