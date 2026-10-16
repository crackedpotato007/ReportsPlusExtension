import { sounds } from './sound.js';

// Application State
const state = {
  currentTab: 'dashboard',
  isConnected: false,
  host: null,
  port: null,
  activeOfficer: null,
  profiles: [],
  gameData: {
    street: "Vinewood Blvd",
    area: "Downtown Vinewood",
    county: "Los Santos County",
    time: "12:00 PM"
  },
  callouts: { active: [], history: [] },
  alpr: [],
  courtCases: [],
  reports: [],
  charges: [],
  citations: [],
  customization: { agencies: [], ranks: [], divisions: [] },
  selectedChargesForReport: [],
  ws: null
};

// UI Element Selectors
const el = {
  statusDot: document.getElementById('statusDot'),
  connectionStatusText: document.getElementById('connectionStatusText'),
  locationDisplay: document.getElementById('locationDisplay'),
  gameClockDisplay: document.getElementById('gameClockDisplay'),
  officerDisplay: document.getElementById('officerDisplay'),
  activeCalloutsCount: document.getElementById('activeCalloutsCount'),
  toastContainer: document.getElementById('toastContainer'),

  // Modals
  idCardModal: document.getElementById('idCardModal'),
  trafficStopModal: document.getElementById('trafficStopModal'),
  profileModal: document.getElementById('profileModal'),

  // Quick Search
  quickPedInput: document.getElementById('quickPedInput'),
  quickPedBtn: document.getElementById('quickPedBtn'),
  quickVehInput: document.getElementById('quickVehInput'),
  quickVehBtn: document.getElementById('quickVehBtn'),

  // Ped Lookup
  pedSearchInput: document.getElementById('pedSearchInput'),
  pedSearchBtn: document.getElementById('pedSearchBtn'),
  randomPedBtn: document.getElementById('randomPedBtn'),
  pedResultContainer: document.getElementById('pedResultContainer'),

  // Veh Lookup
  vehSearchInput: document.getElementById('vehSearchInput'),
  vehSearchBtn: document.getElementById('vehSearchBtn'),
  randomVehBtn: document.getElementById('randomVehBtn'),
  vehResultContainer: document.getElementById('vehResultContainer')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  sounds.init();
  setupNavigation();
  setupEventListeners();
  await loadReferenceData();
  await loadProfiles();
  await loadSettings();
  await loadInitialState();
  connectWebSocket();
  startClocks();
});

// Toast notification helper
function showToast(title, message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'danger' ? 'toast-danger' : (type === 'success' ? 'toast-success' : '')}`;
  toast.innerHTML = `
    <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.2rem;">${title}</div>
    <div style="font-size: 0.8rem; color: #cbd5e1;">${message}</div>
  `;
  el.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// -------------------------------------------------------------
// WebSocket Real-time Connection
// -------------------------------------------------------------
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  state.ws = new WebSocket(wsUrl);

  state.ws.onopen = () => {
    console.log('[MDT WS] Connected to backend service');
  };

  state.ws.onmessage = (event) => {
    try {
      const { type, data } = JSON.parse(event.data);
      handleServerEvent(type, data);
    } catch (err) {
      console.error('[MDT WS] Message parse error:', err);
    }
  };

  state.ws.onclose = () => {
    console.warn('[MDT WS] Disconnected. Reconnecting in 3s...');
    setTimeout(connectWebSocket, 3000);
  };
}

function handleServerEvent(type, data) {
  switch (type) {
    case 'init':
      updateConnectionStatus(data.isConnected, data.host, data.port);
      if (data.gameData) updateGameData(data.gameData);
      if (data.recentALPR) {
        state.alpr = data.recentALPR;
        renderALPR();
      }
      break;

    case 'status':
      updateConnectionStatus(data.isConnected, data.host, data.port);
      if (data.isConnected) {
        showToast("LSPDFR Host Connected", `Connected to ${data.host}:${data.port}`, 'success');
      } else {
        showToast("LSPDFR Host Disconnected", data.reason || "Connection closed", 'danger');
      }
      break;

    case 'game_data':
      updateGameData(data);
      break;

    case 'callout':
      window._lastShownCallout = String(data.number);
      sounds.playCalloutChime();
      showToast("Dispatch Alert", `Callout #${data.number}: ${data.type} (${data.priority})`, 'info');
      const popupEnabled = document.getElementById('settingCalloutPopup');
      if (!popupEnabled || popupEnabled.checked) {
        showCalloutModal(data);
      }
      loadCallouts();
      break;

    case 'traffic_stop':
      sounds.playCalloutChime();
      showTrafficStopModal(data);
      break;

    case 'id_card':
      sounds.playIDCheckChime();
      showIDCardModal(data);
      break;

    case 'alpr':
      state.alpr.unshift(data);
      if (state.alpr.length > 50) state.alpr.pop();
      renderALPR();
      if (data.flags && data.flags.length > 0) {
        sounds.playAlertBeep();
        showToast("ALPR Alert Hit", `Plate [${data.licensePlate}] - ${data.flags.join(', ')}`, 'danger');
      }
      break;

    case 'court_updated':
      state.courtCases = data;
      renderCourtCases();
      break;

    case 'callouts_updated':
      state.callouts = data;
      renderCallouts();
      // If there is an active callout with 'Not Responded' that hasn't been shown in modal yet
      if (state.callouts && Array.isArray(state.callouts.active)) {
        const pendingCall = state.callouts.active.find(c => c.status === 'Not Responded');
        if (pendingCall && window._lastShownCallout !== String(pendingCall.number)) {
          window._lastShownCallout = String(pendingCall.number);
          const popupCheck = document.getElementById('settingCalloutPopup');
          if (!popupCheck || popupCheck.checked) {
            sounds.playCalloutChime();
            showCalloutModal(pendingCall);
          }
        }
      }
      break;
  }
}

