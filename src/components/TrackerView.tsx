import React, { useState } from 'react';
import { Calendar, Briefcase, ChevronRight, ChevronLeft, MapPin, Trash2, Edit3, Save, ExternalLink, X, FileText, CheckCircle } from 'lucide-react';
import { Job } from '../../server/db.js';

interface TrackerViewProps {
  jobs: Job[];
  onUpdateJobStatus: (id: string, status: Job['status']) => void;
  onUpdateJobNotes: (id: string, notes: string) => void;
  onDeleteJob: (id: string) => void;
}

const COLUMNS: { id: Job['status']; label: string; color: string }[] = [
  { id: 'Bookmarked', label: 'Bookmarked', color: 'var(--color-indigo)' },
  { id: 'Needs Review', label: 'Needs Review', color: '#f59e0b' },
  { id: 'Applied', label: 'Applied', color: 'var(--color-cyan)' },
  { id: 'OA', label: 'Online Assessment', color: 'var(--color-purple)' },
  { id: 'Interviewing', label: 'Interviewing', color: '#0ea5e9' },
  { id: 'Offer', label: 'Offers', color: '#10b981' },
  { id: 'Rejected', label: 'Rejected', color: 'var(--text-muted)' }
];

export default function TrackerView({
  jobs,
  onUpdateJobStatus,
  onUpdateJobNotes,
  onDeleteJob
}: TrackerViewProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const handleOpenDetailModal = (job: Job) => {
    setSelectedJob(job);
    setEditingNotes(job.notes || '');
  };

  const handleSaveNotes = async () => {
    if (!selectedJob) return;
    setIsSavingNotes(true);
    try {
      await onUpdateJobNotes(selectedJob.id, editingNotes);
      setSelectedJob({ ...selectedJob, notes: editingNotes });
    } catch (e) {
      alert('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const moveCard = (jobId: string, currentStatus: Job['status'], direction: 'left' | 'right') => {
    const currentIndex = COLUMNS.findIndex(c => c.id === currentStatus);
    let nextIndex = currentIndex;
    
    if (direction === 'left' && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    } else if (direction === 'right' && currentIndex < COLUMNS.length - 1) {
      nextIndex = currentIndex + 1;
    }
    
    if (nextIndex !== currentIndex) {
      onUpdateJobStatus(jobId, COLUMNS[nextIndex].id);
    }
  };

  // Filter jobs by status
  const getJobsByStatus = (status: Job['status']) => {
    return jobs.filter(j => j.status === status);
  };

  const getMatchScoreClass = (score: number | null) => {
    if (score === null) return 'match-med';
    if (score >= 75) return 'match-high';
    if (score >= 60) return 'match-med';
    return 'match-low';
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Application Tracker</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Move cards across your hiring pipeline, log exam deadlines, and take interview notes.
        </p>
      </div>

      {/* Kanban Board Scrolling Area */}
      <div style={{
        display: 'flex',
        gap: '1.25rem',
        overflowX: 'auto',
        flex: 1,
        paddingBottom: '1.5rem',
        alignItems: 'flex-start'
      }}>
        {COLUMNS.map((column) => {
          const columnJobs = getJobsByStatus(column.id);
          return (
            <div
              key={column.id}
              className="glass-panel"
              style={{
                width: '320px',
                minWidth: '320px',
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '1rem',
                flexShrink: 0,
                background: 'rgba(10, 14, 27, 0.45)'
              }}
            >
              {/* Column Title */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                borderBottom: `2px solid ${column.color}`,
                paddingBottom: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{column.label}</span>
                </div>
                <span className="kanban-count">{columnJobs.length}</span>
              </div>

              {/* Cards List */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  overflowY: 'auto',
                  flex: 1,
                  paddingRight: '4px'
                }}
              >
                {columnJobs.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '2.5rem 1rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    border: '1px dashed rgba(255,255,255,0.04)',
                    borderRadius: '8px'
                  }}>
                    Empty Pipeline
                  </div>
                ) : (
                  columnJobs.map((job) => (
                    <div
                      key={job.id}
                      className="kanban-card"
                      onClick={() => handleOpenDetailModal(job)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span className={`match-badge ${getMatchScoreClass(job.matchScore)}`}>
                          {job.matchScore ? `${job.matchScore}% Fit` : 'No Match'}
                        </span>
                        
                        {/* Quick card shift buttons */}
                        <div style={{ display: 'flex', gap: '0.15rem' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => moveCard(job.id, job.status, 'left')}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button
                            onClick={() => moveCard(job.id, job.status, 'right')}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>

                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.2rem' }}>{job.company}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>{job.role}</p>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <MapPin size={10} /> {job.location}
                        </span>
                        {job.appliedDate && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--color-cyan)' }}>
                            <Calendar size={10} /> {job.appliedDate}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Details & Notes Modal Overlay */}
      {selectedJob && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-panel" style={{
            width: '600px',
            background: 'rgba(15, 22, 41, 0.98)',
            border: '1px solid rgba(99,102,241,0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                  {selectedJob.status}
                </span>
                <h3 style={{ fontSize: '1.4rem', marginTop: '0.4rem' }}>{selectedJob.company}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selectedJob.role}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', maxHeight: '400px' }}>
              
              {/* Job Details Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Location</span>
                  <span style={{ fontSize: '0.85rem' }}>{selectedJob.location}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Applied Date</span>
                  <span style={{ fontSize: '0.85rem' }}>{selectedJob.appliedDate || 'Not yet applied'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Match score</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedJob.matchScore ? `${selectedJob.matchScore}% Compatibility` : 'Unrated'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Apply Link</span>
                  <a href={selectedJob.link} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: 'var(--color-indigo)', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
                    Open Posting <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Status Update selection */}
              <div>
                <label className="form-label">Update Tracker Stage</label>
                <select
                  value={selectedJob.status}
                  onChange={(e) => {
                    const newStat = e.target.value as Job['status'];
                    onUpdateJobStatus(selectedJob.id, newStat);
                    setSelectedJob({ ...selectedJob, status: newStat });
                  }}
                  className="form-input"
                  style={{ cursor: 'pointer' }}
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Notes Editor */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Application Notes & Tasks</label>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Enter exam links, schedules, or recruiter names</span>
                </div>
                <textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Example:
- OA link received. Deadline: June 25th.
- HR recruiter: Jane Doe (jdoe@company.com).
- Interview scheduled for July 2nd at 10 AM EST."
                  className="form-input form-textarea"
                  style={{ minHeight: '130px', fontSize: '0.85rem' }}
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              background: 'rgba(11, 15, 26, 0.98)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              {/* Delete Job button */}
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to remove ${selectedJob.company} from your tracker?`)) {
                    onDeleteJob(selectedJob.id);
                    setSelectedJob(null);
                  }
                }}
                className="btn btn-danger"
                style={{ padding: '0.6rem 1rem' }}
              >
                <Trash2 size={14} /> Remove Card
              </button>

              {/* Save notes button */}
              <button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.25rem' }}
              >
                <Save size={14} /> {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
