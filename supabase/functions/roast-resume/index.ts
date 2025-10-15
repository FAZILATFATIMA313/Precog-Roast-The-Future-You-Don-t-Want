import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CAREER_FATES = [
  "Corporate Burnout Victim",
  "Startup Chaos Survivor", 
  "Spreadsheet Overlord",
  "Freelance Loop Prisoner",
  "AI Replacement Candidate"
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeData, fileName } = await req.json();
    
    if (!resumeData) {
      throw new Error('No resume data provided');
    }

    console.log("Processing resume:", fileName);

    // For V1, we'll use AI to extract skills based on filename and simulated analysis
    // In production, you'd parse the PDF properly
    const resumeContext = `Analyzing resume: ${fileName}. This appears to be a professional resume.`;
    
    // Select random career fate
    const fateIndex = Math.floor(Math.random() * CAREER_FATES.length);
    const careerFate = CAREER_FATES[fateIndex];
    const confidence = Math.floor(Math.random() * 30) + 70; // 70-99%

    // Extract skills using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Extract skills using Lovable AI - analyze filename and simulate
    const skillsPrompt = `Based on this resume filename: "${fileName}", generate a realistic list of 8-12 technical skills that would likely appear on this resume. 

Return ONLY a JSON array of skill strings. Include programming languages, frameworks, tools, and technologies commonly found in professional resumes.

Example format: ["Python", "SQL", "Machine Learning", "Docker", "AWS", "React", "Git", "Agile"]

Generate skills for: ${fileName}`;

    const skillsResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: skillsPrompt }
        ],
      }),
    });

    let extractedSkills: string[] = [];
    if (skillsResponse.ok) {
      const skillsData = await skillsResponse.json();
      const skillsText = skillsData.choices[0].message.content;
      try {
        // Try to parse JSON array from response
        const parsed = JSON.parse(skillsText.replace(/```json\n?|\n?```/g, '').trim());
        extractedSkills = Array.isArray(parsed) ? parsed : [];
      } catch {
        // Fallback: extract from text
        extractedSkills = skillsText.match(/["']([^"']+)["']/g)?.map((s: string) => s.replace(/["']/g, '')) || [];
      }
      console.log("Extracted skills:", extractedSkills);
    }

    // Generate roast text
    const roastPrompt = `You are a sarcastic, witty AI fortune teller analyzing someone's career future. Their predicted fate is "${careerFate}". 

Generate a SHORT (2-3 sentences max), brutal but funny roast about their future career. Make it surreal and cyberpunk-themed. Keep it professional but savage.

Example tone: "Your Excel skills will evolve into a symbiotic relationship where you become one with the spreadsheet. By 2027, colleagues will no longer recognize your human form - just a glowing cursor blinking in cell A1."

Now generate a unique roast for: ${careerFate}`;

    const roastResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: roastPrompt }
        ],
        temperature: 0.9,
      }),
    });

    if (!roastResponse.ok) {
      const error = await roastResponse.text();
      console.error('Roast generation error:', error);
      throw new Error('Failed to generate roast');
    }

    const roastData = await roastResponse.json();
    const roastText = roastData.choices[0].message.content;

    // Generate scenario description
    const scenarioPrompt = `Generate a SHORT (1-2 sentences) surreal, dystopian future scenario for someone heading toward: "${careerFate}". Make it absurd, cyberpunk-themed, and slightly unsettling but darkly humorous.`;

    const scenarioResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: scenarioPrompt }
        ],
        temperature: 0.9,
      }),
    });

    if (!scenarioResponse.ok) {
      throw new Error('Failed to generate scenario');
    }

    const scenarioData = await scenarioResponse.json();
    const scenarioText = scenarioData.choices[0].message.content;

    // Generate image prompt
    const imagePromptText = `Cyberpunk dystopian future scene: ${careerFate.toLowerCase()}. Dark neon-lit office environment, glitchy holographic displays, person overwhelmed by technology. Cinematic, moody lighting, purple and cyan color scheme. High quality digital art.`;

    // Generate image using Lovable AI image model
    const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          { role: 'user', content: imagePromptText }
        ],
        modalities: ['image', 'text']
      }),
    });

    let imageUrl = undefined;
    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    } else {
      console.warn('Image generation failed, continuing without image');
    }

    // Return prophecy
    return new Response(
      JSON.stringify({
        title: careerFate,
        confidence: confidence,
        roast: roastText,
        scenario: scenarioText,
        imageUrl: imageUrl,
        skills: extractedSkills.slice(0, 12) // Limit to top 12 skills
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in roast-resume function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
