import React, { useState } from 'react';
import { Save, Key, ShieldAlert, Cpu, ToggleLeft, ToggleRight, Check, AlertCircle } from 'lucide-react';
import { Settings } from '../../server/db.js';

interface ProfileViewProps {
  settings: Settings;
  onSaveSettings: (settings: Settings) => Promise<boolean>;
}

export default function ProfileView({ settings, onSaveSettings }: ProfileViewProps) {
  const [formData, setFormData] = useState<Settings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleToggleChange = (name: keyof Settings) => {
    setFormData(prev => ({
      ...prev,
      [name]: !prev[name] as any
    }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>, name: 'targetRoles' | 'locationPreferences') => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      [name]: tags
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const success = await onSaveSettings(formData);
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      alert('Error saving profile settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Profile & Agent Configuration</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Configure your personal details, resume text, and autonomous agent behavior.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Personal info & Resume */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
            Personal Details & Resume (Auto-fill Source)
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Rohan Sharma"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="rohan@example.com"
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                placeholder="+1 (123) 456-7890"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Personal Website / Portfolio</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://rohansharma.dev"
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">GitHub Profile Link</label>
              <input
                type="url"
                name="github"
                value={formData.github}
                onChange={handleInputChange}
                required
                placeholder="https://github.com/rohan"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">LinkedIn Profile Link</label>
              <input
                type="url"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleInputChange}
                required
                placeholder="https://linkedin.com/in/rohan"
                className="form-input"
              />
            </div>
          </div>

          {/* Resume Text Box */}
          <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Resume Details (Copy-Paste Text)</label>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Include education, skills, and projects</span>
            </div>
            <textarea
              name="resumeText"
              value={formData.resumeText}
              onChange={handleInputChange}
              required
              placeholder="PASTE YOUR FULL RESUME CONTENT HERE...
Example:
EDUCATION
Bachelor of Science in Computer Science, State University, 2023 - 2027
SKILLS
Languages: JavaScript, TypeScript, Python, Java, SQL
Frameworks: React, Next.js, Node.js, Express
EXPERIENCE
Software Engineer Intern at Vercel (Summer 2026)
- Built fullstack dashboard..."
              className="form-input form-textarea"
              style={{ flex: 1, minHeight: '280px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Right Column: AI & Daemon Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Autopilot Daemon config */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={18} style={{ color: 'var(--color-indigo)' }} />
              Autopilot Loop Settings
            </h3>

            {/* Toggle 1: Autopilot Active */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block' }}>Autopilot Daemon Loop</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Periodically check the internet and apply to internships.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleChange('autopilotEnabled')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: formData.autopilotEnabled ? 'var(--color-indigo)' : 'var(--text-muted)' }}
              >
                {formData.autopilotEnabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
              </button>
            </div>

            {/* Toggle 2: Auto Submit */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block' }}>Fully Autonomous Submit</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Submit applications automatically without prompt reviews.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleChange('autoSubmit')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: formData.autoSubmit ? 'var(--color-indigo)' : 'var(--text-muted)' }}
              >
                {formData.autoSubmit ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
              </button>
            </div>

            {/* Polling Interval Select */}
            <div className="form-group">
              <label className="form-label">Internet Scanning Interval</label>
              <select
                name="scanInterval"
                value={formData.scanInterval}
                onChange={handleInputChange}
                className="form-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="15">Every 15 minutes</option>
                <option value="30">Every 30 minutes</option>
                <option value="60">Every 1 hour (Recommended)</option>
                <option value="120">Every 2 hours</option>
                <option value="240">Every 4 hours</option>
              </select>
            </div>

            {/* Target Roles input tags */}
            <div className="form-group">
              <label className="form-label">Target Positions (Comma separated)</label>
              <input
                type="text"
                value={formData.targetRoles.join(', ')}
                onChange={(e) => handleTagsChange(e, 'targetRoles')}
                placeholder="Software Engineering, Fullstack, AI Intern"
                className="form-input"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                Used to filter matching jobs found during crawls.
              </span>
            </div>

            {/* Location preferences tags */}
            <div className="form-group">
              <label className="form-label">Geographic Preferences (Comma separated)</label>
              <input
                type="text"
                value={formData.locationPreferences.join(', ')}
                onChange={(e) => handleTagsChange(e, 'locationPreferences')}
                placeholder="Remote, United States, India"
                className="form-input"
              />
            </div>
          </div>

          {/* Gemini API key config */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(5, 7, 12, 0.4)' }}>
            <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={18} style={{ color: 'var(--color-cyan)' }} />
              API Settings
            </h3>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Google Gemini API Key</label>
              <input
                type="password"
                name="geminiApiKey"
                value={formData.geminiApiKey}
                onChange={handleInputChange}
                placeholder="AI Studio API Key (leave empty for simulated Demo Mode)"
                className="form-input"
                style={{ fontFamily: 'monospace' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
                {!formData.geminiApiKey ? '⚠ Simulated responses active. Enter key from aistudio.google.com to enable real matching.' : '✓ Real-time Gemini 2.5-flash connection enabled.'}
              </span>
            </div>
          </div>

          {/* Sticky footer Save Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
              style={{ flex: 1, padding: '1rem', justifyContent: 'center' }}
            >
              {isSaving ? 'Saving Profile...' : (
                <>
                  <Save size={16} /> Save Agent Configuration
                </>
              )}
            </button>
          </div>

          {/* Success / Warning Alerts */}
          {saveSuccess && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem'
            }}>
              <Check size={18} />
              <span>Agent profile and database settings updated successfully!</span>
            </div>
          )}

        </div>

      </form>
      
    </div>
  );
}
