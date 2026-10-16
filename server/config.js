import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '..', 'data', 'web-config.json');

const DEFAULT_CONFIG = {
  webServer: {
    port: 3000,
    host: '0.0.0.0'
  },
  connectionSettings: {
    serverAutoConnect: true,
    broadcastPort: 8888,
    socketTimeout: 5000,
    lastIPV4Connection: '127.0.0.1',
    lastPortConnection: '5455',
    useGameTime: true
  },
  uiSettings: {
    theme: 'dark',
    accentColor: '#007ACC',
    enableCalloutPopup: true,
    enableTrafficStopPopup: true,
    enableIDPopup: true,
    use24Hour: false,
    playSounds: true
  },
  misc: {
    calloutDuration: '30',
    TrafficStopDuration: '30',
    IDDuration: '25'
  },
  pedHistoryArrest: {
    chanceNoCharges: 60,
    chanceMinimalCharges: 25,
    chanceFewCharges: 10,
    chanceManyCharges: 5
  },
  pedHistoryCitation: {
    chanceNoCitations: 60,
    chanceMinimalCitations: 25,
    chanceFewCitations: 10,
    chanceManyCitations: 5
  },
  pedHistoryGunPermitClass: {
    handgunChance: 50,
    shotgunChance: 22,
    longgunChance: 28
  }
};

let currentConfig = { ...DEFAULT_CONFIG };

export function loadConfig() {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const loaded = JSON.parse(data);
      currentConfig = { ...DEFAULT_CONFIG, ...loaded };
    } else {
      saveConfig(DEFAULT_CONFIG);
    }
  } catch (err) {
    console.error('[Config] Error loading config, using defaults:', err);
    currentConfig = { ...DEFAULT_CONFIG };
  }
  return currentConfig;
}

export function getConfig() {
  return currentConfig;
}

export function saveConfig(newConfig) {
  try {
    currentConfig = { ...currentConfig, ...newConfig };
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Config] Error saving config:', err);
    return false;
  }
}
