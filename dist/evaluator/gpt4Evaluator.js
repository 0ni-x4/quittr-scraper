"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateProfile = evaluateProfile;
const openai_1 = __importDefault(require("openai"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY
});
async function evaluateProfile(data) {
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
        return result;
    }
    catch (error) {
        console.error('GPT-4 evaluation failed:', error);
        return {
            isValid: false,
            explanation: 'Failed to evaluate profile due to API error',
            confidenceScore: 0
        };
    }
}
