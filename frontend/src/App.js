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
      console.log('Starting login process...');
      
      // Use fetch instead of axios to avoid potential axios issues
      const response = await fetch(`${API}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password
        })
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        toast.error('Login failed: ' + response.status);
        return false;
      }
      
      const data = await response.json();
      console.log('Login response data:', data);
      
      const { access_token, user_type, user_data } = data;
      
      if (!access_token || !user_type || !user_data) {
        console.error('Missing data in response:', data);
        toast.error('Invalid response from server');
        return false;
      }
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('userData', JSON.stringify(user_data));
      localStorage.setItem('userType', user_type);
      
      console.log('Setting user state...');
      
      setUser({
        token: access_token,
        userData: user_data,
        userType: user_type
      });
      
      // Set axios header for future requests
      if (typeof axios !== 'undefined') {
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      }
      
      console.log('Login process completed successfully');
      toast.success('Login successful!');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error: ' + error.message);
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
