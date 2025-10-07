import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import "@/App.css";

// Components
import Login from "./components/Login";
import DeliveryPersonDashboard from "./components/DeliveryPersonDashboard";
import AdminDashboard from "./components/AdminDashboard";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    const userType = localStorage.getItem('userType');
    
    if (token && userData && userType) {
      setUser({
        token,
        userData: JSON.parse(userData),
        userType
      });
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/login`, {
        username,
        password
      });
      
      const { access_token, user_type, user_data } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('userData', JSON.stringify(user_data));
      localStorage.setItem('userType', user_type);
      
      setUser({
        token: access_token,
        userData: user_data,
        userType: user_type
      });
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      toast.success('Login successful!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    localStorage.removeItem('userType');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  return { user, loading, login, logout };
};

// Protected Route Component
const ProtectedRoute = ({ children, requiredUserType, user }) => {
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (requiredUserType && user.userType !== requiredUserType) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Main App Component
function App() {
  const auth = useAuth();

  useEffect(() => {
    // Set axios default authorization header if user is logged in
    if (auth.user?.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${auth.user.token}`;
    }
  }, [auth.user]);

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              auth.user ? (
                <Navigate to={auth.user.userType === 'admin' ? '/admin' : '/dashboard'} />
              ) : (
                <Login onLogin={auth.login} />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={auth.user} requiredUserType="delivery_person">
                <DeliveryPersonDashboard user={auth.user} onLogout={auth.logout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={auth.user} requiredUserType="admin">
                <AdminDashboard user={auth.user} onLogout={auth.logout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              auth.user ? (
                <Navigate to={auth.user.userType === 'admin' ? '/admin' : '/dashboard'} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
