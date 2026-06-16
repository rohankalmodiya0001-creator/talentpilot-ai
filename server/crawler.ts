import axios from 'axios';
import * as cheerio from 'cheerio';
import { Job, addLog } from './db.js';

// Parse SimplifyJobs Markdown table
function parseSimplifyMarkdown(markdown: string): Omit<Job, 'id' | 'matchScore' | 'matchExplanation' | 'gaps' | 'strengths' | 'resumeTips' | 'coverLetter' | 'coldEmail' | 'notes' | 'appliedDate'>[] {
  const jobs: Omit<Job, 'id' | 'matchScore' | 'matchExplanation' | 'gaps' | 'strengths' | 'resumeTips' | 'coverLetter' | 'coldEmail' | 'notes' | 'appliedDate'>[] = [];
  const lines = markdown.split('\n');
  
  let inTable = false;
  
  for (const line of lines) {
    // Detect start of the table
    if (line.includes('| Company |') && line.includes('| Role |')) {
      inTable = true;
      continue;
    }
    
    if (!inTable) continue;
    
    // Check if table ended
    if (inTable && !line.startsWith('|')) {
      // Small break in markdown, but tables might resume or end.
      // We skip empty lines, but if it's completely different content, we stop.
      if (line.trim() === '') continue;
      // If we see another heading, stop.
      if (line.startsWith('#')) {
        inTable = false;
      }
      continue;
    }
    
    // Skip separator line | :--- | :--- |
    if (line.includes('| :---') || line.includes('| :---:')) {
      continue;
    }
    
    const parts = line.split('|').map(p => p.trim());
    // Table rows should have at least 5 columns
    if (parts.length < 6) continue;
    
    // parts[0] is empty because line starts with '|'
    const companyCell = parts[1];
    const roleCell = parts[2];
    const locationCell = parts[3];
    const applyCell = parts[4];
    const dateCell = parts[5];
    
    // Extract company name and website link if available
    let companyName = companyCell;
    // Check for markdown link: **[Company](url)** or [Company](url)
    const companyLinkMatch = companyCell.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (companyLinkMatch) {
      companyName = companyLinkMatch[1];
    }
    // Clean markdown bolding
    companyName = companyName.replace(/\*\*/g, '').trim();
    
    if (!companyName || companyName.toLowerCase() === 'company') continue;
    
    // Extract role
    let role = roleCell.replace(/\*\*/g, '').trim();
    
    // Extract location
    let location = locationCell.trim();
    
    // Extract apply link
    let applyLink = '';
    // Apply links can be: [Apply](link) or <a href="link">Apply</a>
    const mdLinkMatch = applyCell.match(/\[(?:Apply|Link|🔒)\]\(([^)]+)\)/i);
    const htmlLinkMatch = applyCell.match(/href="([^"]+)"/i);
    
    if (mdLinkMatch) {
      applyLink = mdLinkMatch[1];
    } else if (htmlLinkMatch) {
      applyLink = htmlLinkMatch[1];
    } else {
      // Sometimes it's raw link
      const rawUrlMatch = applyCell.match(/(https?:\/\/[^\s]+)/);
      if (rawUrlMatch) applyLink = rawUrlMatch[1];
    }
    
    // Skip closed applications
    if (applyCell.includes('🔒') || applyCell.toLowerCase().includes('closed') || !applyLink) {
      continue;
    }
    
    // Add internship
    jobs.push({
      company: companyName,
      role: role,
      location: location || 'United States',
      link: applyLink,
      dateAdded: dateCell || new Date().toLocaleDateString(),
      status: 'Bookmarked'
    });
  }
  
  return jobs;
}

// Fetch SimplifyJobs internships
async function fetchSimplifyJobs(): Promise<Omit<Job, 'id' | 'matchScore' | 'matchExplanation' | 'gaps' | 'strengths' | 'resumeTips' | 'coverLetter' | 'coldEmail' | 'notes' | 'appliedDate'>[]> {
  const sources = [
    'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md',
    'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/main/README.md',
    'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions-2026/dev/README.md'
  ];
  
  let allJobs: Omit<Job, 'id' | 'matchScore' | 'matchExplanation' | 'gaps' | 'strengths' | 'resumeTips' | 'coverLetter' | 'coldEmail' | 'notes' | 'appliedDate'>[] = [];
  
  for (const url of sources) {
    try {
      addLog(`Fetching internship list from: ${url.split('/').slice(4, 6).join('/')}...`, 'info');
      const response = await axios.get(url, { timeout: 10000 });
      if (response.status === 200) {
        const parsed = parseSimplifyMarkdown(response.data);
        addLog(`Parsed ${parsed.length} open internships from ${url.split('/').slice(5, 6)}`, 'success');
        allJobs = [...allJobs, ...parsed];
      }
    } catch (err: any) {
      addLog(`Failed to fetch from ${url}: ${err.message}`, 'warn');
    }
  }
  
  return allJobs;
}

