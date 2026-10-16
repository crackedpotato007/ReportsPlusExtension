using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Xml.Linq;
using LSPD_First_Response.Mod.API;
using LSPD_First_Response.Mod.Callouts;
using Rage;

namespace ReportsPlusExtension
{
    public class Main : Plugin
    {
        public override void Initialize()
        {
            Functions.OnOnDutyStateChanged += OnOnDutyStateChangedHandler;
            Game.LogTrivial("ReportsPlusExtension: Loaded as standalone LSPDFR Plugin.");
        }

        public override void Finally()
        {
            Game.LogTrivial("ReportsPlusExtension: Cleaned up.");
        }

        private void OnOnDutyStateChangedHandler(bool onDuty)
        {
            if (onDuty)
            {
                CalloutSync.Initialize();
            }
        }
    }

    public static class CalloutSync
    {
        [DllImport("user32.dll", SetLastError = true)]
        private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        private const byte VK_Y = 0x59;
        private const byte SCAN_Y = 0x15;
        private const uint KEYEVENTF_KEYUP = 0x0002;

        public static LHandle LatestCalloutHandle = null;
        private static GameFiber _signalWatcherFiber = null;
        private static bool _initialized = false;

        public static void Initialize()
        {
            if (_initialized)
            {
                Game.LogTrivial("ReportsPlusExtension: Already initialized.");
                return;
            }
            _initialized = true;

            try
            {
                Game.LogTrivial("ReportsPlusExtension: Initializing CalloutSync...");

                // Hook LSPDFR callout events
                Events.OnCalloutDisplayed += OnCalloutDisplayed;
                Events.OnCalloutAccepted += OnCalloutAccepted;
                Events.OnCalloutNotAccepted += OnCalloutNotAccepted;
                Events.OnCalloutFinished += OnCalloutFinished;

                // Start Signal Watcher Fiber
                _signalWatcherFiber = GameFiber.StartNew(WatchSignalFile, "ReportsPlusExtension-CalloutSignalWatcher");
                Game.LogTrivial("ReportsPlusExtension: CalloutSync initialized successfully and signal watcher started.");
            }
            catch (Exception ex)
            {
                Game.LogTrivial("ReportsPlusExtension: Error during initialization: " + ex.ToString());
            }
        }

        private static void OnCalloutDisplayed(LHandle handle)
        {
            try
            {
                LatestCalloutHandle = handle;
                Game.LogTrivial("ReportsPlusExtension: OnCalloutDisplayed captured callout handle.");
                
                // Allow ReportsPlus base listener time to create/write callout.xml
                GameFiber.StartNew(delegate
                {
                    GameFiber.Sleep(200);
                    UpdateCalloutXmlStatus("Not Responded");
                });
            }
            catch (Exception ex)
            {
                Game.LogTrivial("ReportsPlusExtension: Error in OnCalloutDisplayed: " + ex.Message);
            }
        }

        private static void OnCalloutAccepted(LHandle handle)
        {
            try
            {
                LatestCalloutHandle = handle;
                Game.LogTrivial("ReportsPlusExtension: OnCalloutAccepted in-game! Updating callout.xml to Responded.");
                GameFiber.StartNew(delegate
                {
                    GameFiber.Sleep(50);
                    UpdateCalloutXmlStatus("Responded");
                });
            }
            catch (Exception ex)
            {
                Game.LogTrivial("ReportsPlusExtension: Error in OnCalloutAccepted: " + ex.Message);
            }
        }

        private static void OnCalloutNotAccepted(LHandle handle)
        {
            try
            {
                Game.LogTrivial("ReportsPlusExtension: OnCalloutNotAccepted (timed out or ignored in-game). Updating callout.xml to Timed Out.");
                GameFiber.StartNew(delegate
                {
                    GameFiber.Sleep(50);
                    UpdateCalloutXmlStatus("Timed Out");
                });
                LatestCalloutHandle = null;
            }
            catch (Exception ex)
            {
                Game.LogTrivial("ReportsPlusExtension: Error in OnCalloutNotAccepted: " + ex.Message);
            }
        }

        private static void OnCalloutFinished(LHandle handle)
        {
            try
            {
                Game.LogTrivial("ReportsPlusExtension: OnCalloutFinished in-game! Updating callout.xml to Finished.");
                GameFiber.StartNew(delegate
                {
                    GameFiber.Sleep(50);
                    UpdateCalloutXmlStatus("Finished");
                });
                LatestCalloutHandle = null;
            }
            catch (Exception ex)
            {
                Game.LogTrivial("ReportsPlusExtension: Error in OnCalloutFinished: " + ex.Message);
            }
        }

