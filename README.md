# ReportsPlus Web MDT & LSPDFR Companion

A modern, high-performance, cross-platform Web Mobile Data Terminal (MDT / CAD) and companion plugin for **Grand Theft Auto V** and **LSPDFR**.

Access your full police terminal on any device connected to your local network—including an **iPad, iPhone, Android tablet, laptop, or secondary desktop monitor**—with real-time bidirectional synchronization with GTA V.

---

## Key Features

- **Cross-Platform Web MDT:** Open `http://<your-pc-ip>:3000` on any phone, tablet, or browser on your local Wi-Fi. No heavy desktop Java apps required.
- **Two-Way Dispatch Callout Sync:**
  - Emergency callouts appear instantly with audible chimes and interactive alert dialogs.
  - Clicking **Respond** or **En Route** on your tablet/phone accepts the callout in-game, triggers the in-game radio chirp, and plots your GPS route.
  - Accepting in GTA V (pressing `Y` on keyboard/controller) automatically flips the Web CAD status to **Responded** and dismisses the alert dialog.
  - Auto-dismisses if a dispatch times out or is cancelled in-game.
- **Policing Redefined (PR) & CDF Native Sync:**
  - Real-time identity checks, driver license statuses, CCW weapon permits, probation statuses, and vehicle registrations are pulled directly from Policing Redefined.
- **Citations & Penal Code Database:**
  - Full San Andreas infractions and moving violations (`data/Citations.xml`) with statutory fines.
  - Filing a citation from your tablet directly issues the citation to the suspect in-game via Policing Redefined.
- **Automated Court System:**
  - Filed citations and felony charges schedule automated court dockets.
  - Virtual judges review cases, render verdicts (guilty, dismissals, fines, probation), and update in real-time.
- **Live ALPR (Automated License Plate Recognition):**
  - Instant plate hits, speed readings, stolen flags, and wanted registered owner alerts.

---

## Project Structure

```
├── server/                     # Node.js backend (Express, WebSockets, Telemetry sync)
│   ├── index.js                # Server entrypoint (Port 3000 & UDP 8888)
│   ├── api.js                  # REST API & background GTA V disk file monitors
│   ├── data-service.js         # Persistent JSON & XML database engine
│   └── lspdfr-client.js        # Real-time game telemetry client
├── public/                     # Modern Web MDT Frontend (Single Page Application)
│   ├── index.html              # CAD layout, alerts, modals, and views
│   ├── css/mdt.css             # Dark-theme police terminal stylesheet
│   ├── js/app.js               # Client controller, WebSockets, audio synthesizer
│   └── imgs/                   # UI icons, agency badges, license templates, chimes
├── data/                       # CAD templates, charges, citations, user profiles
├── ReportsPlusExtension/       # Standalone C# LSPDFR companion plugin for GTA V
│   ├── CalloutSync.cs          # LSPDFR event hooks, signal monitor, native acceptance
│   └── ReportsPlusExtension.csproj
└── start-web-mdt.bat           # Windows one-click launcher
```

---

## Installation & Setup

### 1. Web MDT Server Setup

1. Install [Node.js](https://nodejs.org/) (v18 or newer).
2. Open terminal in this folder and install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   - Double click `start-web-mdt.bat` **or** run `npm start`.
4. Open the displayed URL:
   - Local: `http://localhost:3000`
   - Network (iPad/Phone): `http://<YOUR_LOCAL_IP>:3000`

### 2. In-Game Companion Plugin Setup

1. Copy `ReportsPlusExtension.dll` into your GTA V directory:
   ```text
   Grand Theft Auto V/plugins/LSPDFR/ReportsPlusExtension.dll
   ```
2. In GTA V, go on duty or press **F4** in RagePluginHook console and type:
   ```text
   ReloadPlugins
   ```
3. LSPDFR will automatically discover and load `ReportsPlusExtension.dll`.

---

## License

MIT License. Open-source and free for the LSPDFR and GTA V modding community.