function updateConnectionStatus(isConnected, host, port) {
  state.isConnected = isConnected;
  state.host = host;
  state.port = port;

  if (isConnected) {
    el.statusDot.className = "status-dot status-online";
    el.connectionStatusText.textContent = `Host: ${host}:${port}`;
  } else {
    el.statusDot.className = "status-dot status-offline";
    el.connectionStatusText.textContent = "Host: Offline";
  }
}

function updateGameData(data) {
  state.gameData = { ...state.gameData, ...data };
  const locStr = [state.gameData.street, state.gameData.area].filter(Boolean).join(', ');
  el.locationDisplay.textContent = locStr || "Los Santos";
  if (state.gameData.time) {
    el.gameClockDisplay.textContent = state.gameData.time;
  }
}

// -------------------------------------------------------------
// Navigation & Views
// -------------------------------------------------------------
function setupNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      sounds.playClickSound();
      const target = tab.getAttribute('data-tab');
      switchTab(target);
    });
  });
}

function switchTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.view-section').forEach(view => {
    view.classList.toggle('active', view.id === `view-${tabName}`);
  });

  if (tabName === 'callouts') loadCallouts();
  if (tabName === 'alpr') renderALPR();
  if (tabName === 'court') loadCourtCases();
  if (tabName === 'reports') loadReports();
  if (tabName === 'notepad') loadNotepad();
}

// -------------------------------------------------------------
// Data Loaders
// -------------------------------------------------------------
async function loadReferenceData() {
  try {
    const res = await fetch('/api/reference-data');
    const data = await res.json();
    state.charges = data.charges || [];
    state.citations = data.citations || [];
    state.customization = data.customization || { agencies: [], ranks: [], divisions: [] };
    populateChargePicker();
    populateAgencyPicker();
  } catch (err) {
    console.error('Error loading reference data:', err);
  }
}

async function loadProfiles() {
  try {
    const res = await fetch('/api/profiles');
    state.profiles = await res.json();
    if (state.profiles.length > 0) {
      setActiveOfficer(state.profiles[0]);
    }
  } catch (err) {
    console.error('Error loading profiles:', err);
  }
}

function setActiveOfficer(officer) {
  state.activeOfficer = officer;
  el.officerDisplay.textContent = officer.name;
  document.getElementById('dashOfficerName').textContent = officer.name;
  document.getElementById('dashOfficerAgency').textContent = officer.agency;
  document.getElementById('dashOfficerBadge').textContent = `Badge #${officer.number || '--'} | Callsign: ${officer.callsign || '--'}`;
}

async function loadInitialState() {
  await loadCallouts();
  try {
    const res = await fetch('/api/alpr');
    state.alpr = await res.json();
    renderALPR();
  } catch (err) {}
}

// -------------------------------------------------------------
// Pedestrian Lookup
// -------------------------------------------------------------
async function runPedLookup(query) {
  if (!query || !query.trim()) return;
  sounds.playClickSound();
  try {
    const res = await fetch(`/api/lookup/ped?name=${encodeURIComponent(query.trim())}`);
    const ped = await res.json();
    renderPedResult(ped);
  } catch (err) {
    showToast("Lookup Error", "Could not query pedestrian record", "danger");
  }
}

function renderPedResult(ped) {
  el.pedResultContainer.style.display = 'block';
  document.getElementById('pedFullName').textContent = ped.name;
  document.getElementById('pedGenderAge').textContent = `${ped.gender || 'Unknown'}, Age ${ped.age || '--'}`;
  document.getElementById('pedBirthday').textContent = `DOB: ${ped.birthday || '--'}`;
  document.getElementById('pedBuild').textContent = `Height: ${ped.height || '--'} | Weight: ${ped.weight || '--'}`;
  document.getElementById('pedAddress').textContent = ped.address || '--';

  // License Status
  const licStatusEl = document.getElementById('pedLicenseStatus');
  licStatusEl.textContent = (ped.licenseStatus || 'VALID').toUpperCase();
  licStatusEl.className = `tag ${ped.licenseStatus === 'Valid' ? 'tag-green' : (ped.licenseStatus === 'Suspended' ? 'tag-yellow' : 'tag-red')}`;
  document.getElementById('pedLicenseExp').textContent = `Exp: ${ped.licenseExpiration || '--'}`;
  document.getElementById('pedLicenseNumber').textContent = ped.licenseNumber || '--';

  // Gun Permit
  const gunStatusEl = document.getElementById('pedGunStatus');
  gunStatusEl.textContent = (ped.gunPermitStatus || 'NONE').toUpperCase();
  gunStatusEl.className = `tag ${ped.gunPermitStatus === 'Valid' ? 'tag-green' : (ped.gunPermitStatus === 'Suspended' ? 'tag-red' : 'tag-yellow')}`;
  document.getElementById('pedGunClass').textContent = ped.gunPermitClass || 'None';

  // Permits
  document.getElementById('pedFishPermit').textContent = ped.fishingPermit || 'None';
  document.getElementById('pedHuntPermit').textContent = ped.huntingPermit || 'None';

  // Flags
  const flagsContainer = document.getElementById('pedFlagsContainer');
  flagsContainer.innerHTML = '';
  if (ped.flags && ped.flags.length > 0) {
    ped.flags.forEach(f => {
      const span = document.createElement('span');
      span.className = 'tag tag-red';
      span.textContent = f;
      flagsContainer.appendChild(span);
    });
  } else {
    flagsContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem;">No safety flags on record.</span>';
  }

  // Warrants
  const warrantBadge = document.getElementById('pedWarrantBadge');
  if (ped.activeWarrant) {
    warrantBadge.innerHTML = `<span class="tag tag-red font-mono">ACTIVE WARRANT</span>`;
    sounds.playAlertBeep();
  } else {
    warrantBadge.innerHTML = '';
  }

  // Encounters
  document.getElementById('pedArrestPriors').textContent = ped.arrestCount || 0;
  document.getElementById('pedCitationPriors').textContent = ped.citationCount || 0;
  document.getElementById('pedTotalStops').textContent = ped.totalStops || 0;

  // Quick Action Handlers
  document.getElementById('pedIssueCitationBtn').onclick = () => {
    switchTab('reports');
    document.getElementById('reportTypeSelect').value = 'Citation Report';
    document.getElementById('reportOffenderName').value = ped.name;
    document.getElementById('reportLocation').value = `${state.gameData.street}, ${state.gameData.area}`;
  };

  document.getElementById('pedArrestReportBtn').onclick = () => {
    switchTab('reports');
    document.getElementById('reportTypeSelect').value = 'Arrest Report';
    document.getElementById('reportOffenderName').value = ped.name;
    document.getElementById('reportLocation').value = `${state.gameData.street}, ${state.gameData.area}`;
  };

  document.getElementById('pedAddNotesBtn').onclick = () => {
    appendFieldNotes(`-name ${ped.name} -lic ${ped.licenseNumber || ''} -dob ${ped.birthday || ''} `);
    showToast("Notes Updated", `Added ${ped.name} to field notes`, "success");
  };
}

