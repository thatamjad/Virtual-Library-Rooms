import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import RoomList from './components/RoomList';
import OnboardingForm from './components/OnboardingForm';
import VideoRoom from './components/VideoRoom';
import { useState, useEffect } from 'react';
import './styles/auth.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('token')
  );
  const [currentRoom, setCurrentRoom] = useState(null);
  const navigate = useNavigate();

  // Sync authentication with localStorage
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
    };
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentRoom(null);
  };

  const handleJoinRoom = (roomId) => {
    console.log('Joining room:', roomId);
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="app-container">
      <Routes>
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/rooms" /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/register" 
          element={<Register />} 
        />
        <Route 
          path="/login" 
          element={
            !isAuthenticated ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Navigate to="/rooms" />
            )
          } 
        />
        <Route 
          path="/onboarding" 
          element={<OnboardingForm />} 
        />
        <Route 
          path="/rooms" 
          element={
            isAuthenticated ? (
              <RoomList 
                onJoinRoom={handleJoinRoom}
              />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route path="/room/:roomId" element={<VideoRoom />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App; 