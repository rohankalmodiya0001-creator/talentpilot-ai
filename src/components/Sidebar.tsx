import React from 'react';
import { LayoutDashboard, Compass, Kanban, User, Radio, Settings } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  autopilotEnabled: boolean;
  isScanning: boolean;
}

export default function Sidebar({ activeView, setActiveView, autopilotEnabled, isScanning }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scanner', label: 'Internet Scanner', icon: Compass },
    { id: 'tracker', label: 'Application Tracker', icon: Kanban },
    { id: 'profile', label: 'Profile & Settings', icon: User },
  ];

  return (
    <div className="glass-panel" style={{
      width: '280px',
      height: '100%',
      borderRadius: '0px',
      borderLeft: 'none',
      borderTop: 'none',
      borderBottom: 'none',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1.5rem',
      justifyContent: 'space-between',
      background: 'rgba(10, 14, 27, 0.8)'
    }}>
      <div>
        {/* Logo Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--color-indigo) 0%, var(--color-cyan) 100%)',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)'
          }}>
            🧭
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '-0.5px' }} className="gradient-text">
              TalentPilot AI
            </h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Autonomous Agent
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  width: '100%',
                  padding: '1rem',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  borderLeft: isActive ? '3px solid var(--color-indigo)' : '3px solid transparent',
                  paddingLeft: isActive ? 'calc(1rem - 3px)' : '1rem'
                }}
                className={!isActive ? 'sidebar-btn' : ''}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--color-indigo)' : 'inherit' }} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Autopilot Status Indicator Widget */}
      <div className="glass-panel" style={{
        padding: '1rem',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(5, 7, 12, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
            Autopilot Loop
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: autopilotEnabled ? '#10b981' : '#ef4444'
            }} className={autopilotEnabled ? 'pulse-green' : 'pulse-red'} />
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: autopilotEnabled ? '#10b981' : '#ef4444'
            }}>
              {autopilotEnabled ? 'ACTIVE' : 'IDLE'}
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {isScanning ? '🔍 Scanning internet...' : autopilotEnabled ? '⏰ Waiting for next scan...' : '💤 Daemon stopped.'}
          </span>
          {autopilotEnabled && (
            <span style={{ fontSize: '0.65rem', color: 'var(--color-cyan)', fontWeight: '500' }}>
              • Evaluating matches globally
            </span>
          )}
        </div>
      </div>
      
      {/* Styles for hover interactions */}
      <style>{`
        .sidebar-btn:hover {
          background: rgba(255, 255, 255, 0.03) !important;
          color: white !important;
          transform: translateX(2px);
        }
      `}</style>
    </div>
  );
}