// -------------------------------------------------------------
// Vehicle Lookup
// -------------------------------------------------------------
async function runVehLookup(query) {
  if (!query || !query.trim()) return;
  sounds.playClickSound();
  try {
    const res = await fetch(`/api/lookup/veh?plate=${encodeURIComponent(query.trim())}`);
    const veh = await res.json();
    renderVehResult(veh);
  } catch (err) {
    showToast("DMV Error", "Could not query vehicle record", "danger");
  }
}

function renderVehResult(veh) {
  el.vehResultContainer.style.display = 'block';
  document.getElementById('vehPlateGraphicText').textContent = veh.plateNumber || '--------';
  document.getElementById('vehMakeModel').textContent = `${veh.make || ''} ${veh.model || 'Unknown'}`.trim();
  document.getElementById('vehType').textContent = veh.type || 'Sedan';
  document.getElementById('vehColorSwatch').style.backgroundColor = veh.colorHex || '#ffffff';
  document.getElementById('vehColorName').textContent = veh.color || 'Unknown';
  document.getElementById('vehVin').textContent = veh.vin || '--';
  document.getElementById('vehOwner').textContent = veh.owner || 'Unknown';

  const regEl = document.getElementById('vehRegStatus');
  regEl.textContent = (veh.registration || 'VALID').toUpperCase();
  regEl.className = `tag ${veh.registration === 'Valid' ? 'tag-green' : (veh.registration === 'Expired' ? 'tag-yellow' : 'tag-red')}`;
  document.getElementById('vehRegExp').textContent = `Exp: ${veh.registrationExpiration || '--'}`;

  const insEl = document.getElementById('vehInsStatus');
  insEl.textContent = (veh.insurance || 'VALID').toUpperCase();
  insEl.className = `tag ${veh.insurance === 'Valid' ? 'tag-green' : 'tag-red'}`;

  const stolenBadge = document.getElementById('vehStolenBadge');
  if (veh.stolenStatus === 'Yes') {
    stolenBadge.innerHTML = `<span class="tag tag-red">STOLEN VEHICLE</span>`;
    sounds.playAlertBeep();
  } else {
    stolenBadge.innerHTML = '';
  }

  document.getElementById('vehLookupOwnerBtn').onclick = () => {
    switchTab('pedLookup');
    el.pedSearchInput.value = veh.owner;
    runPedLookup(veh.owner);
  };

  document.getElementById('vehTrafficStopReportBtn').onclick = () => {
    switchTab('reports');
    document.getElementById('reportTypeSelect').value = 'Traffic Stop Report';
    document.getElementById('reportPlateNumber').value = veh.plateNumber;
    document.getElementById('reportOffenderName').value = veh.owner;
    document.getElementById('reportLocation').value = `${state.gameData.street}, ${state.gameData.area}`;
  };

  document.getElementById('vehImpoundReportBtn').onclick = () => {
    switchTab('reports');
    document.getElementById('reportTypeSelect').value = 'Impound Report';
    document.getElementById('reportPlateNumber').value = veh.plateNumber;
    document.getElementById('reportLocation').value = `${state.gameData.street}, ${state.gameData.area}`;
  };

  document.getElementById('vehAddNotesBtn').onclick = () => {
    appendFieldNotes(`-plate ${veh.plateNumber} -model ${veh.model} -owner ${veh.owner} `);
    showToast("Notes Updated", `Added vehicle ${veh.plateNumber} to field notes`, "success");
  };
}

// -------------------------------------------------------------
// Callouts & CAD
// -------------------------------------------------------------
async function loadCallouts() {
  try {
    const res = await fetch('/api/callouts');
    state.callouts = await res.json();
    renderCallouts();
  } catch (err) {}
}

