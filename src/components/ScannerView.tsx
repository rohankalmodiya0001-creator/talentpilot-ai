import React, { useState } from 'react';
import { Search, MapPin, CheckCircle, ExternalLink, FileText, Mail, MessageSquareCode, ArrowRight, X, Sparkles, AlertCircle, Copy, Check } from 'lucide-react';
import { Job } from '../../server/db.js';

interface ScannerViewProps {
  jobs: Job[];
  onUpdateJobStatus: (id: string, status: Job['status']) => void;
  onRunManualApply: (id: string) => void;
  onGenerateCoverLetter: (id: string) => Promise<string>;
  onGenerateColdEmail: (id: string) => Promise<string>;
  onSolveQuestion: (id: string, question: string) => Promise<string>;
  geminiApiKey: string;
}

export default function ScannerView({
  jobs,
  onUpdateJobStatus,
  onRunManualApply,
  onGenerateCoverLetter,
  onGenerateColdEmail,
  onSolveQuestion,
  geminiApiKey
}: ScannerViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [matchFilter, setMatchFilter] = useState('All');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Tabs inside the AI Details sidebar
  const [activeSidebarTab, setActiveSidebarTab] = useState<'fit' | 'cover' | 'email' | 'qa'>('fit');
  
  // Custom Q&A State
  const [customQuestion, setCustomQuestion] = useState('');
  const [customAnswer, setCustomAnswer] = useState('');
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);

  // Cover Letter / Cold Email loading states
  const [coverLetterText, setCoverLetterText] = useState('');
  const [isLoadingCover, setIsLoadingCover] = useState(false);
  const [coldEmailText, setColdEmailText] = useState('');
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);

  // Copy success indicator states
  const [copiedTextType, setCopiedTextType] = useState<string | null>(null);

  const handleCopyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextType(type);
    setTimeout(() => setCopiedTextType(null), 2000);
  };

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
    setActiveSidebarTab('fit');
    setCustomQuestion('');
    setCustomAnswer('');
    
    // Prefill if job already has them
    setCoverLetterText(job.coverLetter || '');
    setColdEmailText(job.coldEmail || '');
  };

  const loadCoverLetter = async () => {
    if (!selectedJob) return;
    setIsLoadingCover(true);
    try {
      const res = await onGenerateCoverLetter(selectedJob.id);
      setCoverLetterText(res);
    } catch (e) {
      setCoverLetterText('Failed to generate cover letter.');
    } finally {
      setIsLoadingCover(false);
    }
  };

  const loadColdEmail = async () => {
    if (!selectedJob) return;
    setIsLoadingEmail(true);
    try {
      const res = await onGenerateColdEmail(selectedJob.id);
      setColdEmailText(res);
    } catch (e) {
      setColdEmailText('Failed to generate cold email.');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleSolveQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !customQuestion.trim()) return;
    
    setIsGeneratingAnswer(true);
    setCustomAnswer('');
    try {
      const ans = await onSolveQuestion(selectedJob.id, customQuestion);
      setCustomAnswer(ans);
    } catch (err) {
      setCustomAnswer('Failed to generate response.');
    } finally {
      setIsGeneratingAnswer(false);
    }
  };

  // Unique locations for filter
  const locations = ['All', ...Array.from(new Set(jobs.map(j => j.location).filter(Boolean)))];

  // Filtering Logic
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = locationFilter === 'All' || job.location === locationFilter;
    
    const score = job.matchScore || 0;
    const matchesMatch = 
      matchFilter === 'All' ||
      (matchFilter === 'High' && score >= 75) ||
      (matchFilter === 'Medium' && score >= 60 && score < 75) ||
      (matchFilter === 'Low' && score < 60);

    return matchesSearch && matchesLocation && matchesMatch;
  });

  const getMatchScoreClass = (score: number | null) => {
    if (score === null) return 'match-med';
    if (score >= 75) return 'match-high';
    if (score >= 60) return 'match-med';
    return 'match-low';
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Opportunity Scanner</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Browse crawled internships worldwide, review AI matches, and automate applications.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{
        padding: '1.25rem',
        marginBottom: '1.5rem',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        gap: '1rem',
        alignItems: 'center'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by company or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {/* Location Dropdown */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <MapPin size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', zIndex: 5 }} />
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
          >
            <option value="All">Locations: All</option>
            {locations.filter(l => l !== 'All').map((loc, idx) => (
              <option key={idx} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* Match Score Dropdown */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Sparkles size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', zIndex: 5 }} />
          <select
            value={matchFilter}
            onChange={(e) => setMatchFilter(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.5rem', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
          >
            <option value="All">Match Fit: All</option>
            <option value="High">Strong Fit (≥ 75%)</option>
            <option value="Medium">Medium Fit (60% - 74%)</option>
            <option value="Low">Weak Fit (&lt; 60%)</option>
          </select>
        </div>
      </div>

      {/* Main List Layout */}
      <div style={{ display: 'flex', gap: '2rem', flex: 1, overflow: 'hidden' }}>
        
        {/* Table Container */}
        <div className="glass-panel" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {filteredJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
              <AlertCircle size={36} style={{ marginBottom: '1rem', color: 'var(--text-muted)' }} />
              <h3>No internships found matching your filters</h3>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Make sure your autopilot has run a scan or adjust your search parameters.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '1rem' }}>Company</th>
                  <th style={{ padding: '1rem' }}>Role</th>
                  <th style={{ padding: '1rem' }}>Location</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Match Fit</th>
                  <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => handleSelectJob(job)}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      background: selectedJob?.id === job.id ? 'rgba(99, 102, 241, 0.08)' : 'transparent'
                    }}
                    className="table-row"
                  >
                    <td style={{ padding: '1.25rem 1rem', fontWeight: 600 }}>{job.company}</td>
                    <td style={{ padding: '1.25rem 1rem', color: 'var(--text-primary)' }}>{job.role}</td>
                    <td style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                        {job.location}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                      <span className={`match-badge ${getMatchScoreClass(job.matchScore)}`}>
                        {job.matchScore !== null ? `${job.matchScore}%` : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        background: job.status === 'Applied' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(255,255,255,0.05)',
                        color: job.status === 'Applied' ? '#34d399' : 'var(--text-secondary)',
                        border: `1px solid ${job.status === 'Applied' ? 'rgba(5, 150, 105, 0.2)' : 'rgba(255,255,255,0.08)'}`
                      }}>
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Sidebar AI Details Panel */}
        {selectedJob && (
          <div className="glass-panel" style={{
            width: '450px',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            background: 'rgba(15, 22, 41, 0.95)',
            borderLeft: '1px solid rgba(99, 102, 241, 0.2)',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            position: 'relative'
          }}>
            {/* Sidebar Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-indigo)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  AI MATCH ANALYSIS
                </span>
                <h3 style={{ fontSize: '1.25rem', marginTop: '0.2rem' }}>{selectedJob.company}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedJob.role}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Sidebar Tab Menu */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              {(['fit', 'cover', 'email', 'qa'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSidebarTab(tab)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeSidebarTab === tab ? '2px solid var(--color-indigo)' : '2px solid transparent',
                    color: activeSidebarTab === tab ? 'white' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8rem',
                    fontWeight: activeSidebarTab === tab ? '600' : '500',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab === 'qa' ? 'Form Q&A' : tab === 'fit' ? 'Match Fit' : tab === 'cover' ? 'Cover Letter' : 'Recruiter DM'}
                </button>
              ))}
            </div>

            {/* Sidebar Content */}
            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Tab 1: Match Fit */}
              {activeSidebarTab === 'fit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Match Score Display */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '2px solid var(--color-indigo)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      color: 'var(--color-indigo)',
                      boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)'
                    }}>
                      {selectedJob.matchScore !== null ? `${selectedJob.matchScore}%` : 'TBD'}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem' }}>Overall Compatibility Fit</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Calculated against your uploaded resume details.</p>
                    </div>
                  </div>

                  {/* Explanation text */}
                  {selectedJob.matchExplanation && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {selectedJob.matchExplanation}
                      </p>
                    </div>
                  )}

                  {/* Strengths */}
                  {selectedJob.strengths && selectedJob.strengths.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Candidate Strengths</span>
                      <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {selectedJob.strengths.map((str, idx) => (
                          <li key={idx}>{str}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Gaps */}
                  {selectedJob.gaps && selectedJob.gaps.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Potential Experience Gaps</span>
                      <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {selectedJob.gaps.map((gap, idx) => (
                          <li key={idx} style={{ listStyleType: 'circle' }}>{gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Resume Tips */}
                  {selectedJob.resumeTips && (
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-cyan)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Resume Tailoring Advice</span>
                      <div style={{
                        background: 'rgba(6, 182, 212, 0.05)',
                        border: '1px solid rgba(6, 182, 212, 0.15)',
                        borderRadius: '8px',
                        padding: '0.85rem',
                        fontSize: '0.8rem',
                        color: '#b5f1f9',
                        lineHeight: 1.4,
                        whiteSpace: 'pre-line'
                      }}>
                        {selectedJob.resumeTips}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Tab 2: Cover Letter */}
              {activeSidebarTab === 'cover' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Custom Cover Letter draft:</span>
                    {coverLetterText && (
                      <button
                        onClick={() => handleCopyText(coverLetterText, 'cover')}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                      >
                        {copiedTextType === 'cover' ? <Check size={12} /> : <Copy size={12} />}
                        {copiedTextType === 'cover' ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>
                  
                  {coverLetterText ? (
                    <textarea
                      readOnly
                      value={coverLetterText}
                      className="form-input form-textarea"
                      style={{ flex: 1, minHeight: '300px', fontSize: '0.8rem', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <FileText size={32} style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No cover letter generated yet for this job.</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Click the button below to generate a tailored cover letter using Gemini.</p>
                      </div>
                      <button
                        onClick={loadCoverLetter}
                        disabled={isLoadingCover}
                        className="btn btn-primary"
                        style={{ fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}
                      >
                        {isLoadingCover ? 'Generating Draft...' : 'Generate Cover Letter'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Cold Recruiter Outreach */}
              {activeSidebarTab === 'email' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Recruiter LinkedIn/Email Cold Message:</span>
                    {coldEmailText && (
                      <button
                        onClick={() => handleCopyText(coldEmailText, 'email')}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                      >
                        {copiedTextType === 'email' ? <Check size={12} /> : <Copy size={12} />}
                        {copiedTextType === 'email' ? 'Copied!' : 'Copy'}
                      </button>
                    )}
                  </div>

                  {coldEmailText ? (
                    <textarea
                      readOnly
                      value={coldEmailText}
                      className="form-input form-textarea"
                      style={{ flex: 1, minHeight: '200px', fontSize: '0.8rem', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <Mail size={32} style={{ color: 'var(--text-muted)' }} />
                      <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No recruiter cold outreach generated yet.</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Create a short message highlighting key matching achievements to send to hiring team.</p>
                      </div>
                      <button
                        onClick={loadColdEmail}
                        disabled={isLoadingEmail}
                        className="btn btn-primary"
                        style={{ fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}
                      >
                        {isLoadingEmail ? 'Generating Pitch...' : 'Generate Recruiter Outreach'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Form Q&A Solver */}
              {activeSidebarTab === 'qa' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>Form Prompt Solver</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Paste short-answer application prompts and let Gemini write matching responses.</p>
                  </div>
                  
                  <form onSubmit={handleSolveQuestionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <textarea
                      placeholder="Example: 'Why do you want to join our company?' or 'Describe a challenging technical project you worked on.'"
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      required
                      className="form-input form-textarea"
                      style={{ minHeight: '80px', fontSize: '0.8rem' }}
                    />
                    <button
                      type="submit"
                      disabled={isGeneratingAnswer || !customQuestion.trim()}
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', justifyContent: 'center' }}
                    >
                      {isGeneratingAnswer ? 'Solving Prompt...' : 'Draft Response'}
                    </button>
                  </form>

                  {customAnswer && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-cyan)', fontWeight: 600 }}>Suggested Answer:</span>
                        <button
                          onClick={() => handleCopyText(customAnswer, 'qa')}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                        >
                          {copiedTextType === 'qa' ? <Check size={10} /> : <Copy size={10} />}
                          {copiedTextType === 'qa' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        padding: '1rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-primary)',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap'
                      }}>
                        {customAnswer}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Sidebar Sticky Footer Actions */}
            <div style={{
              padding: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              background: 'rgba(11, 15, 26, 0.95)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem'
            }}>
              {/* Outer Link */}
              <a
                href={selectedJob.link}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ justifyContent: 'center', fontSize: '0.8rem', textDecoration: 'none' }}
              >
                Go to Posting <ExternalLink size={14} />
              </a>

              {/* Run Auto Apply on this specific role */}
              <button
                onClick={() => onRunManualApply(selectedJob.id)}
                disabled={selectedJob.status === 'Applied'}
                className="btn btn-primary"
                style={{
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  opacity: selectedJob.status === 'Applied' ? 0.6 : 1,
                  cursor: selectedJob.status === 'Applied' ? 'not-allowed' : 'pointer'
                }}
              >
                Agent Apply <ArrowRight size={14} />
              </button>
            </div>
            
          </div>
        )}

      </div>

      {/* Embedded keyframe animation */}
      <style>{`
        .table-row:hover {
          background: rgba(255, 255, 255, 0.02) !important;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

    </div>
  );
}
