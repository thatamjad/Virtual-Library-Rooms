import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const RoomList = ({ onJoinRoom }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      console.log('Fetching rooms with token:', token);
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/rooms`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Rooms fetched successfully:', response.data);
      setRooms(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching rooms:', error.response?.data || error);
      setError(error.response?.data?.message || 'Failed to fetch rooms');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAutoJoin = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      console.log('Attempting to auto-join room...');
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/rooms/auto-join`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('Auto-join successful:', response.data);

      if (response.data && response.data._id) {
        console.log('Navigating to room:', response.data._id);
        onJoinRoom(response.data._id);
      } else {
        throw new Error('Invalid room data received');
      }
    } catch (error) {
      console.error('Auto-join error:', error.response?.data || error);
      setError(error.response?.data?.message || 'Failed to join room');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Virtual Library Rooms</h1>
      <button
        onClick={handleAutoJoin}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4 hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Joining...' : 'Auto-Join Available Room'}
      </button>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-2">
        Available Rooms ({rooms.length})
      </h2>
      
      {loading ? (
        <div>Loading rooms...</div>
      ) : rooms.length === 0 ? (
        <div className="text-gray-600">
          All rooms are full. New rooms created automatically!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div
              key={room._id}
              className="border rounded p-4 hover:shadow-lg transition-shadow"
            >
              <div className="font-semibold">Room #{room._id.slice(-4)}</div>
              <div className="text-sm text-gray-600">
                Participants: {room.participants.length}/{room.maxParticipants}
              </div>
              <button
                onClick={() => onJoinRoom(room._id)}
                className="mt-2 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
              >
                Join
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomList;