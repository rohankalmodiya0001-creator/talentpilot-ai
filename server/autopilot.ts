import { runFullScan } from './crawler.js';
import { readDb, writeDb, addLog, Job, Settings } from './db.js';
import { evaluateJobMatch } from './gemini.js';
import { applyToJob } from './applier.js';
import { WebSocket } from 'ws';

let autopilotTimer: NodeJS.Timeout | null = null;
let isScanning = false;
let activeClients: Set<WebSocket> = new Set();

export function registerWsClient(ws: WebSocket) {
  activeClients.add(ws);
  
  // Send current logs to client on connection
  const db = readDb();
  ws.send(JSON.stringify({ type: 'init_logs', data: db.logs.slice(0, 50).reverse() }));
  ws.send(JSON.stringify({ type: 'status', data: { autopilotEnabled: db.settings.autopilotEnabled, isScanning } }));

  ws.on('close', () => {
    activeClients.delete(ws);
  });
}

function broadcast(type: string, data: any) {
  const message = JSON.stringify({ type, data });
  for (const client of activeClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// Log wrapper that broadcasts to WebSockets
function broadcastLog(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') {
  const newLog = addLog(message, level);
  broadcast('log', newLog);
}

export async function runAutopilotCycle() {
  if (isScanning) return;
  isScanning = true;
  broadcast('status', { autopilotEnabled: true, isScanning: true });
  
  try {
    broadcastLog('=== Autopilot cycle started ===', 'info');
    const db = readDb();
    const settings = db.settings;
    
    if (!settings.resumeText || settings.resumeText.trim() === '') {
      broadcastLog('Autopilot skipped: No resume text set in profile. Please enter your resume details.', 'warn');
      isScanning = false;
      broadcast('status', { autopilotEnabled: settings.autopilotEnabled, isScanning: false });
      return;
    }
    
    // 1. Scan the internet
    const crawledJobs = await runFullScan();
    
    // Reload database in case user updated it during crawl
    const currentDb = readDb();
    const existingJobUrls = new Set(currentDb.jobs.map(j => j.link.toLowerCase()));
    
    let newJobsFound = 0;
    
    // 2. Evaluate matches and apply
    for (const job of crawledJobs) {
      // Stop loop if autopilot was turned off midway
      const checkSettings = readDb().settings;
      if (!checkSettings.autopilotEnabled) {
        broadcastLog('Autopilot cycle interrupted: Autopilot was disabled.', 'warn');
        break;
      }
      
      const jobUrlLower = job.link.toLowerCase();
      if (existingJobUrls.has(jobUrlLower)) continue;
      
      newJobsFound++;
      broadcastLog(`Analyzing fit for: ${job.company} - ${job.role}...`, 'info');
      
      // Call Gemini for fit evaluation
      const match = await evaluateJobMatch(
        settings.resumeText,
        job.company,
        job.role,
        job.location,
        settings.geminiApiKey
      );
      
      const enrichedJob: Job = {
        ...job,
        matchScore: match.matchScore,
        matchExplanation: match.matchExplanation,
        gaps: match.gaps,
        strengths: match.strengths,
        resumeTips: match.resumeTips,
        status: match.matchScore >= 70 ? 'Bookmarked' : 'Rejected'
      };
      
      // Update database
      const dbToUpdate = readDb();
      dbToUpdate.jobs.push(enrichedJob);
      writeDb(dbToUpdate);
      broadcast('job_added', enrichedJob);
      
      broadcastLog(`AI Match: ${match.matchScore}% fit. Reason: ${match.matchExplanation.substring(0, 100)}...`, 
        match.matchScore >= 70 ? 'success' : 'info'
      );
      
      // 3. Auto-Apply if strong fit
      if (match.matchScore >= 70 && settings.autoSubmit) {
        broadcastLog(`Strong match found! Launching application agent for ${job.company}...`, 'info');
        
        // Update job status to 'Needs Review' while applying
        const dbForApplyState = readDb();
        const activeJob = dbForApplyState.jobs.find(j => j.id === enrichedJob.id);
        if (activeJob) activeJob.status = 'Needs Review';
        writeDb(dbForApplyState);
        broadcast('job_updated', { id: enrichedJob.id, status: 'Needs Review' });
        
        const applySuccess = await applyToJob(
          job.link,
          settings,
          (progressMsg, isErr) => {
            broadcastLog(`[${job.company} Applier] ${progressMsg}`, isErr ? 'warn' : 'info');
          }
        );
        
        const finalDb = readDb();
        const jobToFinalize = finalDb.jobs.find(j => j.id === enrichedJob.id);
        
        if (jobToFinalize) {
          if (applySuccess) {
            jobToFinalize.status = settings.autoSubmit ? 'Applied' : 'Needs Review';
            jobToFinalize.appliedDate = new Date().toLocaleDateString();
            broadcastLog(`✓ Auto-applied to ${job.company} for ${job.role}!`, 'success');
          } else {
            jobToFinalize.status = 'Needs Review';
            broadcastLog(`⚠ Application incomplete for ${job.company}. Manual action required in dashboard.`, 'warn');
          }
          writeDb(finalDb);
          broadcast('job_updated', jobToFinalize);
        }
      }
      
      // Small cooling period between processing to look human and avoid rate limits
      await new Promise(r => setTimeout(r, 5000));
    }
    
    broadcastLog(`=== Autopilot cycle finished. Scanned ${crawledJobs.length} roles, processed ${newJobsFound} new opportunities ===`, 'success');
  } catch (err: any) {
    broadcastLog(`Autopilot encountered a runtime error: ${err.message}`, 'error');
  } finally {
    isScanning = false;
    const finalSettings = readDb().settings;
    broadcast('status', { autopilotEnabled: finalSettings.autopilotEnabled, isScanning: false });
  }
}

export function startAutopilot() {
  const db = readDb();
  if (autopilotTimer) {
    clearInterval(autopilotTimer);
  }
  
  // Set autopilot status to enabled
  db.settings.autopilotEnabled = true;
  writeDb(db);
  broadcast('status', { autopilotEnabled: true, isScanning });
  
  broadcastLog('Autopilot daemon activated. Scanning loop running...', 'success');
  
  // Run cycle immediately
  runAutopilotCycle();
  
  // Setup interval loop (convert minutes to ms)
  const intervalMs = (db.settings.scanInterval || 60) * 60 * 1000;
  autopilotTimer = setInterval(() => {
    runAutopilotCycle();
  }, intervalMs);
}

export function stopAutopilot() {
  if (autopilotTimer) {
    clearInterval(autopilotTimer);
    autopilotTimer = null;
  }
  
  const db = readDb();
  db.settings.autopilotEnabled = false;
  writeDb(db);
  
  broadcast('status', { autopilotEnabled: false, isScanning });
  broadcastLog('Autopilot daemon stopped.', 'warn');
}

export function triggerScanNow() {
  broadcastLog('Manual scan triggered by user.', 'info');
  runAutopilotCycle();
}