function renderCallouts() {
  el.activeCalloutsCount.textContent = state.callouts.active.length;

  // If callout modal is currently open, dismiss it if callout has been accepted in-game, timed out, or completed
  const openModal = document.getElementById('calloutModal');
  if (openModal && openModal.classList.contains('open')) {
    const numText = (document.getElementById('calloutPopupNum').textContent || '').replace('#', '').trim();
    const activeMatch = state.callouts.active.find(c => String(c.number).trim() === numText);
    if (!activeMatch || activeMatch.status !== 'Not Responded') {
      if (calloutModalTimer) { clearTimeout(calloutModalTimer); calloutModalTimer = null; }
      openModal.classList.remove('open');
    }
  }
  
  // Dashboard Mini List
  const dashList = document.getElementById('dashActiveCalloutsList');
  if (state.callouts.active.length === 0) {
    dashList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0;">No active emergency calls.</p>';
  } else {
    dashList.innerHTML = state.callouts.active.slice(0, 3).map(c => `
      <div style="padding: 0.75rem; background: var(--bg-secondary); border-radius: 6px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <b style="color: #fff;">#${c.number} ${c.type}</b>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${c.street}, ${c.area}</div>
        </div>
        <span class="tag ${c.priority.includes('3') ? 'tag-red' : 'tag-yellow'}">${c.priority}</span>
      </div>
    `).join('');
  }

  // Active Callouts Table
  const tbody = document.getElementById('calloutsTableBody');
  if (state.callouts.active.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No active callouts.</td></tr>';
  } else {
    tbody.innerHTML = state.callouts.active.map(c => {
      let stBadge = 'tag-red';
      if (c.status === 'Responded') stBadge = 'tag-green';
      else if (c.status === 'En Route') stBadge = 'tag-yellow';
      else if (c.status === 'On Scene') stBadge = 'tag-cyan';

      return `
        <tr>
          <td class="font-mono">#${c.number}</td>
          <td><span class="tag ${c.priority && c.priority.includes('3') ? 'tag-red' : 'tag-yellow'}">${c.priority || 'Code 2'}</span></td>
          <td><b>${c.type}</b><br><small style="color: var(--text-muted);">${c.description || ''}</small></td>
          <td>${c.street}, ${c.area}</td>
          <td>${c.startTime}</td>
          <td><span class="tag ${stBadge}">${c.status}</span></td>
          <td style="white-space: nowrap;">
            ${c.status === 'Not Responded' ? `
              <button class="btn btn-success btn-sm" onclick="window.updateCalloutUnitStatus('${c.number}', 'Responded')">Respond</button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" onclick="window.updateCalloutUnitStatus('${c.number}', 'En Route')">En Route</button>
            <button class="btn btn-cyan btn-sm" onclick="window.updateCalloutUnitStatus('${c.number}', 'On Scene')">On Scene</button>
            <button class="btn btn-danger btn-sm" onclick="window.updateCalloutUnitStatus('${c.number}', 'Completed')">Clear</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // History Callouts Table
  const historyTbody = document.getElementById('calloutsHistoryTableBody');
  if (state.callouts.history.length === 0) {
    historyTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No historical callouts.</td></tr>';
  } else {
    historyTbody.innerHTML = state.callouts.history.slice(0, 15).map(c => `
      <tr>
        <td class="font-mono">#${c.number}</td>
        <td><span class="tag tag-yellow">${c.priority}</span></td>
        <td>${c.type}</td>
        <td>${c.street}, ${c.area}</td>
        <td>${c.startTime}</td>
        <td><span class="tag tag-green">${c.status}</span></td>
      </tr>
    `).join('');
  }
}

window.updateCalloutUnitStatus = async function(number, status) {
  try {
    const cleanNum = String(number).trim();
    const res = await fetch(`/api/callouts/${cleanNum}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.state) {
        state.callouts = data.state;
        renderCallouts();
      } else {
        await loadCallouts();
      }
      showToast("CAD Updated", `Callout #${cleanNum} marked as ${status}`, 'success');
    } else {
      showToast("Update Failed", `Could not update callout #${cleanNum}`, 'danger');
    }
  } catch (err) {
    showToast("Network Error", "Could not communicate with CAD server", 'danger');
  }
};

// -------------------------------------------------------------
// ALPR
// -------------------------------------------------------------
function renderALPR() {
  const dashList = document.getElementById('dashRecentALPRList');
  if (state.alpr.length === 0) {
    dashList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0;">No vehicle scans recorded yet.</p>';
  } else {
    dashList.innerHTML = state.alpr.slice(0, 4).map(scan => `
      <div style="padding: 0.6rem 0.75rem; background: var(--bg-secondary); border-radius: 6px; margin-bottom: 0.4rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span class="font-mono" style="font-weight: 700; color: #fff;">${scan.licensePlate}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">${scan.scanner || 'Front'} | ${Math.round(scan.speed)} mph</span>
        </div>
        <div>
          ${scan.flags && scan.flags.length > 0 ? `<span class="tag tag-red">${scan.flags[0]}</span>` : '<span class="tag tag-green">CLEAR</span>'}
        </div>
      </div>
    `).join('');
  }

  const tbody = document.getElementById('alprTableBody');
  if (state.alpr.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No recent ALPR scans received from patrol car.</td></tr>';
  } else {
    tbody.innerHTML = state.alpr.map(scan => `
      <tr>
        <td>${scan.timestamp}</td>
        <td class="font-mono" style="font-size: 1.05rem; font-weight: 700; color: var(--accent-cyan);">${scan.licensePlate}</td>
        <td>${scan.plateType || 'Standard'}</td>
        <td>${Math.round(scan.speed)} mph</td>
        <td>${scan.scanner || 'Front'}</td>
        <td>
          ${scan.flags && scan.flags.length > 0 ? scan.flags.map(f => `<span class="tag tag-red" style="margin-right: 0.25rem;">${f}</span>`).join('') : '<span class="tag tag-green">CLEAR</span>'}
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="window.quickSearchPlate('${scan.licensePlate}')">Lookup</button>
        </td>
      </tr>
    `).join('');
  }
}

window.quickSearchPlate = function(plate) {
  switchTab('vehLookup');
  el.vehSearchInput.value = plate;
  runVehLookup(plate);
};

// -------------------------------------------------------------
// Court Cases
// -------------------------------------------------------------
async function loadCourtCases() {
  try {
    const res = await fetch('/api/court');
    state.courtCases = await res.json();
    renderCourtCases();
  } catch (err) {}
}

function renderCourtCases() {
  const tbody = document.getElementById('courtTableBody');
  if (state.courtCases.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No court cases currently scheduled.</td></tr>';
    return;
  }

  tbody.innerHTML = state.courtCases.map(c => {
    let penaltiesStr = '--';
    if (c.penalties) {
      const parts = [];
      if (c.penalties.fine) parts.push(`Fine: $${c.penalties.fine}`);
      if (c.penalties.jailMonths) parts.push(`Prison: ${c.penalties.jailMonths} mos`);
      if (c.penalties.probationMonths) parts.push(`Probation: ${c.penalties.probationMonths} mos`);
      if (c.penalties.suspensionMonths) parts.push(`License Susp: ${c.penalties.suspensionMonths} mos`);
      penaltiesStr = parts.join(', ');
    }

    return `
      <tr>
        <td class="font-mono"><b>${c.caseNumber}</b></td>
        <td><b>${c.offenderName}</b></td>
        <td>${Array.isArray(c.charges) ? c.charges.join(', ') : c.charges}</td>
        <td>${c.scheduledCourtDate}</td>
        <td><span class="tag ${c.status === 'Verdict Rendered' ? 'tag-green' : 'tag-yellow'}">${c.status}</span></td>
        <td><b>${c.verdict || 'Trial In Session'}</b></td>
        <td style="color: var(--text-secondary);">${penaltiesStr}</td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------
// Reports
// -------------------------------------------------------------
async function loadReports() {
  try {
    const res = await fetch('/api/reports');
    const data = await res.json();
    state.reports = data.filed || [];
    renderReportsTable();
  } catch (err) {}
}

function renderReportsTable() {
  const tbody = document.getElementById('filedReportsTableBody');
  if (state.reports.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No reports on file.</td></tr>';
  } else {
    tbody.innerHTML = state.reports.map(r => `
      <tr>
        <td class="font-mono">${r.number}</td>
        <td>${r.type}</td>
        <td><b>${r.offenderName || r.name || '--'}</b></td>
        <td>${new Date(r.timestamp).toLocaleDateString()}</td>
        <td><span class="tag tag-green">${r.status}</span></td>
      </tr>
    `).join('');
  }
}

function populateChargePicker() {
  const select = document.getElementById('chargePickerSelect');
  select.innerHTML = '<option value="">-- Choose Charge or Citation --</option>';

  // Citations
  const citGroup = document.createElement('optgroup');
  citGroup.label = "Citations / Traffic Offenses";
  state.citations.forEach(grp => {
    grp.citations.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = `${c.name} (Fine: $${c.fine || 250})`;
      opt.dataset.fine = c.fine || 250;
      citGroup.appendChild(opt);
    });
  });
  select.appendChild(citGroup);

  // Penal Code Charges
  const chargeGroup = document.createElement('optgroup');
  chargeGroup.label = "Penal Code Charges";
  state.charges.forEach(grp => {
    grp.charges.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      opt.dataset.fine = (c.fine_k ? c.fine_k * 1000 : c.fine) || 500;
      chargeGroup.appendChild(opt);
    });
  });
  select.appendChild(chargeGroup);
}

// -------------------------------------------------------------
// Field Notepad
// -------------------------------------------------------------
async function loadNotepad() {
  try {
    const res = await fetch('/api/notes');
    const notes = await res.json();
    if (notes && notes.length > 0) {
      document.getElementById('notepadTextarea').value = notes[0].content || '';
      updateNotepadTags(notes[0].content || '');
    }
  } catch (err) {}
}

function appendFieldNotes(text) {
  const textarea = document.getElementById('notepadTextarea');
  textarea.value = (textarea.value ? textarea.value + '\n' : '') + text;
  updateNotepadTags(textarea.value);
}

function updateNotepadTags(text) {
  const container = document.getElementById('notepadExtractedTags');
  container.innerHTML = '';
  const regex = /(-[a-zA-Z]+)\s+([^-]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const tag = match[1].trim();
    const val = match[2].trim();
    const span = document.createElement('span');
    span.className = 'tag tag-blue';
    span.textContent = `${tag}: ${val}`;
    container.appendChild(span);
  }
}

// -------------------------------------------------------------
// Modals & Popups
// -------------------------------------------------------------
function showIDCardModal(idData) {
  document.getElementById('idCardName').textContent = idData.name || 'UNKNOWN';
  document.getElementById('idCardLicNum').textContent = idData.licenseNumber || 'D1847294';
  document.getElementById('idCardAddress').textContent = idData.address || 'Los Santos, SA';
  document.getElementById('idCardDob').textContent = idData.birthday || '--';
  document.getElementById('idCardSex').textContent = idData.gender ? idData.gender[0] : 'U';
  document.getElementById('idCardHgt').textContent = idData.height || '--';
  document.getElementById('idCardWgt').textContent = idData.weight || '--';
  document.getElementById('idCardExp').textContent = idData.expiration || '--';
  
  const statusEl = document.getElementById('idCardStatus');
  statusEl.textContent = (idData.status || 'VALID').toUpperCase();
  statusEl.className = `tag ${idData.status === 'Valid' ? 'tag-green' : 'tag-red'}`;

  el.idCardModal.classList.add('open');

  document.getElementById('idCardSearchPedBtn').onclick = () => {
    el.idCardModal.classList.remove('open');
    switchTab('pedLookup');
    el.pedSearchInput.value = idData.name;
    runPedLookup(idData.name);
  };
}

function showTrafficStopModal(tsData) {
  document.getElementById('tsVehicle').textContent = `${tsData.color || ''} ${tsData.model || 'Vehicle'}`.trim();
  document.getElementById('tsPlate').textContent = tsData.licensePlate || '--------';
  document.getElementById('tsOwner').textContent = tsData.owner || 'Unknown';
  document.getElementById('tsRegIns').textContent = `Reg: ${tsData.registration || 'Valid'} | Ins: ${tsData.insurance || 'Valid'}`;

  el.trafficStopModal.classList.add('open');

  document.getElementById('tsSearchDMVBtn').onclick = () => {
    el.trafficStopModal.classList.remove('open');
    switchTab('vehLookup');
    el.vehSearchInput.value = tsData.licensePlate;
    runVehLookup(tsData.licensePlate);
  };

  document.getElementById('tsCitationBtn').onclick = () => {
    el.trafficStopModal.classList.remove('open');
    switchTab('reports');
    document.getElementById('reportTypeSelect').value = 'Citation Report';
    document.getElementById('reportPlateNumber').value = tsData.licensePlate;
    document.getElementById('reportOffenderName').value = tsData.owner;
    document.getElementById('reportLocation').value = `${tsData.street || state.gameData.street}, ${tsData.area || state.gameData.area}`;
  };
}

let calloutModalTimer = null;

function showCalloutModal(c) {
  const modal = document.getElementById('calloutModal');
  if (!modal || (c.status && c.status !== 'Not Responded')) return;

  if (calloutModalTimer) {
    clearTimeout(calloutModalTimer);
    calloutModalTimer = null;
  }

  document.getElementById('calloutPopupNum').textContent = `#${c.number}`;
  document.getElementById('calloutPopupPriority').textContent = (c.priority || 'CODE 2').toUpperCase();
  document.getElementById('calloutPopupPriority').className = `tag ${c.priority && c.priority.includes('3') ? 'tag-red' : 'tag-yellow'}`;
  document.getElementById('calloutPopupType').textContent = c.type || 'Emergency Callout';
  
  const statusEl = document.getElementById('calloutPopupStatus');
  let stClass = 'tag-red';
  if (c.status === 'Responded') stClass = 'tag-green';
  else if (c.status === 'En Route') stClass = 'tag-yellow';
  else if (c.status === 'On Scene') stClass = 'tag-cyan';
  statusEl.innerHTML = `<span class="tag ${stClass}">${c.status || 'Not Responded'}</span>`;

  document.getElementById('calloutPopupLocation').textContent = `${c.street || state.gameData.street}, ${c.area || state.gameData.area || 'Los Santos'}`;
  document.getElementById('calloutPopupDesc').textContent = c.description || c.message || 'Call dispatched to unit.';

  modal.classList.add('open');

  // Automatic timeout after 20 seconds (matching standard LSPDFR dispatch timeout)
  calloutModalTimer = setTimeout(() => {
    if (modal.classList.contains('open')) {
      modal.classList.remove('open');
      console.log(`[CAD] Callout #${c.number} timed out. Dismissed popup.`);
      window.updateCalloutUnitStatus(c.number, 'Timed Out');
    }
  }, 20000);

  document.getElementById('calloutRespondBtn').onclick = async () => {
    if (calloutModalTimer) { clearTimeout(calloutModalTimer); calloutModalTimer = null; }
    modal.classList.remove('open');
    sounds.playRadioChirp();
    await window.updateCalloutUnitStatus(c.number, 'Responded');
  };

  document.getElementById('calloutEnRouteBtn').onclick = async () => {
    if (calloutModalTimer) { clearTimeout(calloutModalTimer); calloutModalTimer = null; }
    modal.classList.remove('open');
    sounds.playRadioChirp();
    await window.updateCalloutUnitStatus(c.number, 'En Route');
  };

  document.getElementById('calloutIgnoreBtn').onclick = () => {
    if (calloutModalTimer) { clearTimeout(calloutModalTimer); calloutModalTimer = null; }
    modal.classList.remove('open');
    window.updateCalloutUnitStatus(c.number, 'Timed Out');
  };
}

// -------------------------------------------------------------
// Settings & Device Access
// -------------------------------------------------------------
async function loadSettings() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    
    // Display local network IPs for other devices
    const urlsContainer = document.getElementById('deviceUrlsList');
    const port = data.port || 3000;
    if (data.localIPs && data.localIPs.length > 0) {
      urlsContainer.innerHTML = data.localIPs.map(ip => `
        <div style="margin-bottom: 0.25rem;">📱 http://${ip}:3000</div>
      `).join('');
    } else {
      urlsContainer.textContent = `http://localhost:3000`;
    }

    if (data.config?.connectionSettings) {
      document.getElementById('settingHostIp').value = data.config.connectionSettings.lastIPV4Connection || '127.0.0.1';
      document.getElementById('settingHostPort').value = data.config.connectionSettings.lastPortConnection || '5455';
      document.getElementById('settingUdpPort').value = data.config.connectionSettings.broadcastPort || '8888';
      if (document.getElementById('settingAutoRespondCallout')) {
        document.getElementById('settingAutoRespondCallout').checked = data.config.connectionSettings.autoRespondCallouts || false;
      }
    }

    if (data.config?.uiSettings) {
      if (document.getElementById('settingPlaySounds')) document.getElementById('settingPlaySounds').checked = data.config.uiSettings.playSounds !== false;
      if (document.getElementById('settingCalloutPopup')) document.getElementById('settingCalloutPopup').checked = data.config.uiSettings.enableCalloutPopup !== false;
      if (document.getElementById('settingTrafficStopPopup')) document.getElementById('settingTrafficStopPopup').checked = data.config.uiSettings.enableTrafficStopPopup !== false;
      if (document.getElementById('settingIDPopup')) document.getElementById('settingIDPopup').checked = data.config.uiSettings.enableIDPopup !== false;
      if (document.getElementById('setting24HourTime')) document.getElementById('setting24HourTime').checked = data.config.uiSettings.use24Hour || false;
    }
  } catch (err) {}
}

function populateAgencyPicker() {
  const select = document.getElementById('newProfAgency');
  select.innerHTML = '';
  state.customization.agencies.forEach(agency => {
    const opt = document.createElement('option');
    opt.value = agency;
    opt.textContent = agency;
    select.appendChild(opt);
  });
}

// -------------------------------------------------------------
// Clocks
// -------------------------------------------------------------
function startClocks() {
  setInterval(() => {
    const now = new Date();
    // If not using game time, fallback to real clock
    if (!state.gameData.time) {
      el.gameClockDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }, 1000);
}

// -------------------------------------------------------------
// Event Listeners Setup
// -------------------------------------------------------------
function setupEventListeners() {
  // Quick Search
  el.quickPedBtn.addEventListener('click', () => {
    switchTab('pedLookup');
    el.pedSearchInput.value = el.quickPedInput.value;
    runPedLookup(el.quickPedInput.value);
  });

  el.quickVehBtn.addEventListener('click', () => {
    switchTab('vehLookup');
    el.vehSearchInput.value = el.quickVehInput.value;
    runVehLookup(el.quickVehInput.value);
  });

  // Ped Search
  el.pedSearchBtn.addEventListener('click', () => runPedLookup(el.pedSearchInput.value));
  el.pedSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runPedLookup(el.pedSearchInput.value);
  });

  el.randomPedBtn.addEventListener('click', async () => {
    const res = await fetch('/api/lookup/ped?generate=true');
    const ped = await res.json();
    renderPedResult(ped);
  });

  // Veh Search
  el.vehSearchBtn.addEventListener('click', () => runVehLookup(el.vehSearchInput.value));
  el.vehSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runVehLookup(el.vehSearchInput.value);
  });

  el.randomVehBtn.addEventListener('click', async () => {
    const res = await fetch('/api/lookup/veh?generate=true');
    const veh = await res.json();
    renderVehResult(veh);
  });

  // Modals Close
  document.getElementById('idCardCloseBtn').addEventListener('click', () => el.idCardModal.classList.remove('open'));
  document.getElementById('tsCloseBtn').addEventListener('click', () => el.trafficStopModal.classList.remove('open'));
  document.getElementById('closeProfileModalBtn').addEventListener('click', () => el.profileModal.classList.remove('open'));

  // Header Buttons
  document.getElementById('locationTickerBtn').addEventListener('click', () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(state.gameData.street);
      showToast("Copied to Clipboard", `Street: ${state.gameData.street}`, "info");
    }
  });

  document.getElementById('officerProfileBtn').addEventListener('click', () => openProfileModal());
  document.getElementById('dashSwitchProfileBtn').addEventListener('click', () => openProfileModal());

  // Dashboard shortcuts
  document.getElementById('dashViewAllCallouts').addEventListener('click', () => switchTab('callouts'));
  document.getElementById('dashViewAllALPR').addEventListener('click', () => switchTab('alpr'));

  // Charges selection in report
  document.getElementById('addChargeBtn').addEventListener('click', () => {
    const select = document.getElementById('chargePickerSelect');
    const selectedOpt = select.options[select.selectedIndex];
    if (selectedOpt && selectedOpt.value) {
      const chargeName = selectedOpt.value;
      const fine = parseInt(selectedOpt.dataset.fine || 0, 10);
      state.selectedChargesForReport.push({ name: chargeName, fine });
      renderSelectedCharges();
    }
  });

  // Report submission
  document.getElementById('newReportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('reportTypeSelect').value;
    const offenderName = document.getElementById('reportOffenderName').value;
    const plateNumber = document.getElementById('reportPlateNumber').value;
    const citationType = document.getElementById('reportCitationType').value;
    const totalFine = parseInt(document.getElementById('reportTotalFine').value || 0, 10);
    const location = document.getElementById('reportLocation').value;
    const narrative = document.getElementById('reportNarrative').value;

    const payload = {
      type,
      offenderName,
      plateNumber,
      citationType,
      charges: state.selectedChargesForReport.map(c => c.name),
      totalFine,
      location,
      narrative,
      officerName: state.activeOfficer ? state.activeOfficer.name : "Officer"
    };

    try {
      const res = await fetch('/api/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      showToast("Report Submitted", `Filed ${type} #${data.report.number}`, 'success');
      state.selectedChargesForReport = [];
      renderSelectedCharges();
      document.getElementById('newReportForm').reset();
      loadReports();
    } catch (err) {
      showToast("Submission Error", "Failed to file report", 'danger');
    }
  });

  // Save Field Notes
  document.getElementById('saveNotepadBtn').addEventListener('click', async () => {
    const content = document.getElementById('notepadTextarea').value;
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ id: "1", title: "Patrol Notes", content }])
    });
    showToast("Notes Saved", "Field notepad stored successfully", 'success');
  });

  document.getElementById('notepadTextarea').addEventListener('input', (e) => {
    updateNotepadTags(e.target.value);
  });

  // ALPR Clear
  document.getElementById('clearALPRBtn').addEventListener('click', async () => {
    await fetch('/api/alpr/clear', { method: 'POST' });
    state.alpr = [];
    renderALPR();
    showToast("ALPR Cleared", "Plate reader logs purged", 'info');
  });

  // Settings Save
  document.getElementById('saveConnectionSettingsBtn').addEventListener('click', async () => {
    const host = document.getElementById('settingHostIp').value;
    const port = document.getElementById('settingHostPort').value;
    const udpPort = document.getElementById('settingUdpPort').value;

    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionSettings: {
          lastIPV4Connection: host,
          lastPortConnection: port,
          broadcastPort: parseInt(udpPort, 10)
        }
      })
    });

    // Try to connect
    await fetch('/api/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, port })
    });
  });

  // Sound Settings Toggle
  document.getElementById('settingPlaySounds').addEventListener('change', (e) => {
    sounds.enabled = e.target.checked;
  });

  // UI Preferences Save
  document.getElementById('saveUiSettingsBtn')?.addEventListener('click', async () => {
    const playSounds = document.getElementById('settingPlaySounds')?.checked ?? true;
    const enableCalloutPopup = document.getElementById('settingCalloutPopup')?.checked ?? true;
    const autoRespondCallouts = document.getElementById('settingAutoRespondCallout')?.checked ?? false;
    const enableTrafficStopPopup = document.getElementById('settingTrafficStopPopup')?.checked ?? true;
    const enableIDPopup = document.getElementById('settingIDPopup')?.checked ?? true;
    const use24Hour = document.getElementById('setting24HourTime')?.checked ?? false;

    sounds.enabled = playSounds;

    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionSettings: {
          autoRespondCallouts
        },
        uiSettings: {
          playSounds,
          enableCalloutPopup,
          enableTrafficStopPopup,
          enableIDPopup,
          use24Hour
        }
      })
    });
    showToast("Preferences Saved", "Settings updated successfully", 'success');
  });
}

