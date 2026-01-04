import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import IssueDetails from "./pages/IssueDetails";
import { Toaster } from "./components/ui/sonner";
import "@/App.css";

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

function AppContent() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          user?.role === "Student" ? (
            <Navigate to="/student" />
          ) : user?.role === "Admin" || user?.role === "Principal" ? (
            <Navigate to="/admin" />
          ) : user ? (
            <Navigate to="/staff" />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/student"
        element={
          <PrivateRoute allowedRoles={["Student"]}>
            <StudentDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <PrivateRoute allowedRoles={["Staff", "HoD", "Warden"]}>
            <StaffDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={["Admin", "Principal"]}>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/issue/:issueId"
        element={
          <PrivateRoute>
            <IssueDetails />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;