// Search web for startups and MNCs via DuckDuckGo
async function fetchWebSearchJobs(query: string = 'site:lever.co OR site:greenhouse.io "Software Engineer Intern" "2026"'): Promise<Omit<Job, 'id' | 'matchScore' | 'matchExplanation' | 'gaps' | 'strengths' | 'resumeTips' | 'coverLetter' | 'coldEmail' | 'notes' | 'appliedDate'>[]> {
  const jobs: Omit<Job, 'id' | 'matchScore' | 'matchExplanation' | 'gaps' | 'strengths' | 'resumeTips' | 'coverLetter' | 'coldEmail' | 'notes' | 'appliedDate'>[] = [];
  
  try {
    addLog(`Searching internet for startup roles (query: "${query}")...`, 'info');
    // Using DuckDuckGo Lite or HTML version which is easy to scrape
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });
    
    if (response.status !== 200) return [];
    
    const $ = cheerio.load(response.data);
    const results = $('.result');
    
    results.each((_, element) => {
      const titleNode = $(element).find('.result__title a');
      const titleText = titleNode.text().trim();
      const link = titleNode.attr('href');
      const snippet = $(element).find('.result__snippet').text().trim();
      
      if (!link) return;
      
      // Extract clean target link from DuckDuckGo redirect link
      // DuckDuckGo redirects look like: //r.search.yahoo.com/... or /l/?kh=-1&uddg=https%3A%2F%2Fboards.greenhouse.io%2F...
      let cleanLink = link;
      if (link.includes('uddg=')) {
        const urlParams = new URLSearchParams(link.split('?')[1]);
        const uddg = urlParams.get('uddg');
        if (uddg) cleanLink = uddg;
      }
      
      // Filter out links that are not actually Lever or Greenhouse job postings
      const isJobBoard = cleanLink.includes('boards.greenhouse.io') || cleanLink.includes('jobs.lever.co');
      if (!isJobBoard) return;
      
      // Deduce company name and role
      // Example Greenhouse URL: https://boards.greenhouse.io/spacex/jobs/42135123
      // Example Lever URL: https://jobs.lever.co/rewind/8098a586-bb50-4824-bfbe-0b3ee42a537f
      let company = 'Unknown Company';
      let role = 'Software Engineering Intern';
      
      try {
        const urlObj = new URL(cleanLink);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        
        if (cleanLink.includes('greenhouse.io')) {
          company = pathParts[0] || 'Startup';
        } else if (cleanLink.includes('lever.co')) {
          company = pathParts[0] || 'Startup';
        }
        
        // Capitalize company name
        company = company.charAt(0).toUpperCase() + company.slice(1);
      } catch (e) {}
      
      // Extract role from search title (e.g., "Software Engineer Intern - SpaceX - Greenhouse")
      // Remove trailing Board suffixes
      let cleanedRole = titleText
        .replace(/(-\s*Greenhouse|\s*\|\s*Greenhouse|-\s*Lever|\s*\|\s*Lever)/gi, '')
        .replace(new RegExp(company, 'gi'), '')
        .replace(/^[\s\-\|]+|[\s\-\|]+$/g, '')
        .trim();
        
      if (!cleanedRole || cleanedRole.length < 5) {
        cleanedRole = 'Software Engineering Intern';
      }
      
      jobs.push({
        company,
        role: cleanedRole,
        location: snippet.toLowerCase().includes('remote') ? 'Remote' : 'United States',
        link: cleanLink,
        dateAdded: new Date().toLocaleDateString(),
        status: 'Bookmarked'
      });
    });
    
    addLog(`Internet scan completed. Discovered ${jobs.length} candidate startup application pages.`, 'success');
  } catch (err: any) {
    addLog(`Failed to search internet via DuckDuckGo: ${err.message}`, 'warn');
  }
  
  return jobs;
}

// Main scan function called by the Autopilot loop
export async function runFullScan(): Promise<Job[]> {
  try {
    addLog('Starting comprehensive global internship scan...', 'info');
    
    const [simplifyJobs, webJobs] = await Promise.all([
      fetchSimplifyJobs(),
      fetchWebSearchJobs()
    ]);
    
    const combined = [...simplifyJobs, ...webJobs];
    addLog(`Crawlers found a total of ${combined.length} roles. Filtering duplicates...`, 'info');
    
    // Deduplicate jobs by URL and make full Job objects
    const seenUrls = new Set<string>();
    const uniqueJobs: Job[] = [];
    
    for (const job of combined) {
      // Normalize URL (strip query parameters)
      let normUrl = job.link;
      try {
        const urlObj = new URL(job.link);
        normUrl = urlObj.origin + urlObj.pathname;
      } catch (e) {}
      
      if (seenUrls.has(normUrl)) continue;
      seenUrls.add(normUrl);
      
      // Make unique ID based on company and role
      const id = `${job.company.toLowerCase().replace(/[^a-z0-9]/g, '')}-${job.role.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      
      uniqueJobs.push({
        ...job,
        id,
        link: normUrl,
        matchScore: null,
        matchExplanation: null,
        gaps: null,
        strengths: null,
        resumeTips: null,
        coverLetter: null,
        coldEmail: null,
        notes: '',
        appliedDate: null
      });
    }
    
    addLog(`Scan finished. Found ${uniqueJobs.length} unique active internship roles.`, 'success');
    return uniqueJobs;
  } catch (err: any) {
    addLog(`Error during scan execution: ${err.message}`, 'error');
    return [];
  }
}
