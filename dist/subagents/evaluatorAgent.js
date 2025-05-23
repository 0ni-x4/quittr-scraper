"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluatorAgent = void 0;
const baseAgent_1 = require("./baseAgent");
const openai_1 = __importDefault(require("openai"));
const settingsStore_1 = require("../stores/settingsStore");
class EvaluatorAgent extends baseAgent_1.BaseAgent {
    constructor(config) {
        super(config);
        this.evaluationQueue = [];
        const settings = settingsStore_1.useSettingsStore.getState().settings;
        this.openai = new openai_1.default({
            apiKey: settings.openaiKey
        });
    }
    async getItems() {
        // In a real implementation, this would get data from the scraper results
        return this.evaluationQueue;
    }
    async evaluateWithAI(target) {
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
    async processItem(target) {
        try {
            console.log(`Evaluating content from ${target.url} on ${target.platform}`);
            const evaluation = await this.evaluateWithAI(target);
            if (evaluation.score >= 70) {
                console.log(`Account approved: ${target.url}`);
            }
            else {
                console.log(`Account not approved: ${target.url}`);
            }
            return evaluation;
        }
        catch (error) {
            console.error(`Error evaluating profile: ${error}`);
            throw error;
        }
    }
    addToQueue(target) {
        this.evaluationQueue.push(target);
    }
    async execute() {
        return await super.execute();
    }
}
exports.EvaluatorAgent = EvaluatorAgent;
//# sourceMappingURL=evaluatorAgent.js.map