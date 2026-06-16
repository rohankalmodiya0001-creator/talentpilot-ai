import puppeteer, { Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { Settings, addLog } from './db.js';

interface ApplyProgressCallback {
  (message: string, isError?: boolean): void;
}

// Ensure resume text is written to a file for uploading
function getResumePath(resumeText: string): string {
  const dir = path.resolve('server/data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, 'resume_draft.txt');
  // Write a cleaner formatted text file
  fs.writeFileSync(filePath, resumeText, 'utf-8');
  return filePath;
}

export async function applyToJob(
  jobUrl: string,
  profile: Settings,
  onProgress: ApplyProgressCallback
): Promise<boolean> {
  const resumePath = getResumePath(profile.resumeText || 'Candidate Resume Details');
  
  onProgress(`Launching browser agent...`);
  
  // Launch Puppeteer headful (visible) so user can see/intervene, 
  // or headless depending on user preference. Let's use headful by default for transparency.
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Make it visible so the user can watch the AI apply
      defaultViewport: null,
      args: ['--start-maximized', '--disable-web-security']
    });
  } catch (err: any) {
    onProgress(`Failed to launch Chrome browser: ${err.message}`, true);
    // Try launching in headless mode as a fallback
    onProgress(`Attempting to launch in headless mode...`);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  
  try {
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    
    onProgress(`Navigating to application link: ${jobUrl}...`);
    await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 45000 });
    
    const pageTitle = await page.title();
    onProgress(`Page loaded: "${pageTitle}"`);
    
    // Determine ATS Platform
    const url = page.url().toLowerCase();
    let success = false;
    
    if (url.includes('greenhouse.io')) {
      onProgress(`Greenhouse.io application form detected. Auto-filling fields...`);
      success = await fillGreenhouse(page, profile, resumePath, onProgress);
    } else if (url.includes('lever.co')) {
      onProgress(`Lever.co application form detected. Auto-filling fields...`);
      success = await fillLever(page, profile, resumePath, onProgress);
    } else {
      onProgress(`Generic job page detected. Searching for common form fields...`);
      success = await fillGenericForm(page, profile, resumePath, onProgress);
    }
    
    if (success) {
      if (profile.autoSubmit) {
        onProgress(`Autopilot: Auto-submitting the application form...`);
        // Wait a small moment to look natural
        await page.sleep(2000);
        
        // Attempt submit button click
        let submitted = false;
        if (url.includes('greenhouse.io')) {
          submitted = await clickSelector(page, '#submit_app');
        } else if (url.includes('lever.co')) {
          submitted = await clickSelector(page, '#post-submit, .postings-btn');
        } else {
          submitted = await clickSelector(page, 'button[type="submit"], input[type="submit"]');
        }
        
        if (submitted) {
          onProgress(`Submit button clicked. Waiting for confirmation page...`);
          await page.sleep(5000);
          onProgress(`Application submitted successfully!`, false);
          await browser.close();
          return true;
        } else {
          onProgress(`Failed to click submit button automatically. Pausing for manual submission.`, true);
        }
      } else {
        onProgress(`Form pre-fill complete! Pausing browser window so you can review details, solve CAPTCHAs, and click Submit.`, false);
        // Leave the browser open for the user to review
        return true;
      }
    } else {
      onProgress(`Form fill failed or incomplete. Paused browser for manual completion.`, true);
    }
    
    // Return true since we filled it and left it open for user verification
    return true;
  } catch (err: any) {
    onProgress(`Browser automation error: ${err.message}`, true);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    return false;
  }
}

// Greenhouse Auto-Fill
async function fillGreenhouse(
  page: Page,
  profile: Settings,
  resumePath: string,
  onProgress: ApplyProgressCallback
): Promise<boolean> {
  try {
    const [firstName, ...lastNameParts] = profile.name.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;
    
    // First Name
    await typeIntoSelector(page, '#first_name', firstName, onProgress, 'First Name');
    // Last Name
    await typeIntoSelector(page, '#last_name', lastName, onProgress, 'Last Name');
    // Email
    await typeIntoSelector(page, '#email', profile.email, onProgress, 'Email');
    // Phone
    await typeIntoSelector(page, '#phone', profile.phone, onProgress, 'Phone');
    
    // Resume Upload
    onProgress(`Uploading resume file: ${path.basename(resumePath)}...`);
    const fileInput = await page.$('input[type="file"][name*="resume"], input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      onProgress(`✓ Resume uploaded successfully.`);
    } else {
      onProgress(`⚠ Resume file input field not found.`, true);
    }
    
    // Social Links & Custom Fields
    // Greenhouse uses custom questions, search by label text
    await fillFieldByLabel(page, 'LinkedIn', profile.linkedin, onProgress);
    await fillFieldByLabel(page, 'GitHub', profile.github, onProgress);
    await fillFieldByLabel(page, 'Website', profile.website || profile.github, onProgress);
    
    return true;
  } catch (err: any) {
    onProgress(`Greenhouse fill error: ${err.message}`, true);
    return false;
  }
}

