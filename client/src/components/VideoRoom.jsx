import React, { useState, useEffect, useRef } from 'react';
import { Device } from 'mediasoup-client';
import io from 'socket.io-client';
import '../styles/VideoRoom.css';
import { IconButton, Tooltip, Badge, Avatar } from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  CallEnd as CallEndIcon,
  People as PeopleIcon,
  ScreenShare as ScreenShareIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import VideoParticipant from './VideoParticipant';

const VideoRoom = () => {
  const { roomId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [device, setDevice] = useState(null);
  const [transport, setTransport] = useState(null);
  const [consumers, setConsumers] = useState(new Map());
  const socketRef = useRef();
  const streamRef = useRef();
  const videoRef = useRef();
  const navigate = useNavigate();
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  
  const createConsumer = async (producerId, userId) => {
    try {
      const consumer = await transport.consume({
        producerId,
        rtpCapabilities: device.rtpCapabilities
      });

      consumer.on('transportclose', () => {
        console.log('Transport closed for consumer');
      });

      await consumer.resume();

      return consumer;
    } catch (error) {
      console.error('Error creating consumer:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('Initializing video room:', roomId);
    const initializeMediasoup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const newDevice = new Device();
        setDevice(newDevice);

        // Establish Socket.io connection
        socketRef.current = io('http://localhost:5000', {
          auth: {
            token: localStorage.getItem('token')
          }
        });

        socketRef.current.on('connect', () => {
          console.log('Socket connected:', socketRef.current.id);
          socketRef.current.emit('joinRoom', roomId);
        });

        socketRef.current.on('transportParameters', async (params) => {
          await newDevice.load({ routerRtpCapabilities: params.routerRtpCapabilities });
          
          const transport = newDevice.createSendTransport(params);
          setTransport(transport);
          
          transport.on('connect', async ({ dtlsParameters }, callback) => {
            socketRef.current.emit('connectTransport', { dtlsParameters });
            callback();
          });
          
          transport.on('produce', async ({ kind, rtpParameters }, callback) => {
            const { id } = await socketRef.current.emit('produce', { kind, rtpParameters });
            callback({ id });
          });
        });

        socketRef.current.on('newProducer', async ({ producerId, userId }) => {
          const consumer = await createConsumer(producerId, userId);
          setConsumers(prev => new Map(prev).set(userId, consumer));
        });

        socketRef.current.on('existingParticipants', (participants) => {
          participants.forEach(async (participant) => {
            const consumer = await createConsumer(participant.producerId, participant.userId);
            setConsumers(prev => new Map(prev).set(participant.userId, consumer));
          });
        });

        socketRef.current.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          if (error.message === 'Authentication error') {
            navigate('/login');
          }
        });

        socketRef.current.on('error', (error) => {
          console.error('Socket error:', error);
          // Handle socket errors as needed
        });
      } catch (error) {
        console.error('Error initializing mediasoup:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    initializeMediasoup();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, navigate]);

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const leaveCall = () => {
    socketRef.current?.emit('leaveRoom', roomId);
    socketRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(track => track.stop());
    navigate('/login');
  };

  if (loading) {
    return <div>Connecting to room...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="video-room-container">
      <div className="video-room-header">
        <h2>Virtual Library Room</h2>
        <div className="participant-count">
          <Badge badgeContent={consumers.size + 1} color="primary">
            <PeopleIcon />
          </Badge>
        </div>
      </div>

      <div className={`video-grid participants-${consumers.size + 1}`}>
        <div className={`video-container local ${!streamRef.current?.getAudioTracks()[0]?.enabled ? 'muted' : ''}`}>
          <video 
            ref={videoRef}
            muted 
            autoPlay 
            playsInline 
          />
          <div className="video-overlay">
            <div className="participant-name">
              <Badge color={!streamRef.current?.getAudioTracks()[0]?.enabled ? "error" : "success"} variant="dot">
                You
              </Badge>
            </div>
          </div>
        </div>
        {Array.from(consumers.values()).map((consumer, index) => (
          <VideoParticipant key={consumer.id || index} consumer={consumer} />
        ))}
      </div>

      <div className="control-bar">
        <div className="room-controls">
          <Tooltip title={isAudioEnabled ? "Mute" : "Unmute"}>
            <IconButton onClick={toggleMute} className={`control-btn ${!isAudioEnabled ? 'active' : ''}`}>
              {isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={isVideoEnabled ? "Stop Video" : "Start Video"}>
            <IconButton onClick={toggleVideo} className={`control-btn ${!isVideoEnabled ? 'active' : ''}`}>
              {isVideoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Leave Call">
            <IconButton onClick={leaveCall} className="control-btn leave-btn">
              <CallEndIcon />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <div className="participant-sidebar">
        <h3>Participants ({consumers.size + 1})</h3>
        <ul className="participant-list">
          <li>
            <Avatar sx={{ bgcolor: '#64ffda' }}>Y</Avatar>
            <span>You {!streamRef.current?.getAudioTracks()[0]?.enabled && '(muted)'}</span>
          </li>
          {Array.from(consumers.values()).map(consumer => (
            <li key={consumer.id}>
              <Avatar sx={{ bgcolor: '#57cbff' }}>
                {consumer.name.charAt(0)}
              </Avatar>
              <span>{consumer.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default VideoRoom;