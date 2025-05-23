import { AgentConfig } from '../types/agent';
import { BaseAgent } from './baseAgent';
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
export declare class EvaluatorAgent extends BaseAgent<EvaluationTarget> {
    private openai;
    private evaluationQueue;
    constructor(config: AgentConfig);
    getItems(): Promise<EvaluationTarget[]>;
    private evaluateWithAI;
    processItem(target: EvaluationTarget): Promise<EvaluationResult>;
    addToQueue(target: EvaluationTarget): void;
    execute(): Promise<import("../types/agent").AgentResult>;
}
export {};
//# sourceMappingURL=evaluatorAgent.d.ts.map