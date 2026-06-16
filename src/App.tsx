import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ScannerView from './components/ScannerView';
import TrackerView from './components/TrackerView';
import ProfileView from './components/ProfileView';
import { Job, Settings, LogEntry } from '../server/db.js';

export default function App() {
  const [activeView, setActiveView] = useState<string>('dashboard');
  
  // App States
  const [settings, setSettings] = useState<Settings | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // 1. Fetch initial data on load
  useEffect(() => {
    async function initFetch() {
      try {
        const settingsRes = await fetch('/api/settings');
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
        setAutopilotEnabled(settingsData.autopilotEnabled);

        const jobsRes = await fetch('/api/jobs');
        const jobsData = await jobsRes.json();
        setJobs(jobsData);

        const logsRes = await fetch('/api/logs');
        const logsData = await logsRes.json();
        // Logs come in reverse (newest first) in db, reverse for terminal scrolling
        setLogs(logsData.reverse());
      } catch (err) {
        console.error('Error fetching initial data from backend', err);
      }
    }
    
    initFetch();
  }, []);

  // 2. Establish WebSocket connection for live log/state streaming
  useEffect(() => {
    // Determine WebSocket URL based on window location
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsPort = window.location.port ? ':3001' : ''; // Fallback for dev mode
    const wsUrl = `${wsProto}//${window.location.hostname}${wsPort}/ws`;
    
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    function connect() {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✓ WebSocket connection to Autopilot established.');
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'status':
            setAutopilotEnabled(msg.data.autopilotEnabled);
            setIsScanning(msg.data.isScanning);
            break;
          case 'init_logs':
            setLogs(msg.data);
            break;
          case 'log':
            setLogs(prev => [...prev, msg.data]);
            break;
          case 'job_added':
            setJobs(prev => {
              if (prev.some(j => j.id === msg.data.id)) return prev;
              return [...prev, msg.data];
            });
            break;
          case 'job_updated':
            setJobs(prev => prev.map(j => j.id === msg.data.id ? { ...j, ...msg.data } : j));
            break;
        }
      };

      ws.onclose = () => {
        console.log('WebSocket closed. Reconnecting in 3s...');
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    }

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // API Call Helpers

  const handleSaveSettings = async (updatedSettings: Settings): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setAutopilotEnabled(data.autopilotEnabled);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const handleToggleAutopilot = async () => {
    if (!settings) return;
    const nextState = !autopilotEnabled;
    const updated = { ...settings, autopilotEnabled: nextState };
    await handleSaveSettings(updated);
  };

  const handleTriggerScan = async () => {
    try {
      await fetch('/api/scan', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearLogs = async () => {
    try {
      const res = await fetch('/api/clear-logs', { method: 'POST' });
      if (res.ok) {
        setLogs([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateJobStatus = async (id: string, status: Job['status']) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updatedJob = await res.json();
        setJobs(prev => prev.map(j => j.id === id ? updatedJob : j));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateJobNotes = async (id: string, notes: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      if (res.ok) {
        const updatedJob = await res.json();
        setJobs(prev => prev.map(j => j.id === id ? updatedJob : j));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setJobs(prev => prev.filter(j => j.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Run Manual application (headful browser agent trigger)
  const handleRunManualApply = async (id: string) => {
    try {
      await fetch(`/api/jobs/apply/${id}`, { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Gemini cover letter generation
  const handleGenerateCoverLetter = async (id: string): Promise<string> => {
    try {
      const res = await fetch(`/api/jobs/generate-cover-letter/${id}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        // Update local jobs state with cover letter
        setJobs(prev => prev.map(j => j.id === id ? { ...j, coverLetter: data.coverLetter } : j));
        return data.coverLetter;
      }
    } catch (e) {
      console.error(e);
    }
    return 'Failed to generate cover letter.';
  };

  // Trigger Gemini recruiter email generation
  const handleGenerateColdEmail = async (id: string): Promise<string> => {
    try {
      const res = await fetch(`/api/jobs/generate-cold-email/${id}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        // Update local jobs state with cold email
        setJobs(prev => prev.map(j => j.id === id ? { ...j, coldEmail: data.coldEmail } : j));
        return data.coldEmail;
      }
    } catch (e) {
      console.error(e);
    }
    return 'Failed to generate cold email.';
  };

  // Trigger custom question answering
  const handleSolveQuestion = async (id: string, question: string): Promise<string> => {
    try {
      const res = await fetch(`/api/jobs/solve-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id, question })
      });
      if (res.ok) {
        const data = await res.json();
        return data.answer;
      }
    } catch (e) {
      console.error(e);
    }
    return 'Failed to solve question.';
  };

  if (!settings) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
        fontSize: '1rem',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="spin-anim" style={{ fontSize: '2rem' }}>🧭</div>
        Connecting to TalentPilot AI Core Daemon...
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        autopilotEnabled={autopilotEnabled}
        isScanning={isScanning}
      />
      
      {/* Main viewport */}
      <main className="main-content">
        {activeView === 'dashboard' && (
          <DashboardView
            logs={logs}
            jobs={jobs}
            autopilotEnabled={autopilotEnabled}
            isScanning={isScanning}
            toggleAutopilot={handleToggleAutopilot}
            triggerScan={handleTriggerScan}
            clearLogs={handleClearLogs}
            resumeText={settings.resumeText}
            targetRoles={settings.targetRoles}
          />
        )}
        
        {activeView === 'scanner' && (
          <ScannerView
            jobs={jobs}
            onUpdateJobStatus={handleUpdateJobStatus}
            onRunManualApply={handleRunManualApply}
            onGenerateCoverLetter={handleGenerateCoverLetter}
            onGenerateColdEmail={handleGenerateColdEmail}
            onSolveQuestion={handleSolveQuestion}
            geminiApiKey={settings.geminiApiKey}
          />
        )}

        {activeView === 'tracker' && (
          <TrackerView
            jobs={jobs}
            onUpdateJobStatus={handleUpdateJobStatus}
            onUpdateJobNotes={handleUpdateJobNotes}
            onDeleteJob={handleDeleteJob}
          />
        )}

        {activeView === 'profile' && (
          <ProfileView
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        )}
      </main>
    </div>
  );
}
