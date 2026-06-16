import React, { useEffect, useRef } from 'react';
import { Play, Square, RefreshCw, Terminal, Trash2, Cpu, BarChart2, ShieldAlert } from 'lucide-react';
import { LogEntry, Job } from '../../server/db.js';

interface DashboardViewProps {
  logs: LogEntry[];
  jobs: Job[];
  autopilotEnabled: boolean;
  isScanning: boolean;
  toggleAutopilot: () => void;
  triggerScan: () => void;
  clearLogs: () => void;
  resumeText: string;
  targetRoles: string[];
}

export default function DashboardView({
  logs,
  jobs,
  autopilotEnabled,
  isScanning,
  toggleAutopilot,
  triggerScan,
  clearLogs,
  resumeText,
  targetRoles
}: DashboardViewProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll terminal to bottom on new logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Statistics calculation
  const totalScanned = jobs.length;
  const matches = jobs.filter(j => j.matchScore && j.matchScore >= 70).length;
  const applied = jobs.filter(j => j.status === 'Applied').length;
  const interviews = jobs.filter(j => j.status === 'Interviewing' || j.status === 'OA').length;
  const successRate = applied > 0 ? Math.round((interviews / applied) * 100) : 0;

  const getLogTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString();
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
            Welcome back, <span className="gradient-text">Agent Commander</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Your autonomous internship search agent is online.
          </p>
        </div>
        
        {/* Quick Action Controls */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={triggerScan}
            disabled={isScanning}
            className="btn btn-secondary"
            style={{ opacity: isScanning ? 0.7 : 1 }}
          >
            <RefreshCw size={16} className={isScanning ? 'spin-anim' : ''} />
            {isScanning ? 'Scanning...' : 'Scan Now'}
          </button>
          
          <button
            onClick={toggleAutopilot}
            className={`btn ${autopilotEnabled ? 'btn-danger' : 'btn-primary'}`}
          >
            {autopilotEnabled ? (
              <>
                <Square size={16} fill="white" /> Stop Autopilot
              </>
            ) : (
              <>
                <Play size={16} fill="white" /> Start Autopilot Loop
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        
        {/* Metric 1 */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-indigo)', padding: '0.75rem', borderRadius: '12px' }}>
            <BarChart2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Scanned</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{totalScanned}</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(168, 85, 247, 0.15)', color: 'var(--color-purple)', padding: '0.75rem', borderRadius: '12px' }}>
            <Cpu size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Match Matches</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-purple)' }}>{matches}</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--color-cyan)', padding: '0.75rem', borderRadius: '12px' }}>
            <RefreshCw size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auto-Applied</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-cyan)' }}>{applied}</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.75rem', borderRadius: '12px' }}>
            <BarChart2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Interview Rate</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981' }}>{successRate}%</span>
          </div>
        </div>

      </div>

      {/* Main Grid: Terminal Console + Status Widget */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* Real-time Logs Terminal */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={18} style={{ color: 'var(--color-indigo)' }} />
              <h3 style={{ fontSize: '1.1rem' }}>Autopilot Activity Console</h3>
            </div>
            <button
              onClick={clearLogs}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.8rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <Trash2 size={14} /> Clear Console
            </button>
          </div>
          
          <div className="terminal">
            {logs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '4rem' }}>
                &gt;_ Autopilot console is idle. Activate autopilot or run a manual scan to stream logs.
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="terminal-line">
                  <span className="terminal-time">[{getLogTime(log.timestamp)}]</span>
                  <span className={`terminal-tag ${log.level}`}>{log.level}</span>
                  <span className="terminal-msg">{log.message}</span>
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Status widget panel */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(15, 23, 42, 0.4)' }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.75rem' }}>
            Agent Target Core
          </h3>
          
          {/* Target roles listing */}
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Target Profiles</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {targetRoles.length === 0 ? (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No roles configured.</span>
              ) : (
                targetRoles.map((role, idx) => (
                  <span key={idx} style={{
                    fontSize: '0.75rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--color-indigo)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    padding: '2px 8px',
                    borderRadius: '20px'
                  }}>
                    {role}
                  </span>
                ))
              )}
            </div>
          </div>
          
          {/* Resume Checklist */}
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>System Integrity</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: resumeText ? '#10b981' : '#ef4444' }}>{resumeText ? '✓' : '✗'}</span>
                <span style={{ color: resumeText ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Resume text loaded ({resumeText ? `${resumeText.length} chars` : 'missing'})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: autopilotEnabled ? '#10b981' : '#f59e0b' }}>{autopilotEnabled ? '✓' : '•'}</span>
                <span>Daemon Loop running</span>
              </div>
            </div>
          </div>
          
          {/* Informational Warning */}
          <div style={{
            background: 'rgba(217, 119, 6, 0.08)',
            border: '1px solid rgba(217, 119, 6, 0.15)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
            marginTop: 'auto'
          }}>
            <ShieldAlert size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <strong>Caution:</strong> Auto-Apply runs Puppeteer locally. If you enable "Auto-Submit", the agent will complete forms and hit submit. Make sure your Profile details are fully filled.
            </p>
          </div>

        </div>

      </div>

      <style>{`
        .spin-anim {
          animation: spin 1.5s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}