function renderSelectedCharges() {
  const container = document.getElementById('selectedChargesList');
  container.innerHTML = '';
  let fineSum = 0;
  state.selectedChargesForReport.forEach((c, idx) => {
    fineSum += c.fine || 0;
    const div = document.createElement('div');
    div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: 0.35rem 0.6rem; border-radius: 4px; font-size: 0.8rem;';
    div.innerHTML = `
      <span>${c.name} ($${c.fine || 0})</span>
      <button type="button" style="background: none; border: none; color: var(--accent-red); cursor: pointer;" onclick="window.removeSelectedCharge(${idx})">x</button>
    `;
    container.appendChild(div);
  });
  document.getElementById('reportTotalFine').value = fineSum;
}

window.removeSelectedCharge = function(index) {
  state.selectedChargesForReport.splice(index, 1);
  renderSelectedCharges();
};

function openProfileModal() {
  const container = document.getElementById('profilesListContainer');
  container.innerHTML = state.profiles.map((p, idx) => `
    <div style="padding: 0.75rem; background: var(--bg-tertiary); border: 1px solid ${state.activeOfficer?.name === p.name ? 'var(--accent-cyan)' : 'var(--border-color)'}; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <b style="color: #fff;">${p.name}</b>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${p.agency} | ${p.rank} (#${p.number})</div>
      </div>
      <button class="btn ${state.activeOfficer?.name === p.name ? 'btn-cyan' : 'btn-secondary'} btn-sm" onclick="window.selectProfile(${idx})">
        ${state.activeOfficer?.name === p.name ? 'Active' : 'Select'}
      </button>
    </div>
  `).join('');
  el.profileModal.classList.add('open');
}

window.selectProfile = function(idx) {
  setActiveOfficer(state.profiles[idx]);
  el.profileModal.classList.remove('open');
  showToast("Profile Switched", `Logged in as ${state.profiles[idx].name}`, 'success');
};

document.getElementById('saveNewProfileBtn').addEventListener('click', async () => {
  const name = document.getElementById('newProfName').value.trim();
  const agency = document.getElementById('newProfAgency').value;
  const rank = document.getElementById('newProfRank').value.trim() || 'Officer';
  const number = document.getElementById('newProfNumber').value.trim() || '1000';
  const callsign = document.getElementById('newProfCallsign').value.trim() || '1-A-1';
  const division = document.getElementById('newProfDivision').value.trim() || 'Patrol';

  if (!name) return;

  const newProfile = { name, agency, rank, number, callsign, division };
  state.profiles.push(newProfile);

  await fetch('/api/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state.profiles)
  });

  setActiveOfficer(newProfile);
  el.profileModal.classList.remove('open');
  showToast("Profile Created", `Created and switched to ${name}`, 'success');
});
