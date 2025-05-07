import { AgentConfig } from '../types/agent';
import { BaseAgent } from './baseAgent';
import OpenAI from 'openai';
import { useSettingsStore } from '../stores/settingsStore';

interface EvaluationTarget {
  url: string;
  platform: string;
  content: string;
  metadata: Record<string, any>;
}

interface EvaluationResult {
  url: string;
  platform: string;
  score: number;
  categories: string[];
  insights: string[];
  recommendedAction: 'reach_out' | 'monitor' | 'skip';
  confidence: number;
}

export class EvaluatorAgent extends BaseAgent {
  private openai: OpenAI;
  private evaluationQueue: EvaluationTarget[] = [];

  constructor(config: AgentConfig) {
    super(config);
    const settings = useSettingsStore.getState().settings;
    this.openai = new OpenAI({
      apiKey: settings.openaiKey
    });
  }

  async getItems(): Promise<EvaluationTarget[]> {
    // In a real implementation, this would get data from the scraper results
    return this.evaluationQueue;
  }

  private async evaluateWithAI(target: EvaluationTarget): Promise<EvaluationResult> {
    const prompt = `
      Please evaluate this social media profile as a potential AI/tech influencer:

      Platform: ${target.platform}
      Profile URL: ${target.url}
      Content: ${target.content}
      Followers: ${target.metadata.followers}

      Evaluate based on:
      1. Relevance to AI/tech
      2. Engagement and influence
      3. Content quality
      4. Authenticity
      5. Potential for collaboration

      Provide:
      1. Score (0-100)
      2. Content categories
      3. Key insights
      4. Recommended action (reach_out/monitor/skip)
      5. Confidence level (0-100)

      Format response as JSON.
    `;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI expert at evaluating social media profiles for potential tech influencer collaborations. Provide analysis in JSON format only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');

    return {
      url: target.url,
      platform: target.platform,
      score: response.score,
      categories: response.categories,
      insights: response.insights,
      recommendedAction: response.recommended_action,
      confidence: response.confidence
    };
  }

  async processItem(target: EvaluationTarget): Promise<EvaluationResult> {
    console.log(`Evaluating content from ${target.url} on ${target.platform}`);
    
    try {
      const result = await this.evaluateWithAI(target);
      return result;
    } catch (error) {
      console.error('Error evaluating profile:', error);
      throw error;
    }
  }

  addToQueue(target: EvaluationTarget) {
    this.evaluationQueue.push(target);
  }
}
