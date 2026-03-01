import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { auth, db } from "../firebase-config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { fetchAdminEmails, isAdmin } from "../constants/roles";

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
          // Fail-closed: if Firestore check fails, deny access
          setIsAuthenticated(false);
          setLoading(false);
          return;
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

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * AdminRoute — wraps ProtectedRoute with an additional admin check
 * using the "users" collection role field.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check deactivation
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().isDeactivated) {
            await signOut(auth);
            setAllowed(false);
            setLoading(false);
            return;
          }
          // Check admin status from users collection role field
          await fetchAdminEmails();
          if (isAdmin(user.email)) {
            setAllowed(true);
          } else {
            setAllowed(false);
          }
        } catch {
          setAllowed(false);
        }
      } else {
        setAllowed(false);
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

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}