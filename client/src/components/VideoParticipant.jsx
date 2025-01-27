import React, { useRef, useEffect } from 'react';

const VideoParticipant = ({ consumer }) => {
  const ref = useRef();

  useEffect(() => {
    consumer.on('transportclose', () => {
      console.log('Consumer transport closed');
    });

    consumer.on('producerclose', () => {
      console.log('Consumer producer closed');
    });

    consumer.on('trackended', () => {
      console.log('Consumer track ended');
    });

    consumer.on('track', track => {
      if (ref.current) {
        ref.current.srcObject = new MediaStream([track]);
      }
    });

    return () => {
      consumer.close();
    };
  }, [consumer]);

  return (
    <div className="video-container remote">
      <video ref={ref} autoPlay playsInline />
      <div className="video-overlay">
        <div className="participant-name">
          {consumer.name || 'Participant'}
        </div>
      </div>
    </div>
  );
};

export default VideoParticipant; 