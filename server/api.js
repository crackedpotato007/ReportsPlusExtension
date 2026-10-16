import express from 'express';
import cors from 'cors';
import os from 'os';
import path from 'path';
import { lspdfrClient } from './lspdfr-client.js';
import { getConfig, saveConfig } from './config.js';
import {
  loadCharges,
  loadCitations,
  loadCustomizationData,
  loadUserProfiles,
  saveUserProfiles,
  loadCallouts,
  addOrUpdateCallout,
  updateCalloutStatus,
  loadPedHistory,
  savePedHistory,
  loadVehHistory,
  saveVehHistory,
  loadCourtCases,
  addCourtCase,
  processPendingCourtCases,
  loadNotes,
  saveNotes,
  loadFiledReports,
  fileNewReport,
  getReportTypes
} from './data-service.js';
import { generateProceduralPed, generateProceduralVehicle } from './procedural-math.js';
import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

export function normalizeWorldPed(map) {
  if (!map || !map.name) return null;
  const isWanted = map.iswanted === 'true' || map.iswanted === true || map.iswanted === 'True';
  const onParole = map.isonparole === 'true' || map.isonparole === 'True';
  const onProbation = map.isonprobation === 'true' || map.isonprobation === 'True';
  const flags = [];
  if (onParole) flags.push("On Parole");
  if (onProbation) flags.push("On Probation");
  if (map.ispolice === 'true' || map.ispolice === 'True') flags.push("Law Enforcement Officer");

  const dobParts = (map.birthday || '').split('/');
  const birthYear = dobParts.length === 3 ? parseInt(dobParts[2], 10) : 2000;
  const age = Math.max(18, new Date().getFullYear() - birthYear);

  return {
    name: map.name,
    firstName: map.name.split(' ')[0] || '',
    lastName: map.name.split(' ').slice(1).join(' ') || '',
    gender: map.gender || 'Unknown',
    birthday: map.birthday || '--',
    age,
    height: map.height || "--",
    weight: map.weight || "--",
    address: map.address || "--",
    pedModel: map.pedmodel || "",
    licenseNumber: map.licensenumber || "--",
    licenseStatus: map.licensestatus || "Valid",
    licenseExpiration: map.licenseexpiration || "--",
    gunPermitStatus: map.weaponpermitstatus || "None",
    gunPermitClass: map.weaponpermittype || "None",
    gunPermitExpiration: map.weaponpermitexpiration || "--",
    fishingPermit: map.fishpermitstatus || "None",
    huntingPermit: map.huntpermitstatus || "None",
    activeWarrant: isWanted,
    warrantDetails: isWanted ? "Active Felony Arrest Warrant" : null,
    totalStops: parseInt(map.timesstopped || 0, 10),
    arrestCount: 0,
    citationCount: map.timesstopped ? Math.min(parseInt(map.timesstopped, 10), 2) : 0,
    flags,
    isProcedural: false,
    fromWorld: true
  };
}

export function normalizeWorldVeh(map) {
  if (!map || !map.licenseplate) return null;
  const isStolen = map.isstolen === 'true' || map.isstolen === true || map.isstolen === 'True';
  const flags = [];
  if (isStolen) flags.push("REPORTED STOLEN");
  if (map.registration && map.registration.toLowerCase() !== 'valid') flags.push(`Reg: ${map.registration}`);
  if (map.insurance && map.insurance.toLowerCase() !== 'valid') flags.push(`Ins: ${map.insurance}`);

  return {
    plateNumber: (map.licenseplate || "").toUpperCase(),
    model: map.model || "Vehicle",
    color: map.color || "Unknown",
    owner: map.owner || "Unknown",
    registrationStatus: map.registration || "Valid",
    insuranceStatus: map.insurance || "Valid",
    stolen: isStolen,
    flags,
    isProcedural: false,
    fromWorld: true
  };
}

export function getLocalIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

