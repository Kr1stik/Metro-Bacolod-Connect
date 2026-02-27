import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { auth, db } from "../firebase-config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user account is deactivated in Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().isDeactivated) {
            await signOut(auth);
            setIsAuthenticated(false);
            setLoading(false);
            return;
          }
        } catch {
          // If Firestore check fails, still allow access (fail-open for auth)
        }
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#ffffff' }}>
        <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTopColor: '#111827', borderRadius: '50%' }}></div>
      </div>
    );
  }

  // If they are not logged in, violently kick them back to the login page
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If they are logged in, allow them to see the page
  return <>{children}</>;
}