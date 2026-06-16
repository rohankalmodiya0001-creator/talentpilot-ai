import fs from 'fs';
import path from 'path';

export interface Settings {
  name: string;
  email: string;
  phone: string;
  website: string;
  github: string;
  linkedin: string;
  resumeText: string;
  targetRoles: string[];
  locationPreferences: string[];
  geminiApiKey: string;
  autopilotEnabled: boolean;
  autoSubmit: boolean;
  scanInterval: number; // in minutes
}

export interface Job {
  id: string;
  company: string;
  role: string;
  location: string;
  link: string;
  dateAdded: string;
  status: 'Bookmarked' | 'Needs Review' | 'Applied' | 'OA' | 'Interviewing' | 'Offer' | 'Rejected';
  matchScore: number | null;
  matchExplanation: string | null;
  gaps: string[] | null;
  strengths: string[] | null;
  resumeTips: string | null;
  coverLetter: string | null;
  coldEmail: string | null;
  notes: string;
  appliedDate: string | null;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface DatabaseSchema {
  settings: Settings;
  jobs: Job[];
  logs: LogEntry[];
}

const DB_DIR = path.resolve('server/data');
const DB_FILE = path.join(DB_DIR, 'db.json');

const defaultSettings: Settings = {
  name: '',
  email: '',
  phone: '',
  website: '',
  github: '',
  linkedin: '',
  resumeText: '',
  targetRoles: ['Software Engineering', 'Frontend', 'Backend', 'Fullstack', 'AI/ML', 'Data Science'],
  locationPreferences: ['Remote', 'United States', 'Canada', 'India'],
  geminiApiKey: '',
  autopilotEnabled: false,
  autoSubmit: false,
  scanInterval: 60 // 1 hour
};

const initialData: DatabaseSchema = {
  settings: defaultSettings,
  jobs: [],
  logs: []
};

// Ensure database file exists
function initDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

export function readDb(): DatabaseSchema {
  initDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB, resetting', err);
    return initialData;
  }
}

export function writeDb(data: DatabaseSchema) {
  initDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function addLog(message: string, level: LogEntry['level'] = 'info') {
  const db = readDb();
  const newLog: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message
  };
  
  // Keep last 200 logs to prevent file bloat
  db.logs.unshift(newLog);
  if (db.logs.length > 200) {
    db.logs = db.logs.slice(0, 200);
  }
  
  writeDb(db);
  
  // Also log to backend console
  const color = {
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    success: '\x1b[32m'
  }[level];
  console.log(`${color}[${newLog.timestamp}] [${level.toUpperCase()}] ${message}\x1b[0m`);
  
  return newLog;
}
