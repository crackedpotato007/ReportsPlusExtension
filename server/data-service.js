import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';
import initSqlJs from 'sql.js';
import { generateProceduralPed, generateProceduralVehicle, getRandomInt } from './procedural-math.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const XML_DIR = DATA_DIR;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ''
});

let SQL = null;
let customReportDbs = {};

export async function initDatabaseEngine() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  ensureDataDirs();
}

function ensureDataDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const customLogsDir = path.join(DATA_DIR, 'DataLogs', 'Custom');
  if (!fs.existsSync(customLogsDir)) {
    fs.mkdirSync(customLogsDir, { recursive: true });
  }
}

// -------------------------------------------------------------
// Charges & Citations
// -------------------------------------------------------------
let cachedCharges = null;
let cachedCitations = null;

export function loadCharges() {
  if (cachedCharges) return cachedCharges;
  const filePath = path.join(XML_DIR, 'Charges.xml');
  try {
    if (fs.existsSync(filePath)) {
      const xmlData = fs.readFileSync(filePath, 'utf-8');
      const parsed = xmlParser.parse(xmlData);
      const groups = parsed?.Charges?.ChargeGroup || [];
      const normalized = (Array.isArray(groups) ? groups : [groups]).map(group => {
        const charges = Array.isArray(group.Charge) ? group.Charge : [group.Charge];
        return {
          groupName: group.name,
          charges: charges.filter(Boolean)
        };
      });
      cachedCharges = normalized;
      return cachedCharges;
    }
  } catch (err) {
    console.error('[DataService] Error parsing Charges.xml:', err);
  }
  return [];
}

export function loadCitations() {
  if (cachedCitations) return cachedCitations;
  const filePath = path.join(XML_DIR, 'Citations.xml');
  try {
    if (fs.existsSync(filePath)) {
      const xmlData = fs.readFileSync(filePath, 'utf-8');
      const parsed = xmlParser.parse(xmlData);
      const groups = parsed?.Citations?.CitationGroup || [];
      const normalized = (Array.isArray(groups) ? groups : [groups]).map(group => {
        const citations = Array.isArray(group.Citation) ? group.Citation : [group.Citation];
        return {
          groupName: group.name,
          citations: citations.filter(Boolean)
        };
      });
      cachedCitations = normalized;
      return cachedCitations;
    }
  } catch (err) {
    console.error('[DataService] Error parsing Citations.xml:', err);
  }
  return [];
}

export function loadCustomizationData() {
  const filePath = path.join(XML_DIR, 'customization.json');
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error('[DataService] Error loading customization.json:', err);
  }
  return { agencies: [], ranks: [], divisions: [] };
}

// -------------------------------------------------------------
// Officer User Profiles
// -------------------------------------------------------------
const USERS_FILE = path.join(DATA_DIR, 'user-profiles.json');

export function loadUserProfiles() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[DataService] Error reading user profiles:', err);
  }
  const defaultProfiles = [
    {
      name: "John Davis",
      agency: "Los Santos Police Department [LSPD]",
      division: "Patrol Operations",
      rank: "Police Officer III",
      number: "1842",
      callsign: "1-LINCOLN-18"
    }
  ];
  saveUserProfiles(defaultProfiles);
  return defaultProfiles;
}

