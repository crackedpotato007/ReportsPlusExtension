import net from 'net';
import dgram from 'dgram';
import { XMLParser } from 'fast-xml-parser';
import { getConfig, saveConfig } from './config.js';
import { addOrUpdateCallout } from './data-service.js';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ''
});

class LSPDFRClient {
  constructor() {
    this.controlSocket = null;
    this.isConnected = false;
    this.host = null;
    this.port = null;
    this.serverVersion = null;
    this.eventListeners = new Set();
    this.udpSocket = null;
    this.gameData = {
      street: "Vinewood Blvd",
      area: "Downtown Vinewood",
      county: "Los Santos County",
      time: "12:00 PM"
    };
    this.currentTrafficStop = null;
    this.currentID = null;
    this.recentALPR = [];
    this.worldPeds = [];
    this.worldCars = [];
  }

  onEvent(callback) {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  broadcast(event, data) {
    for (const listener of this.eventListeners) {
      try {
        listener(event, data);
      } catch (err) {
        console.error('[LSPDFRClient] Listener error:', err);
      }
    }
  }

  startUDPDiscovery() {
    const config = getConfig();
    const broadcastPort = config.connectionSettings?.broadcastPort || 8888;

    try {
      if (this.udpSocket) {
        this.udpSocket.close();
      }

      this.udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.udpSocket.on('listening', () => {
        const address = this.udpSocket.address();
        console.log(`[LSPDFR UDP] Listening for server broadcasts on port ${address.port}...`);
      });

      this.udpSocket.on('message', (msg, rinfo) => {
        const messageStr = msg.toString().trim();
        if (messageStr.startsWith('SERVER_DISCOVERY:')) {
          const parts = messageStr.split(':');
          const serverPort = parseInt(parts[1], 10);
          const serverAddress = rinfo.address;
          console.log(`[LSPDFR UDP] Discovered server at ${serverAddress}:${serverPort}`);

          if (!this.isConnected) {
            this.connect(serverAddress, serverPort);
          }
        }
      });

      this.udpSocket.on('error', (err) => {
        console.warn('[LSPDFR UDP] UDP Socket warning:', err.message);
      });

      this.udpSocket.bind(broadcastPort, '0.0.0.0');
    } catch (err) {
      console.error('[LSPDFR UDP] Failed to start UDP discovery:', err.message);
    }
  }

  async connect(host, port) {
    if (this.controlSocket && !this.controlSocket.destroyed) {
      this.controlSocket.destroy();
    }

    this.host = host;
    this.port = port;
    console.log(`[LSPDFR TCP] Connecting to ${host}:${port}...`);
    this.broadcast('status', { isConnected: false, connecting: true, host, port });

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      this.controlSocket = socket;

      socket.setTimeout(10000);

      socket.connect(port, host, () => {
        console.log(`[LSPDFR TCP] Connected successfully to ${host}:${port}`);
        this.isConnected = true;
        this.broadcast('status', { isConnected: true, host, port, serverVersion: this.serverVersion });
        
        saveConfig({
          connectionSettings: {
            ...getConfig().connectionSettings,
            lastIPV4Connection: host,
            lastPortConnection: String(port)
          }
        });
        resolve(true);
      });

      let buffer = '';
      socket.on('data', async (chunk) => {
        buffer += chunk.toString('utf-8');
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (line.length > 0) {
            await this.handleServerMessage(line);
          }
        }
      });

      socket.on('timeout', () => {
        console.warn('[LSPDFR TCP] Connection timeout.');
        this.handleDisconnect('Timeout');
      });

      socket.on('error', (err) => {
        console.error(`[LSPDFR TCP] Error: ${err.message}`);
        this.handleDisconnect(err.message);
        reject(err);
      });

      socket.on('close', () => {
        console.log('[LSPDFR TCP] Socket closed.');
        this.handleDisconnect('Closed');
      });
    });
  }

  handleDisconnect(reason) {
    if (this.isConnected) {
      this.isConnected = false;
      this.broadcast('status', { isConnected: false, host: this.host, port: this.port, reason });
    }
  }

  disconnect() {
    if (this.controlSocket) {
      this.sendMessage('SHUTDOWN');
      this.controlSocket.destroy();
      this.controlSocket = null;
    }
    this.isConnected = false;
    this.broadcast('status', { isConnected: false });
  }

  sendMessage(message) {
    if (this.controlSocket && this.isConnected) {
      this.controlSocket.write(message + '\n');
      if (message !== 'HEARTBEAT') {
        console.log(`[LSPDFR TCP] Sent: ${message}`);
      }
    }
  }

  async handleServerMessage(message) {
    if (message.startsWith('VERSION=')) {
      this.serverVersion = message.split('=')[1];
      console.log(`[LSPDFR] Server version: ${this.serverVersion}`);
      this.broadcast('version', { version: this.serverVersion });
      return;
    }

    switch (message) {
      case 'HEARTBEAT':
        this.sendMessage('HEARTBEAT');
        break;

      case 'SHUTDOWN':
        console.log('[LSPDFR] Server signaled shutdown.');
        this.disconnect();
        break;

      case 'UPDATE_GAME_DATA':
        await this.handleGameDataTransfer();
        break;

      case 'UPDATE_CALLOUT':
        await this.handleCalloutTransfer();
        break;

      case 'UPDATE_TRAFFIC_STOP':
        await this.handleTrafficStopTransfer();
        break;

      case 'UPDATE_ID':
        await this.handleIDTransfer();
        break;

      case 'UPDATE_ALPR':
        await this.handleALPRTransfer();
        break;

      case 'UPDATE_WORLD_PED':
        await this.handleWorldPedTransfer();
        break;

      case 'UPDATE_WORLD_VEH':
        await this.handleWorldVehTransfer();
        break;

      case 'UPDATE_LOOKUP':
        await this.handleLookupTransfer();
        break;

      default:
        console.log(`[LSPDFR] Received command: ${message}`);
        break;
    }
  }

  // -------------------------------------------------------------
  // Raw Data File Socket Puller
  // -------------------------------------------------------------
  pullRawFileFromServer(maxBytes) {
    return new Promise((resolve) => {
      const fileSocket = new net.Socket();
      let rawData = Buffer.alloc(0);

      fileSocket.setTimeout(4000);

      fileSocket.connect(this.port, this.host, () => {
        // Connected to file stream
      });

      fileSocket.on('data', (chunk) => {
        rawData = Buffer.concat([rawData, chunk]);
        if (rawData.length >= maxBytes) {
          fileSocket.destroy();
        }
      });

      fileSocket.on('timeout', () => {
        fileSocket.destroy();
        resolve(rawData.toString('utf-8'));
      });

      fileSocket.on('error', (err) => {
        fileSocket.destroy();
        resolve(rawData.toString('utf-8'));
      });

      fileSocket.on('close', () => {
        resolve(rawData.toString('utf-8'));
      });
    });
  }

  async handleGameDataTransfer() {
    try {
      const raw = await this.pullRawFileFromServer(1024);
      if (!raw) return;
      
      const parts = raw.split('|');
      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k && v) {
          const key = k.trim().toLowerCase();
          const val = v.trim();
          if (key === 'location') {
            const locParts = val.split(',').map(s => s.trim());
            this.gameData.street = locParts[0] || '';
            this.gameData.area = locParts[1] || '';
            this.gameData.county = locParts[2] || '';
          } else if (key === 'time') {
            this.gameData.time = val;
          }
        }
      }
      this.broadcast('game_data', this.gameData);
    } catch (err) {
      console.error('[LSPDFR] Error reading GameData:', err);
    }
  }

  async handleCalloutTransfer() {
    try {
      const rawXml = await this.pullRawFileFromServer(1024);
      if (!rawXml) return;

      const parsed = xmlParser.parse(rawXml);
      const rawObj = parsed?.Callouts?.Callout || parsed?.Callout || parsed;
      const calloutObj = Array.isArray(rawObj) ? rawObj[rawObj.length - 1] : rawObj;

      if (calloutObj && (calloutObj.Number || calloutObj.number || calloutObj.Type || calloutObj.Name)) {
        const config = getConfig();
        const autoRespond = config.connectionSettings?.autoRespondCallouts || false;
        const callout = addOrUpdateCallout({
          number: String(calloutObj.Number || calloutObj.number || Math.floor(Math.random() * 900 + 100)),
          type: calloutObj.Type || calloutObj.type || calloutObj.Name || calloutObj.name || "Callout",
          description: calloutObj.Description || calloutObj.description || calloutObj.Name || "",
          message: calloutObj.Message || calloutObj.message || "",
          priority: calloutObj.Priority || calloutObj.priority || "Code 2",
          street: calloutObj.Street || calloutObj.street || this.gameData.street,
          area: calloutObj.Area || calloutObj.area || this.gameData.area,
          county: calloutObj.County || calloutObj.county || this.gameData.county,
          startTime: calloutObj.StartTime || calloutObj.startTime || new Date().toLocaleTimeString(),
          startDate: calloutObj.StartDate || calloutObj.startDate || new Date().toLocaleDateString(),
          status: autoRespond ? "Responded" : (calloutObj.Status || calloutObj.status || "Not Responded")
        });
        console.log(`[LSPDFR] New Callout #${callout.number}: ${callout.type} (${callout.status})`);
        this.broadcast('callout', callout);
      }
    } catch (err) {
      console.error('[LSPDFR] Error parsing Callout XML:', err);
    }
  }

  async handleTrafficStopTransfer() {
    try {
      const raw = await this.pullRawFileFromServer(1024);
      if (!raw) return;

      const dataMap = {};
      const pairs = raw.split('&');
      for (const pair of pairs) {
        const [k, v] = pair.split('=');
        if (k && v) {
          dataMap[k.trim().toLowerCase()] = v.trim();
        }
      }

      this.currentTrafficStop = {
        licensePlate: dataMap.licenseplate || "",
        model: dataMap.model || "",
        color: dataMap.color || "",
        owner: dataMap.owner || "",
        registration: dataMap.registration || "Valid",
        insurance: dataMap.insurance || "Valid",
        stolen: dataMap.isstolen || "No",
        street: dataMap.street || this.gameData.street,
        area: dataMap.area || this.gameData.area,
        timestamp: new Date().toLocaleTimeString()
      };

      console.log(`[LSPDFR] Traffic Stop: ${this.currentTrafficStop.model} [${this.currentTrafficStop.licensePlate}]`);
      this.broadcast('traffic_stop', this.currentTrafficStop);
    } catch (err) {
      console.error('[LSPDFR] Error handling Traffic Stop:', err);
    }
  }

  async handleIDTransfer() {
    try {
      const rawXml = await this.pullRawFileFromServer(4096);
      if (!rawXml) return;

      const parsed = xmlParser.parse(rawXml);
      const idObj = parsed?.ID || parsed?.IDs?.ID || parsed;

      if (idObj) {
        this.currentID = {
          name: idObj.Name || idObj.name || "",
          birthday: idObj.Birthday || idObj.birthday || "",
          gender: idObj.Gender || idObj.gender || "",
          address: idObj.Address || idObj.address || "",
          height: idObj.Height || idObj.height || "",
          weight: idObj.Weight || idObj.weight || "",
          pedModel: idObj.PedModel || idObj.pedModel || "",
          licenseNumber: idObj.LicenseNumber || idObj.licenseNumber || "",
          status: idObj.Status || idObj.status || "Valid",
          expiration: idObj.Expiration || idObj.expiration || "",
          timestamp: new Date().toLocaleTimeString()
        };

        console.log(`[LSPDFR] ID Checked: ${this.currentID.name} (${this.currentID.status})`);
        this.broadcast('id_card', this.currentID);
      }
    } catch (err) {
      console.error('[LSPDFR] Error parsing ID XML:', err);
    }
  }

  async handleALPRTransfer() {
    try {
      const raw = await this.pullRawFileFromServer(4096);
      if (!raw) return;

      const entries = raw.split('|');
      for (const entry of entries) {
        if (!entry.trim()) continue;
        const dataMap = {};
        for (const pair of entry.split('&')) {
          const [k, v] = pair.split('=');
          if (k && v) dataMap[k.trim()] = v.trim();
        }

        if (dataMap.licenseplate) {
          const scan = {
            licensePlate: dataMap.licenseplate,
            plateType: dataMap.plateType || "Standard",
            speed: parseFloat(dataMap.speed || 0),
            distance: parseFloat(dataMap.distance || 0),
            scanner: dataMap.scanner || "Front",
            flags: dataMap.flags ? dataMap.flags.split(',').filter(Boolean) : [],
            timestamp: new Date().toLocaleTimeString()
          };

          this.recentALPR.unshift(scan);
          if (this.recentALPR.length > 50) this.recentALPR.pop();
          this.broadcast('alpr', scan);
        }
      }
    } catch (err) {
      console.error('[LSPDFR] Error handling ALPR:', err);
    }
  }

  async handleWorldPedTransfer() {
    try {
      const raw = await this.pullRawFileFromServer(8192);
      if (!raw) return;
      const peds = [];
      for (const p of raw.split('|')) {
        if (!p.trim()) continue;
        const map = {};
        for (const attr of p.split('&')) {
          const [k, v] = attr.split('=');
          if (k && v) map[k.trim().toLowerCase()] = v.trim();
        }
        if (map.name) peds.push(map);
      }
      this.worldPeds = peds;
    } catch (err) {}
  }

  async handleWorldVehTransfer() {
    try {
      const raw = await this.pullRawFileFromServer(16384);
      if (!raw) return;
      const cars = [];
      for (const c of raw.split('|')) {
        if (!c.trim()) continue;
        const map = {};
        for (const attr of c.split('&')) {
          const [k, v] = attr.split('=');
          if (k && v) map[k.trim().toLowerCase()] = v.trim();
        }
        if (map.licenseplate) cars.push(map);
      }
      this.worldCars = cars;
    } catch (err) {}
  }

  async handleLookupTransfer() {
    try {
      const raw = await this.pullRawFileFromServer(256);
      if (raw && raw.trim()) {
        const query = raw.trim();
        console.log(`[LSPDFR] In-game lookup request: ${query}`);
        this.broadcast('in_game_lookup', { query });
      }
    } catch (err) {}
  }

  sendCitationUpdate({ name, plate, type = 1, charges = [], fine = 0, arrestable = false }) {
    const chargesStr = Array.isArray(charges) ? charges.join(',') : charges;
    const msg = `CITATION_UPDATE:name=${name.trim()}|plate=${plate.trim()}|type=${type}|charges=${chargesStr}|fine=${fine}|arrestable=${arrestable}`;
    this.sendMessage(msg);
  }
}

export const lspdfrClient = new LSPDFRClient();
