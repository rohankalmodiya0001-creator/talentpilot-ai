import { GoogleGenerativeAI } from '@google/generative-ai';
import { addLog } from './db.js';

export interface MatchResult {
  matchScore: number;
  strengths: string[];
  gaps: string[];
  matchExplanation: string;
  resumeTips: string;
}

// Helper to get Gemini Model
function getModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

// 1. Evaluate Resume Match against Job details
export async function evaluateJobMatch(
  resumeText: string,
  company: string,
  role: string,
  location: string,
  apiKey?: string
): Promise<MatchResult> {
  if (!apiKey || apiKey.trim() === '') {
    // Demo Mode simulation
    return getDemoMatchResult(resumeText, company, role, location);
  }

  try {
    const model = getModel(apiKey);
    const prompt = `
You are an AI recruiter analyzing a candidate's resume for an internship role.
Role Details:
- Company: ${company}
- Role Title: ${role}
- Location: ${location}

Candidate Resume Text:
"""
${resumeText}
"""

Analyze how well this candidate matches the role. Output a JSON object matching this TypeScript structure:
{
  "matchScore": number (0 to 100, representing match percentage),
  "strengths": string[] (list of 3-4 specific strengths matching this role),
  "gaps": string[] (list of 2-3 specific skills/technologies/experiences missing or weak),
  "matchExplanation": string (a concise 3-4 sentence summary of fit),
  "resumeTips": string (specific formatting/bullet point adjustments to make for this exact role)
}
Return ONLY the raw JSON string. Do not wrap it in markdown code blocks like \`\`\`json.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Attempt to extract JSON from response (clean markdown backticks if any)
    const jsonStr = responseText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(jsonStr) as MatchResult;
    
    return {
      matchScore: parsed.matchScore || 50,
      strengths: parsed.strengths || [],
      gaps: parsed.gaps || [],
      matchExplanation: parsed.matchExplanation || 'Completed matching analysis.',
      resumeTips: parsed.resumeTips || 'Keep resume clean and highlights relevant skills.'
    };
  } catch (err: any) {
    addLog(`Gemini match analysis failed: ${err.message}. Running in fallback mode.`, 'warn');
    return getDemoMatchResult(resumeText, company, role, location);
  }
}

// 2. Generate Cover Letter
export async function generateCoverLetter(
  resumeText: string,
  company: string,
  role: string,
  apiKey?: string
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    return getDemoCoverLetter(company, role);
  }

  try {
    const model = getModel(apiKey);
    const prompt = `
Write a professional, compelling, and tailored cover letter (around 250-300 words) for:
Company: ${company}
Role: ${role}

Based on the candidate's resume:
"""
${resumeText}
"""

Format it cleanly as standard text. Use placeholders like [Your Name], [Date] if the details aren't in the resume. Write it in an engaging, enthusiastic, and confident tone.
`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err: any) {
    addLog(`Gemini Cover Letter generation failed: ${err.message}`, 'warn');
    return getDemoCoverLetter(company, role);
  }
}

// 3. Generate Cold Recruiter Outreach Email
export async function generateColdEmail(
  resumeText: string,
  company: string,
  role: string,
  apiKey?: string
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    return getDemoColdEmail(company, role);
  }

  try {
    const model = getModel(apiKey);
    const prompt = `
Draft a cold outreach message (suitable for LinkedIn or short email, under 150 words) to a recruiter at ${company} regarding the ${role} position.
Use details from this resume to make it highly relevant:
"""
${resumeText}
"""
The email should be respectful, highlight 1 key achievement from the resume that matches the role, and ask for a quick 10-minute call.
`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err: any) {
    addLog(`Gemini Recruiter Cold Email generation failed: ${err.message}`, 'warn');
    return getDemoColdEmail(company, role);
  }
}

// 4. Custom Application Q&A Solver
export async function generateAnswerForPrompt(
  resumeText: string,
  company: string,
  role: string,
  applicationPrompt: string,
  apiKey?: string
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    return `[Demo Mode] Answer to: "${applicationPrompt}"\n\nI am extremely excited about the ${role} position at ${company}. Given my background in software development and experience with building scalable full-stack applications, I am confident I can contribute to your team. At my previous projects, I demonstrated high adaptability and a passion for coding, which align perfectly with the innovative culture at ${company}.`;
  }

  try {
    const model = getModel(apiKey);
    const prompt = `
The candidate is applying for ${role} at ${company}.
The job application form has the following short-answer prompt:
"${applicationPrompt}"

Using the candidate's resume:
"""
${resumeText}
"""

Draft a natural, convincing, and authentic response (100-200 words) answering this prompt from the candidate's perspective. Avoid overly robotic vocabulary.
`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err: any) {
    addLog(`Gemini Application Prompt solver failed: ${err.message}`, 'warn');
    return `Failed to generate response. Please try again.`;
  }
}

// --- Demo Mode Generators ---

function getDemoMatchResult(resumeText: string, company: string, role: string, location: string): MatchResult {
  // Simple heuristic based on resume search terms to make the demo feel responsive
  const resumeLower = resumeText.toLowerCase();
  let score = 65; // Base demo score
  
  const matches = ['react', 'node', 'python', 'javascript', 'typescript', 'sql', 'git', 'c++', 'java', 'aws', 'docker', 'machine learning', 'ai'];
  let matchCount = 0;
  
  matches.forEach(skill => {
    if (resumeLower.includes(skill)) {
      matchCount++;
    }
  });

  score += Math.min(matchCount * 3, 25); // cap at +25
  
  // Custom adjustments based on role name
  const roleLower = role.toLowerCase();
  if (roleLower.includes('frontend') && resumeLower.includes('react')) score += 5;
  if (roleLower.includes('backend') && (resumeLower.includes('node') || resumeLower.includes('python'))) score += 5;
  if (roleLower.includes('ai') || roleLower.includes('machine') || roleLower.includes('ml')) {
    if (resumeLower.includes('python') || resumeLower.includes('tensor') || resumeLower.includes('pytorch')) {
      score += 8;
    } else {
      score -= 10; // penalty for AI role without python/ML keywords
    }
  }

  score = Math.min(Math.max(score, 45), 98); // Bound score between 45 and 98 for realism

  const strengths = [
    `Demonstrated familiarity with programming concepts related to ${role}.`,
    `Project experience matches tech stack requirements for ${company}.`,
    `Active github profile and personal project history.`
  ];

  const gaps = [
    `Specific production-level experience in ${company}'s core business vertical.`,
    `Advanced systems architecture or deployment pipelines.`
  ];

  if (score < 70) {
    gaps.push(`Familiarity with containerization or Cloud infra (AWS/GCP).`);
  }

  const matchExplanation = `This candidate has a solid foundations match of ${score}% for the ${role} at ${company}. Their resume demonstrates hands-on programming experience and relevant academic or personal projects. While they possess good core skills, highlighting more direct experience with the target tech stack would make them a stronger applicant.`;

  const resumeTips = `1. Emphasize projects utilizing technologies mentioned in the ${role} job description.
2. In your skills section, move core languages to the top to grab the recruiter's eye.
3. Quantify impact (e.g., "improved load times by 20%" or "managed 500+ active users") in your project descriptions.`;

  return {
    matchScore: score,
    strengths,
    gaps,
    matchExplanation,
    resumeTips
  };
}