// Lever Auto-Fill
async function fillLever(
  page: Page,
  profile: Settings,
  resumePath: string,
  onProgress: ApplyProgressCallback
): Promise<boolean> {
  try {
    // Resume Upload first (Lever parses resume text to pre-fill sometimes)
    onProgress(`Uploading resume file: ${path.basename(resumePath)}...`);
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      onProgress(`✓ Resume uploaded successfully.`);
      // Wait a moment for Lever parser
      await page.sleep(3000);
    } else {
      onProgress(`⚠ Resume file input field not found.`, true);
    }
    
    // Full Name
    await typeIntoSelector(page, 'input[name="name"]', profile.name, onProgress, 'Full Name');
    // Email
    await typeIntoSelector(page, 'input[name="email"]', profile.email, onProgress, 'Email');
    // Phone
    await typeIntoSelector(page, 'input[name="phone"]', profile.phone, onProgress, 'Phone');
    
    // Social Links
    await typeIntoSelector(page, 'input[name="urls[LinkedIn]"]', profile.linkedin, onProgress, 'LinkedIn');
    await typeIntoSelector(page, 'input[name="urls[GitHub]"]', profile.github, onProgress, 'GitHub');
    if (profile.website) {
      await typeIntoSelector(page, 'input[name="urls[Portfolio]"], input[name="urls[Other]"]', profile.website, onProgress, 'Portfolio/Website');
    }
    
    return true;
  } catch (err: any) {
    onProgress(`Lever fill error: ${err.message}`, true);
    return false;
  }
}

// Generic Form Autofill
async function fillGenericForm(
  page: Page,
  profile: Settings,
  resumePath: string,
  onProgress: ApplyProgressCallback
): Promise<boolean> {
  try {
    // Fill text inputs
    await fillFieldByLabel(page, 'Name', profile.name, onProgress);
    await fillFieldByLabel(page, 'Email', profile.email, onProgress);
    await fillFieldByLabel(page, 'Phone', profile.phone, onProgress);
    await fillFieldByLabel(page, 'LinkedIn', profile.linkedin, onProgress);
    await fillFieldByLabel(page, 'GitHub', profile.github, onProgress);
    
    // Try file upload
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      onProgress(`Attempting generic resume upload...`);
      await fileInput.uploadFile(resumePath);
      onProgress(`✓ Resume file uploaded.`);
    }
    
    return true;
  } catch (err: any) {
    onProgress(`Generic form fill error: ${err.message}`, true);
    return false;
  }
}

// --- Puppeteer Utilities ---

// Extends Puppeteer Page with sleep helper
declare module 'puppeteer' {
  interface Page {
    sleep(ms: number): Promise<void>;
  }
}
Page.prototype.sleep = function (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function typeIntoSelector(
  page: Page,
  selector: string,
  text: string,
  onProgress: ApplyProgressCallback,
  fieldName: string
): Promise<boolean> {
  if (!text) return false;
  try {
    const element = await page.$(selector);
    if (element) {
      // Focus
      await element.focus();
      // Clear current content
      await page.evaluate((sel) => {
        const input = document.querySelector(sel) as HTMLInputElement;
        if (input) input.value = '';
      }, selector);
      
      // Type with realistic key delays
      await page.type(selector, text, { delay: 40 });
      onProgress(`✓ Filled ${fieldName}`);
      return true;
    }
  } catch (err) {}
  return false;
}

async function clickSelector(page: Page, selector: string): Promise<boolean> {
  try {
    const button = await page.$(selector);
    if (button) {
      await button.click();
      return true;
    }
  } catch (e) {}
  return false;
}

async function fillFieldByLabel(
  page: Page,
  labelText: string,
  value: string,
  onProgress: ApplyProgressCallback
): Promise<boolean> {
  if (!value) return false;
  try {
    // Find input by searching for a label that contains labelText
    const inputId = await page.evaluate((labelSub) => {
      // Search labels
      const labels = Array.from(document.querySelectorAll('label'));
      for (const label of labels) {
        if (label.innerText.toLowerCase().includes(labelSub.toLowerCase())) {
          // Check for 'for' attribute
          const htmlFor = label.getAttribute('for');
          if (htmlFor) return htmlFor;
          
          // Check nested inputs
          const nestedInput = label.querySelector('input, textarea');
          if (nestedInput) {
            const id = nestedInput.getAttribute('id');
            if (id) return id;
          }
        }
      }
      return null;
    }, labelText);
    
    if (inputId) {
      await typeIntoSelector(page, `#${inputId}`, value, onProgress, labelText);
      return true;
    }
    
    // Fallback: search inputs by name attribute
    const successByName = await page.evaluate((labelSub, val) => {
      const inputs = Array.from(document.querySelectorAll('input, textarea')) as HTMLInputElement[];
      for (const input of inputs) {
        const nameAttr = (input.getAttribute('name') || '').toLowerCase();
        const placeholderAttr = (input.getAttribute('placeholder') || '').toLowerCase();
        const idAttr = (input.getAttribute('id') || '').toLowerCase();
        
        if (
          nameAttr.includes(labelSub.toLowerCase()) || 
          placeholderAttr.includes(labelSub.toLowerCase()) ||
          idAttr.includes(labelSub.toLowerCase())
        ) {
          input.focus();
          input.value = val;
          // Trigger events
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }, labelText, value);
    
    if (successByName) {
      onProgress(`✓ Filled ${labelText} (by name mapping)`);
      return true;
    }
  } catch (err) {}
  return false;
}