export function saveUserProfiles(profiles) {
  try {
    ensureDataDirs();
    fs.writeFileSync(USERS_FILE, JSON.stringify(profiles, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[DataService] Error saving user profiles:', err);
    return false;
  }
}

// -------------------------------------------------------------
// Callouts & CAD
// -------------------------------------------------------------
const CALLOUTS_FILE = path.join(DATA_DIR, 'callouts.json');

export function loadCallouts() {
  try {
    if (fs.existsSync(CALLOUTS_FILE)) {
      return JSON.parse(fs.readFileSync(CALLOUTS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[DataService] Error reading callouts.json:', err);
  }
  return { active: [], history: [] };
}

export function saveCallouts(calloutState) {
  try {
    ensureDataDirs();
    fs.writeFileSync(CALLOUTS_FILE, JSON.stringify(calloutState, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[DataService] Error saving callouts:', err);
    return false;
  }
}

export function addOrUpdateCallout(calloutData) {
  const state = loadCallouts();
  const existingIndex = state.active.findIndex(c => String(c.number).trim() === String(calloutData.number).trim());
  
  const callout = {
    number: calloutData.number || String(getRandomInt(100, 999)),
    type: calloutData.type || "Callout",
    description: calloutData.description || "",
    message: calloutData.message || "",
    priority: calloutData.priority || "Code 2",
    street: calloutData.street || "Vinewood Blvd",
    area: calloutData.area || "Los Santos",
    county: calloutData.county || "Los Santos County",
    startTime: calloutData.startTime || new Date().toLocaleTimeString(),
    startDate: calloutData.startDate || new Date().toLocaleDateString(),
    status: calloutData.status || "Not Responded",
    updates: calloutData.updates || [calloutData.message || "Call dispatched to unit."]
  };

  if (existingIndex >= 0) {
    state.active[existingIndex] = { ...state.active[existingIndex], ...callout };
  } else {
    state.active.unshift(callout);
  }

  saveCallouts(state);
  return callout;
}

export function updateCalloutStatus(number, newStatus) {
  const state = loadCallouts();
  const index = state.active.findIndex(c => String(c.number).trim() === String(number).trim());
  if (index >= 0) {
    state.active[index].status = newStatus;
    if (newStatus === "Completed" || newStatus === "Cancelled" || newStatus === "Timed Out" || newStatus === "Finished") {
      const completed = state.active.splice(index, 1)[0];
      state.history.unshift(completed);
    }
    saveCallouts(state);
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// Lookups History (Peds & Vehicles)
// -------------------------------------------------------------
const PED_HISTORY_FILE = path.join(DATA_DIR, 'ped-history.json');
const VEH_HISTORY_FILE = path.join(DATA_DIR, 'veh-history.json');

export function loadPedHistory() {
  try {
    if (fs.existsSync(PED_HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(PED_HISTORY_FILE, 'utf-8'));
    }
  } catch (err) {}
  return [];
}

export function savePedHistory(history) {
  try {
    ensureDataDirs();
    fs.writeFileSync(PED_HISTORY_FILE, JSON.stringify(history.slice(0, 100), null, 2), 'utf-8');
  } catch (err) {}
}

export function loadVehHistory() {
  try {
    if (fs.existsSync(VEH_HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(VEH_HISTORY_FILE, 'utf-8'));
    }
  } catch (err) {}
  return [];
}

export function saveVehHistory(history) {
  try {
    ensureDataDirs();
    fs.writeFileSync(VEH_HISTORY_FILE, JSON.stringify(history.slice(0, 100), null, 2), 'utf-8');
  } catch (err) {}
}

// -------------------------------------------------------------
// Court Cases & Automation
// -------------------------------------------------------------
const COURT_FILE = path.join(DATA_DIR, 'court-cases.json');

export function loadCourtCases() {
  try {
    if (fs.existsSync(COURT_FILE)) {
      return JSON.parse(fs.readFileSync(COURT_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[DataService] Error reading court-cases.json:', err);
  }
  return [];
}

export function saveCourtCases(cases) {
  try {
    ensureDataDirs();
    fs.writeFileSync(COURT_FILE, JSON.stringify(cases, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[DataService] Error saving court cases:', err);
    return false;
  }
}

export function addCourtCase(caseData) {
  const cases = loadCourtCases();
  const caseNumber = caseData.caseNumber || `CR-${new Date().getFullYear()}-${getRandomInt(1000, 9999)}`;
  const revealTimestamp = Date.now() + (caseData.delaySeconds || 180) * 1000;
  
  const newCase = {
    caseNumber,
    offenderName: caseData.offenderName || "Unknown",
    charges: caseData.charges || [],
    type: caseData.type || "Citation",
    filingOfficer: caseData.filingOfficer || "Patrol",
    scheduledCourtDate: caseData.scheduledCourtDate || new Date(Date.now() + 14 * 86400000).toLocaleDateString(),
    status: "Pending Trial",
    revealTimestamp,
    verdict: null,
    penalties: null,
    createdAt: new Date().toISOString()
  };

  cases.unshift(newCase);
  saveCourtCases(cases);
  return newCase;
}

export function processPendingCourtCases() {
  const cases = loadCourtCases();
  let updated = false;
  const now = Date.now();

  for (const c of cases) {
    if (c.status === "Pending Trial" && c.revealTimestamp && now >= c.revealTimestamp) {
      const verdictRoll = Math.random() * 100;
      let verdict = "Guilty";
      if (verdictRoll < 15) verdict = "Dismissed";
      else if (verdictRoll < 35) verdict = "Plea Bargain";
      else if (verdictRoll < 45) verdict = "Not Guilty";
      
      let fineTotal = 0;
      let jailTimeMonths = 0;
      let probationMonths = 0;
      let licenseSuspendedMonths = 0;

      if (verdict === "Guilty" || verdict === "Plea Bargain") {
        fineTotal = getRandomInt(250, 2500);
        if (c.type === "Arrest") {
          jailTimeMonths = getRandomInt(6, 36);
          probationMonths = getRandomInt(12, 24);
        }
        if (Math.random() < 0.3) {
          licenseSuspendedMonths = getRandomInt(3, 12);
        }
      }

      c.status = "Verdict Rendered";
      c.verdict = verdict;
      c.penalties = {
        fine: fineTotal,
        jailMonths: jailTimeMonths,
        probationMonths: probationMonths,
        suspensionMonths: licenseSuspendedMonths
      };
      c.resolvedAt = new Date().toISOString();
      updated = true;
    }
  }

  if (updated) {
    saveCourtCases(cases);
  }
  return cases;
}

// -------------------------------------------------------------
// Notepad tabs
// -------------------------------------------------------------
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

export function loadNotes() {
  try {
    if (fs.existsSync(NOTES_FILE)) {
      return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf-8'));
    }
  } catch (err) {}
  return [
    { id: "1", title: "Patrol Notes", content: "Shift started. 10-8 Los Santos Central." }
  ];
}

export function saveNotes(notes) {
  try {
    ensureDataDirs();
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
}

// -------------------------------------------------------------
// Custom Reports & SQLite Dynamic Storage
// -------------------------------------------------------------
const DEFAULT_REPORT_TYPES = [
  "Citation Report",
  "Arrest Report",
  "Traffic Stop Report",
  "Callout Report",
  "Impound Report",
  "Search Report",
  "Accident Report",
  "Death Report",
  "Patrol Report",
  "Incident Report",
  "Use of Force Report"
];

const REPORTS_STORE_FILE = path.join(DATA_DIR, 'filed-reports.json');

export function loadFiledReports() {
  try {
    if (fs.existsSync(REPORTS_STORE_FILE)) {
      return JSON.parse(fs.readFileSync(REPORTS_STORE_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[DataService] Error reading filed-reports.json:', err);
  }
  return [];
}

export function saveFiledReports(reports) {
  try {
    ensureDataDirs();
    fs.writeFileSync(REPORTS_STORE_FILE, JSON.stringify(reports, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[DataService] Error saving filed-reports.json:', err);
    return false;
  }
}

export function fileNewReport(reportData) {
  const reports = loadFiledReports();
  const reportNumber = reportData.number || `RPT-${getRandomInt(10000, 99999)}`;
  const record = {
    ...reportData,
    number: reportNumber,
    timestamp: new Date().toISOString(),
    status: reportData.status || "Submitted"
  };
  reports.unshift(record);
  saveFiledReports(reports);

  // If report has citation/arrest charges, automatically link to court case
  if (reportData.type === "Citation Report" || reportData.type === "Arrest Report") {
    addCourtCase({
      offenderName: reportData.offenderName || reportData.name || "Unknown",
      charges: reportData.charges || [reportData.primaryCharge || "Traffic Violation"],
      type: reportData.type === "Arrest Report" ? "Arrest" : "Citation",
      filingOfficer: reportData.officerName || "Reporting Officer",
      delaySeconds: 120
    });
  }

  return record;
}

export function getReportTypes() {
  return DEFAULT_REPORT_TYPES;
}