function getDemoCoverLetter(company: string, role: string): string {
  return `Dear Hiring Team at ${company},

I am writing to express my enthusiastic interest in the ${role} position. As a developer passionate about building clean, efficient, and user-centric software, I have long admired ${company}'s commitment to innovation and technical excellence.

Through my academic coursework and personal projects, I have developed strong skills in software development, particularly with web technologies and database management. I enjoy solving complex problems and collaborating with team members to bring designs to life. For instance, in one of my recent full-stack web projects, I implemented responsive designs, secure authentication, and optimized API routing, which refined my coding discipline and database design.

I am eager to bring my drive, technical skills, and fast-learning attitude to ${company}. This internship presents a remarkable opportunity to learn from industry leaders while making a tangible impact on your products.

Thank you for your time and consideration. I look forward to the possibility of discussing how my skills and background align with the needs of your engineering team.

Sincerely,
[Your Name]`;
}

function getDemoColdEmail(company: string, role: string): string {
  return `Subject: Passionate Developer - ${role} at ${company}

Hi [Recruiter Name],

I hope you're having a great week!

I recently came across the ${role} internship opportunity at ${company} and was instantly motivated to reach out. I'm a software developer with hands-on experience building projects using modern web frameworks. 

I've been following ${company}'s work in the industry, and I'd love to bring my technical skills and quick-learning ability to your engineering team.

Could we connect for a brief, 10-minute chat next week to discuss how my background aligns with this role? I have attached my resume for your convenience.

Thank you for your time,
[Your Name]
[LinkedIn Profile]`;
}
