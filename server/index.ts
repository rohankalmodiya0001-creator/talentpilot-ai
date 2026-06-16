import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

import { readDb, writeDb, addLog, Job, Settings } from './db.js';
import { startAutopilot, stopAutopilot, triggerScanNow, registerWsClient } from './autopilot.js';
import { generateCoverLetter, generateColdEmail, generateAnswerForPrompt } from './gemini.js';
import { applyToJob } from './applier.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Endpoints

// Settings API
app.get('/api/settings', (req, res) => {
  const db = readDb();
  res.json(db.settings);
});

app.post('/api/settings', (req, res) => {
  const newSettings = req.body as Settings;
  const db = readDb();
  
  const wasAutopilotEnabled = db.settings.autopilotEnabled;
  db.settings = { ...db.settings, ...newSettings };
  writeDb(db);
  
  // Start/Stop Autopilot if it was toggled
  if (db.settings.autopilotEnabled && !wasAutopilotEnabled) {
    startAutopilot();
  } else if (!db.settings.autopilotEnabled && wasAutopilotEnabled) {
    stopAutopilot();
  }
  
  res.json(db.settings);
});

// Jobs API
app.get('/api/jobs', (req, res) => {
  const db = readDb();
  res.json(db.jobs);
});

app.put('/api/jobs/:id', (req, res) => {
  const jobId = req.params.id;
  const updatedJobData = req.body as Partial<Job>;
  const db = readDb();
  
  const index = db.jobs.findIndex(j => j.id === jobId);
  if (index !== -1) {
    db.jobs[index] = { ...db.jobs[index], ...updatedJobData };
    writeDb(db);
    res.json(db.jobs[index]);
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
});

app.delete('/api/jobs/:id', (req, res) => {
  const jobId = req.params.id;
  const db = readDb();
  
  const initialLength = db.jobs.length;
  db.jobs = db.jobs.filter(j => j.id !== jobId);
  
  if (db.jobs.length < initialLength) {
    writeDb(db);
    res.json({ message: 'Job deleted successfully' });
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Run scan immediately
app.post('/api/scan', (req, res) => {
  triggerScanNow();
  res.json({ message: 'Scan triggered' });
});

// Trigger individual manual Auto-Apply
app.post('/api/jobs/apply/:id', async (req, res) => {
  const jobId = req.params.id;
  const db = readDb();
  
  const job = db.jobs.find(j => j.id === jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  
  // Run apply asynchronously so we don't block API
  res.json({ message: 'Application process started' });
  
  addLog(`Manual Auto-Apply triggered for ${job.company} - ${job.role}`, 'info');
  
  const success = await applyToJob(job.link, db.settings, (msg, isErr) => {
    addLog(`[Manual Apply - ${job.company}] ${msg}`, isErr ? 'warn' : 'info');
  });
  
  const finalDb = readDb();
  const jobToUpdate = finalDb.jobs.find(j => j.id === jobId);
  if (jobToUpdate) {
    if (success) {
      jobToUpdate.status = db.settings.autoSubmit ? 'Applied' : 'Needs Review';
      jobToUpdate.appliedDate = new Date().toLocaleDateString();
    } else {
      jobToUpdate.status = 'Needs Review';
    }
    writeDb(finalDb);
  }
});

// Custom AI Generations
app.post('/api/jobs/generate-cover-letter/:id', async (req, res) => {
  const jobId = req.params.id;
  const db = readDb();
  const job = db.jobs.find(j => j.id === jobId);
  
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  
  try {
    const letter = await generateCoverLetter(
      db.settings.resumeText,
      job.company,
      job.role,
      db.settings.geminiApiKey
    );
    
    // Save to job
    const finalDb = readDb();
    const targetJob = finalDb.jobs.find(j => j.id === jobId);
    if (targetJob) {
      targetJob.coverLetter = letter;
      writeDb(finalDb);
    }
    
    res.json({ coverLetter: letter });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/generate-cold-email/:id', async (req, res) => {
  const jobId = req.params.id;
  const db = readDb();
  const job = db.jobs.find(j => j.id === jobId);
  
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  
  try {
    const emailText = await generateColdEmail(
      db.settings.resumeText,
      job.company,
      job.role,
      db.settings.geminiApiKey
    );
    
    // Save to job
    const finalDb = readDb();
    const targetJob = finalDb.jobs.find(j => j.id === jobId);
    if (targetJob) {
      targetJob.coldEmail = emailText;
      writeDb(finalDb);
    }
    
    res.json({ coldEmail: emailText });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/solve-prompt', async (req, res) => {
  const { jobId, question } = req.body;
  const db = readDb();
  const job = db.jobs.find(j => j.id === jobId);
  
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  
  try {
    const answer = await generateAnswerForPrompt(
      db.settings.resumeText,
      job.company,
      job.role,
      question,
      db.settings.geminiApiKey
    );
    res.json({ answer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logs API
app.get('/api/logs', (req, res) => {
  const db = readDb();
  res.json(db.logs);
});

app.post('/api/clear-logs', (req, res) => {
  const db = readDb();
  db.logs = [];
  writeDb(db);
  addLog('Logs cleared by user.', 'info');
  res.json({ message: 'Logs cleared' });
});

// Serve frontend assets in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildPath = path.resolve(__dirname, '../dist');

if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Create HTTP server and WebSockets
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  registerWsClient(ws);
});

// Start Server & Restore Autopilot state if enabled
server.listen(port, () => {
  console.log(`\n\x1b[35m🚀 TalentPilot AI Server listening on port http://localhost:${port}\x1b[0m\n`);
  
  // Read DB to check if autopilot was enabled on last shutdown
  const db = readDb();
  if (db.settings.autopilotEnabled) {
    console.log('Restoring Autopilot background loop daemon...');
    startAutopilot();
  }
});
