const mediasoup = require('mediasoup');

class MediaServer {
  constructor() {
    this.workers = [];
    this.rooms = new Map();
    this.workerIndex = 0;
  }

  async initialize(numWorkers = 4) {
    try {
      for (let i = 0; i < numWorkers; i++) {
        const worker = await mediasoup.createWorker({
          logLevel: 'warn',
          rtcMinPort: parseInt(process.env.MEDIASOUP_MIN_PORT) + (i * 1000),
          rtcMaxPort: parseInt(process.env.MEDIASOUP_MIN_PORT) + ((i + 1) * 1000) - 1,
        });
        this.workers.push(worker);
        console.log(`MediaSoup Worker ${i + 1} initialized`);
      }
    } catch (error) {
      console.error('MediaSoup initialization failed:', error);
      throw error;
    }
  }

  async createRoom(roomId) {
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;

    const router = await worker.createRouter({
      mediaCodecs: [
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000
          }
        },
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2
        }
      ]
    });

    this.rooms.set(roomId, router);
    return router;
  }

  async createTransport(router, isProducer) {
    return await router.createWebRtcTransport({
      listenIps: [{ ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0', announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP }],
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
      maxSctpMessageSize: 262144,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });
  }

  async cleanup() {
    try {
      for (const worker of this.workers) {
        await worker.close();
      }
      this.workers = [];
      this.rooms.clear();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

module.exports = new MediaServer(); 