        public static void UpdateCalloutXmlStatus(string status)
        {
            try
            {
                string path = Path.Combine("ReportsPlus", "data", "callout.xml");
                if (File.Exists(path))
                {
                    XDocument doc = XDocument.Load(path);
                    var callout = doc.Root?.Element("Callout");
                    if (callout != null)
                    {
                        var statusEl = callout.Element("Status");
                        if (statusEl == null)
                        {
                            callout.Add(new XElement("Status", status));
                        }
                        else
                        {
                            statusEl.Value = status;
                        }
                        doc.Save(path);
                        Game.LogTrivial("ReportsPlusExtension: Updated callout.xml Status to '" + status + "'.");
                    }
                }
            }
            catch (Exception ex)
            {
                Game.LogTrivial("ReportsPlusExtension: Error updating callout.xml: " + ex.Message);
            }
        }

        private static void WatchSignalFile()
        {
            string signalPath = Path.Combine(Path.GetTempPath(), "ReportsPlusCalloutSignal.txt");
            Game.LogTrivial("ReportsPlusExtension: Watching for callout signals at " + signalPath);

            while (true)
            {
                GameFiber.Wait(200);

                try
                {
                    if (File.Exists(signalPath))
                    {
                        string content = File.ReadAllText(signalPath).Trim();
                        try { File.Delete(signalPath); } catch { }

                        Game.LogTrivial("ReportsPlusExtension: Received callout signal command: '" + content + "'");

                        if (content.Equals("respond", StringComparison.OrdinalIgnoreCase) ||
                            content.Equals("accept", StringComparison.OrdinalIgnoreCase) ||
                            content.StartsWith("respond", StringComparison.OrdinalIgnoreCase))
                        {
                            AcceptCallout();
                        }
                        else if (content.Equals("cancel", StringComparison.OrdinalIgnoreCase) ||
                                 content.Equals("cancel_callout", StringComparison.OrdinalIgnoreCase))
                        {
                            CancelCallout();
                        }
                    }
                }
                catch (Exception ex)
                {
                    Game.LogTrivial("ReportsPlusExtension: Error in signal watcher: " + ex.Message);
                }
            }
        }

        public static void AcceptCallout()
        {
            try
            {
                bool accepted = false;
                if (LatestCalloutHandle != null)
                {
                    try
                    {
                        var state = Functions.GetCalloutAcceptanceState(LatestCalloutHandle);
                        if (state == CalloutAcceptanceState.Pending)
                        {
                            Functions.AcceptPendingCallout(LatestCalloutHandle);
                            accepted = true;
                            Game.LogTrivial("ReportsPlusExtension: Accepted callout via Functions.AcceptPendingCallout!");
                        }
                    }
                    catch (Exception exHandle)
                    {
                        Game.LogTrivial("ReportsPlusExtension: AcceptPendingCallout exception: " + exHandle.Message);
                    }
                }

                // If not accepted via handle, simulate 'Y' keypress
                if (!accepted)
                {
                    SimulateYKeyPress();
                    Game.LogTrivial("ReportsPlusExtension: Simulated 'Y' keypress to accept pending dispatch.");
                }

                UpdateCalloutXmlStatus("Responded");
                Game.DisplayNotification("web_lossantospolicedept", "web_lossantospolicedept", "~w~ReportsPlus CAD", "~g~Callout Responded", "~y~Response registered from Web CAD.");
            }
            catch (Exception ex)
            {
                Game.LogTrivial("ReportsPlusExtension: Error accepting callout: " + ex.Message);
                SimulateYKeyPress();
                UpdateCalloutXmlStatus("Responded");
            }
        }

        public static void CancelCallout()
        {
            try
            {
                if (Functions.IsCalloutRunning())
                {
                    Functions.StopCurrentCallout();
                    Game.LogTrivial("ReportsPlusExtension: Stopped current callout via Functions.StopCurrentCallout.");
                }
                UpdateCalloutXmlStatus("Cancelled");
            }
            catch (Exception ex)
            {
                Game.LogTrivial("ReportsPlusExtension: Error cancelling callout: " + ex.Message);
            }
        }

        private static void SimulateYKeyPress()
        {
            try
            {
                keybd_event(VK_Y, SCAN_Y, 0, UIntPtr.Zero);
                GameFiber.Sleep(80);
                keybd_event(VK_Y, SCAN_Y, KEYEVENTF_KEYUP, UIntPtr.Zero);
            }
            catch (Exception ex)
            {
                Game.LogTrivial("ReportsPlusExtension: Error in keybd_event: " + ex.Message);
            }
        }
    }
}
