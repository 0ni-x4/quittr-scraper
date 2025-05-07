import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface ProfileData {
  username: string;
  followers: number;
  bio: string;
  captions: string[];
  link: string;
  linkContentsDescription: string;
}

interface EvaluationResult {
  isValid: boolean;
  explanation: string;
  confidenceScore: number;
  suggestedApproach?: string;
}

export async function evaluateProfile(data: ProfileData): Promise<EvaluationResult> {
  const prompt = `
Please evaluate this Instagram profile as a potential influencer for brand collaboration:

Username: ${data.username}
Followers: ${data.followers}
Bio: ${data.bio}
Recent Post Captions: 
${data.captions.map((caption, i) => `${i + 1}. ${caption}`).join('\n')}
${data.linkContentsDescription}

Evaluate the following aspects:
1. Audience Size and Quality
2. Content Relevance and Quality
3. Professional Presence
4. Engagement Potential

Provide your evaluation in JSON format with these fields:
- isValid: boolean (true if good for outreach)
- explanation: string (detailed reasoning)
- confidenceScore: number (0-100)
- suggestedApproach: string (if valid, how to approach them)
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an AI expert in influencer marketing and social media analysis. Evaluate Instagram profiles for potential brand collaboration opportunities."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    if (!response.choices[0]?.message?.content) {
      throw new Error('No response content from OpenAI');
    }

    const result = JSON.parse(response.choices[0].message.content);
    return result as EvaluationResult;
  } catch (error) {
    console.error('GPT-4 evaluation failed:', error);
    return {
      isValid: false,
      explanation: 'Failed to evaluate profile due to API error',
      confidenceScore: 0
    };
  }
} 