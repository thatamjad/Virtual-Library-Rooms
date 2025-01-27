require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const { User, Room } = require('./models');
const mediaServer = require('./mediaServer');

// Initialize Express App
const app = express();
const server = http.createServer(app);

// Socket.io Configuration
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 120000
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/organizations', require('./routes/orgRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/onboarding', require('./routes/onboardingRoutes'));
app.use('/api/account', require('./routes/accountRoutes'));

// Database Connection Function
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options are no longer needed in Mongoose 6+
      // useNewUrlParser: true,
      // useUnifiedTopology: true
    });
    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Socket.io Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token not provided'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    socket.user = user;
    next();
  } catch (err) {
    console.error('Socket.io authentication error:', err);
    next(new Error('Authentication error'));
  }
});

// Socket.io Event Handlers
io.on('connection', (socket) => {
  console.log(`💡 New connection: ${socket.user.email}`);

  // Room Management
  socket.on('joinRoom', async (roomId) => {
    try {
      let router = mediaServer.rooms.get(roomId);
      if (!router) {
        router = await mediaServer.createRoom(roomId);
      }

      // Create WebRTC transport for this peer
      const transport = await mediaServer.createTransport(router, true);
      
      socket.emit('transportParameters', {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });

      // Store transport information
      socket.transport = transport;
      socket.roomId = roomId;
      
      // Join Socket.io room
      socket.join(roomId);
      const participants = await getRoomParticipants(roomId);
      socket.emit('existingParticipants', participants);
    } catch (err) {
      console.error('Error in joinRoom:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // Add new WebRTC handling events
  socket.on('connectTransport', async ({ dtlsParameters }) => {
    try {
      if (!socket.transport) {
        throw new Error('Transport not initialized');
      }
      await socket.transport.connect({ dtlsParameters });
    } catch (error) {
      console.error('Transport connect error:', error);
      socket.emit('error', { 
        message: 'Failed to connect transport',
        details: error.message 
      });
    }
  });

  socket.on('produce', async ({ kind, rtpParameters }) => {
    try {
      if (!socket.transport) {
        throw new Error('Transport not initialized');
      }
      const producer = await socket.transport.produce({ kind, rtpParameters });
      socket.producer = producer;
      
      // Notify other participants about new producer
      socket.to(socket.roomId).emit('newProducer', {
        producerId: producer.id,
        userId: socket.user.id
      });
    } catch (err) {
      console.error('Produce error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // WebRTC Signaling
  const handleWebRTCSignal = (type) => (data) => {
    try {
      socket.to(data.target).emit(type, {
        sender: socket.user.id,
        [type.toLowerCase()]: data[type.toLowerCase()]
      });
    } catch (err) {
      console.error(`WebRTC signal error for ${type}:`, err);
    }
  };

  socket.on('offer', handleWebRTCSignal('offer'));
  socket.on('answer', handleWebRTCSignal('answer'));
  socket.on('ice-candidate', (data) => {
    try {
      socket.to(data.target).emit('ice-candidate', {
        sender: socket.user.id,
        candidate: data.candidate
      });
    } catch (err) {
      console.error('ICE Candidate error:', err);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.user.email}, Reason: ${reason}`);
    // Handle cleanup if necessary
  });
});

// Helper Functions
const getRoomParticipants = async (roomId) => {
  try {
    const room = await Room.findById(roomId)
      .populate('participants', 'email name')
      .lean();
      
    if (!room) {
      console.error('Room not found:', roomId);
      return [];
    }

    return room.participants.map(user => ({
      id: user._id.toString(),
      email: user.email,
      name: user.name
    }));
  } catch (err) {
    console.error('Error fetching participants:', err);
    return [];
  }
};

// Add process handlers
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Cleaning up...');
  await mediaServer.cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Cleaning up...');
  await mediaServer.cleanup();
  process.exit(0);
});

// Connect to Database and Start Server
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

module.exports = { app, server, io };