export function createApiRouter(wss) {
  const router = express.Router();
  router.use(express.json());
  router.use(cors());

  // Broadcast to all connected web clients
  function broadcastWS(type, data) {
    const payload = JSON.stringify({ type, data });
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(payload);
      }
    });
  }

  // Hook LSPDFR client events to WebSockets
  lspdfrClient.onEvent((event, data) => {
    broadcastWS(event, data);
  });

  // Background processor for Court trials every 5 seconds
  setInterval(() => {
    const updatedCases = processPendingCourtCases();
    // If any case changed status, broadcast
    const rendered = updatedCases.filter(c => c.status === "Verdict Rendered");
    if (rendered.length > 0) {
      broadcastWS('court_updated', updatedCases);
    }
  }, 5000);

  // Background monitor for GTA V callout.xml changes (e.g. accepted in-game via Y key)
  const diskCalloutPath = "F:\\GTAV\\ReportsPlus\\data\\callout.xml";
  let lastCalloutMtime = 0;
  let lastDispatchedCalloutNumber = null;
  setInterval(() => {
    try {
      if (fs.existsSync(diskCalloutPath)) {
        const stats = fs.statSync(diskCalloutPath);
        if (stats.mtimeMs > lastCalloutMtime) {
          lastCalloutMtime = stats.mtimeMs;
          const raw = fs.readFileSync(diskCalloutPath, 'utf-8');
          if (raw && raw.trim().length > 0) {
            const parsed = xmlParser.parse(raw);
            const rawObj = parsed?.Callouts?.Callout || parsed?.Callout || parsed;
            const list = Array.isArray(rawObj) ? rawObj : (rawObj ? [rawObj] : []);
            let changed = false;
            for (const item of list) {
              if (item && (item.Number || item.number || item.Name || item.Type)) {
                const calloutNum = String(item.Number || item.number || '101');
                const calloutObj = addOrUpdateCallout({
                  number: calloutNum,
                  type: item.Type || item.type || item.Name || 'Callout',
                  description: item.Description || item.description || '',
                  message: item.Message || item.message || '',
                  priority: item.Priority || item.priority || 'Code 2',
                  street: item.Street || item.street || '',
                  area: item.Area || item.area || '',
                  county: item.County || item.county || '',
                  startTime: item.StartTime || item.startTime || '',
                  startDate: item.StartDate || item.startDate || '',
                  status: item.Status || item.status || 'Not Responded'
                });
                changed = true;

                // When a new callout is dispatched (status Not Responded) or has a new ID, broadcast 'callout' to open alert popup
                if (calloutObj.status === 'Not Responded' && lastDispatchedCalloutNumber !== calloutNum) {
                  lastDispatchedCalloutNumber = calloutNum;
                  console.log(`[CAD] Broadcasting Callout Alert Popup for #${calloutNum} (${calloutObj.type})`);
                  broadcastWS('callout', calloutObj);
                }
              }
            }
            if (changed) {
              broadcastWS('callouts_updated', loadCallouts());
            }
          }
        }
      }
    } catch (e) {}
  }, 1000);

  // -----------------------------------------------------------
  // Status & Connectivity
  // -----------------------------------------------------------
  router.get('/status', (req, res) => {
    res.json({
      isConnected: lspdfrClient.isConnected,
      host: lspdfrClient.host,
      port: lspdfrClient.port,
      serverVersion: lspdfrClient.serverVersion,
      gameData: lspdfrClient.gameData,
      localIPs: getLocalIPAddresses(),
      config: getConfig()
    });
  });

  router.post('/connect', async (req, res) => {
    const { host, port } = req.body;
    if (!host || !port) {
      return res.status(400).json({ error: "Host and port are required" });
    }
    try {
      await lspdfrClient.connect(host, parseInt(port, 10));
      res.json({ success: true, message: `Connected to ${host}:${port}` });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/disconnect', (req, res) => {
    lspdfrClient.disconnect();
    res.json({ success: true, message: "Disconnected" });
  });

  // -----------------------------------------------------------
  // Profiles
  // -----------------------------------------------------------
  router.get('/profiles', (req, res) => {
    res.json(loadUserProfiles());
  });

  router.post('/profiles', (req, res) => {
    const profiles = req.body;
    if (Array.isArray(profiles)) {
      saveUserProfiles(profiles);
      broadcastWS('profiles_updated', profiles);
      return res.json({ success: true, profiles });
    }
    res.status(400).json({ error: "Expected an array of profiles" });
  });

  // -----------------------------------------------------------
  // Lookups (Integrated with Live Game Data & Policing Redefined)
  // -----------------------------------------------------------
  router.get('/lookup/ped', (req, res) => {
    const { name } = req.query;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const cleanName = name.trim().toLowerCase();
    const history = loadPedHistory();

    // 1. Check in-memory world peds received from game TCP
    let rawPed = lspdfrClient.worldPeds.find(p => p.name && p.name.toLowerCase() === cleanName);

    // 2. Fallback: Read directly from GTA V game folder F:\GTAV\ReportsPlus\data\worldPeds.data
    if (!rawPed) {
      try {
        const diskPath = "F:\\GTAV\\ReportsPlus\\data\\worldPeds.data";
        if (fs.existsSync(diskPath)) {
          const raw = fs.readFileSync(diskPath, 'utf-8');
          for (const entry of raw.split('|')) {
            if (!entry.trim()) continue;
            const map = {};
            for (const attr of entry.split('&')) {
              const [k, v] = attr.split('=');
              if (k && v) map[k.trim().toLowerCase()] = v.trim();
            }
            if (map.name && map.name.toLowerCase() === cleanName) {
              rawPed = map;
              break;
            }
          }
        }
      } catch (err) {}
    }

    // 3. Fallback: Check currentID.xml in GTA V game folder
    if (!rawPed) {
      try {
        const idPath = "F:\\GTAV\\ReportsPlus\\data\\currentID.xml";
        if (fs.existsSync(idPath)) {
          const raw = fs.readFileSync(idPath, 'utf-8');
          const parsed = xmlParser.parse(raw);
          const idObj = parsed?.ID || parsed?.IDs?.ID;
          if (idObj && idObj.Name && idObj.Name.toLowerCase() === cleanName) {
            rawPed = {
              name: idObj.Name,
              licensenumber: idObj.LicenseNumber,
              pedmodel: idObj.PedModel,
              birthday: idObj.Birthday,
              gender: idObj.Gender,
              height: idObj.Height,
              weight: idObj.Weight,
              address: idObj.Address,
              licensestatus: idObj.Status || "Valid",
              licenseexpiration: idObj.Expiration
            };
          }
        }
      } catch (err) {}
    }

    // If found from game/Policing Redefined:
    if (rawPed) {
      const normalized = normalizeWorldPed(rawPed);
      // Replace any existing procedural or stale record in history
      const histIdx = history.findIndex(p => p.name && p.name.toLowerCase() === cleanName);
      if (histIdx >= 0) {
        history[histIdx] = normalized;
      } else {
        history.unshift(normalized);
      }
      savePedHistory(history);
      return res.json(normalized);
    }

    // 4. Check existing history (prefer verified non-procedural)
    const histMatch = history.find(p => p.name && p.name.toLowerCase() === cleanName && !p.isProcedural);
    if (histMatch) {
      return res.json(histMatch);
    }

    // 5. Procedural generation for completely unknown civilians
    const generated = generateProceduralPed(name);
    const existingIdx = history.findIndex(p => p.name && p.name.toLowerCase() === cleanName);
    if (existingIdx >= 0) {
      history[existingIdx] = generated;
    } else {
      history.unshift(generated);
    }
    savePedHistory(history);
    res.json(generated);
  });

  router.get('/lookup/veh', (req, res) => {
    const { plate, owner } = req.query;
    const cleanPlate = plate ? plate.trim().toUpperCase() : null;
    const history = loadVehHistory();

    let rawVeh = null;

    if (cleanPlate) {
      // 1. Check in-memory world cars
      rawVeh = lspdfrClient.worldCars.find(c => c.licenseplate && c.licenseplate.toUpperCase() === cleanPlate);

      // 2. Fallback: Read directly from F:\GTAV\ReportsPlus\data\worldCars.data
      if (!rawVeh) {
        try {
          const vehPath = "F:\\GTAV\\ReportsPlus\\data\\worldCars.data";
          if (fs.existsSync(vehPath)) {
            const raw = fs.readFileSync(vehPath, 'utf-8');
            for (const entry of raw.split('|')) {
              if (!entry.trim()) continue;
              const map = {};
              for (const attr of entry.split('&')) {
                const [k, v] = attr.split('=');
                if (k && v) map[k.trim().toLowerCase()] = v.trim();
              }
              if (map.licenseplate && map.licenseplate.toUpperCase() === cleanPlate) {
                rawVeh = map;
                break;
              }
            }
          }
        } catch (err) {}
      }
    }

    if (rawVeh) {
      const normalized = normalizeWorldVeh(rawVeh);
      const histIdx = history.findIndex(c => c.plateNumber && c.plateNumber.toUpperCase() === cleanPlate);
      if (histIdx >= 0) {
        history[histIdx] = normalized;
      } else {
        history.unshift(normalized);
      }
      saveVehHistory(history);
      return res.json(normalized);
    }

    // 3. Check history
    if (cleanPlate) {
      const histMatch = history.find(c => c.plateNumber && c.plateNumber.toUpperCase() === cleanPlate);
      if (histMatch) {
        return res.json(histMatch);
      }
    }

    const generated = generateProceduralVehicle(plate, owner);
    history.unshift(generated);
    saveVehHistory(history);
    res.json(generated);
  });

  // -----------------------------------------------------------
  // Callouts (CAD)
  // -----------------------------------------------------------
  router.get('/callouts', (req, res) => {
    // Sync latest from game disk if callout.xml exists
    try {
      const diskCallout = "F:\\GTAV\\ReportsPlus\\data\\callout.xml";
      if (fs.existsSync(diskCallout)) {
        const raw = fs.readFileSync(diskCallout, 'utf-8');
        if (raw && raw.trim().length > 0) {
          const parsed = xmlParser.parse(raw);
          const rawObj = parsed?.Callouts?.Callout || parsed?.Callout || parsed;
          const list = Array.isArray(rawObj) ? rawObj : (rawObj ? [rawObj] : []);
          for (const item of list) {
            if (item && (item.Number || item.number || item.Name || item.Type)) {
              addOrUpdateCallout({
                number: String(item.Number || item.number || '101'),
                type: item.Type || item.type || item.Name || 'Callout',
                description: item.Description || item.description || '',
                message: item.Message || item.message || '',
                priority: item.Priority || item.priority || 'Code 2',
                street: item.Street || item.street || '',
                area: item.Area || item.area || '',
                county: item.County || item.county || '',
                startTime: item.StartTime || item.startTime || '',
                startDate: item.StartDate || item.startDate || '',
                status: item.Status || item.status || 'Not Responded'
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('[CAD] Error reading disk callout.xml:', e);
    }
    res.json(loadCallouts());
  });

  router.post('/callouts', (req, res) => {
    const callout = addOrUpdateCallout(req.body);
    broadcastWS('callout', callout);
    res.json(callout);
  });

  router.post('/callouts/:number/status', (req, res) => {
    const { status } = req.body;
    const success = updateCalloutStatus(req.params.number, status);

    // Communicate response or cancellation to in-game GTA V plugin
    if (status === 'Responded' || status === 'En Route') {
      try {
        const signalFile = path.join(os.tmpdir(), 'ReportsPlusCalloutSignal.txt');
        fs.writeFileSync(signalFile, 'respond');
        console.log(`[CAD] Wrote callout respond signal to ${signalFile}`);
      } catch (err) {
        console.error('[CAD] Failed writing callout signal file:', err);
      }
    } else if (status === 'Cancelled') {
      try {
        const signalFile = path.join(os.tmpdir(), 'ReportsPlusCalloutSignal.txt');
        fs.writeFileSync(signalFile, 'cancel');
        console.log(`[CAD] Wrote callout cancel signal to ${signalFile}`);
      } catch (err) {
        console.error('[CAD] Failed writing callout signal file:', err);
      }
    }

    // Also update F:\GTAV\ReportsPlus\data\callout.xml if it exists
    try {
      const gameXmlPath = 'F:\\GTAV\\ReportsPlus\\data\\callout.xml';
      if (fs.existsSync(gameXmlPath)) {
        let xml = fs.readFileSync(gameXmlPath, 'utf8');
        if (xml.includes('<Status>')) {
          xml = xml.replace(/<Status>[^<]*<\/Status>/g, `<Status>${status}</Status>`);
        } else {
          xml = xml.replace('</Callout>', `  <Status>${status}</Status>\n  </Callout>`);
        }
        fs.writeFileSync(gameXmlPath, xml, 'utf8');
      }
    } catch (e) {
      console.error('[CAD] Failed updating game callout.xml:', e);
    }

    if (success) {
      const state = loadCallouts();
      broadcastWS('callouts_updated', state);
      return res.json({ success: true, state });
    }
    res.status(404).json({ error: "Callout not found" });
  });

  // -----------------------------------------------------------
  // ALPR
  // -----------------------------------------------------------
  router.get('/alpr', (req, res) => {
    res.json(lspdfrClient.recentALPR);
  });

  router.post('/alpr/clear', (req, res) => {
    lspdfrClient.recentALPR = [];
    broadcastWS('alpr_cleared', {});
    res.json({ success: true });
  });

  // -----------------------------------------------------------
  // Traffic Stop & ID Card
  // -----------------------------------------------------------
  router.get('/traffic-stop', (req, res) => {
    res.json(lspdfrClient.currentTrafficStop || {});
  });

  router.get('/id-card', (req, res) => {
    res.json(lspdfrClient.currentID || {});
  });

  // -----------------------------------------------------------
  // Court Cases
  // -----------------------------------------------------------
  router.get('/court', (req, res) => {
    res.json(loadCourtCases());
  });

  router.post('/court', (req, res) => {
    const newCase = addCourtCase(req.body);
    broadcastWS('court_updated', loadCourtCases());
    res.json(newCase);
  });

  // -----------------------------------------------------------
  // Reports
  // -----------------------------------------------------------
  router.get('/reports', (req, res) => {
    res.json({
      types: getReportTypes(),
      filed: loadFiledReports()
    });
  });

  router.post('/reports/submit', (req, res) => {
    const report = fileNewReport(req.body);
    
    // If citation report, transmit citation to LSPDFR host
    if (report.type === "Citation Report" && report.offenderName) {
      const citType = report.citationType === "Printed Citation" ? 2 : (report.citationType === "Parking Citation" ? 3 : 1);
      const chargesArr = Array.isArray(report.charges) ? report.charges : [report.charges || ''];
      
      // 1. Send via TCP client if connected
      lspdfrClient.sendCitationUpdate({
        name: report.offenderName,
        plate: report.plateNumber || '',
        type: citType,
        charges: chargesArr,
        fine: report.totalFine || 0,
        arrestable: report.isArrestable || false
      });

      // 2. Direct signal file fallback for instant in-game execution via ReportsPlus / Policing Redefined
      try {
        const signalContent = `name=${report.offenderName.trim()}|plate=${(report.plateNumber || '').trim()}|type=${citType}|charges=${chargesArr.join(',')}|fine=${report.totalFine || 0}|arrestable=${report.isArrestable || false}`;
        const signalPath = path.join(os.tmpdir(), 'ReportsPlusSignalFile.txt');
        fs.writeFileSync(signalPath, signalContent);
        console.log(`[Citations] Direct signal file written: ${signalPath}`);
      } catch (err) {
        console.error('[Citations] Failed writing ReportsPlusSignalFile.txt:', err);
      }
    }

    broadcastWS('report_filed', report);
    res.json({ success: true, report });
  });

  // -----------------------------------------------------------
  // Reference Data: Charges, Citations & Customization
  // -----------------------------------------------------------
  router.get('/reference-data', (req, res) => {
    res.json({
      charges: loadCharges(),
      citations: loadCitations(),
      customization: loadCustomizationData()
    });
  });

  // -----------------------------------------------------------
  // Notes
  // -----------------------------------------------------------
  router.get('/notes', (req, res) => {
    res.json(loadNotes());
  });

  router.post('/notes', (req, res) => {
    saveNotes(req.body);
    broadcastWS('notes_updated', req.body);
    res.json({ success: true });
  });

  // -----------------------------------------------------------
  // Config
  // -----------------------------------------------------------
  router.get('/config', (req, res) => {
    res.json(getConfig());
  });

  router.post('/config', (req, res) => {
    saveConfig(req.body);
    broadcastWS('config_updated', getConfig());
    res.json({ success: true, config: getConfig() });
  });

  return router;
}
