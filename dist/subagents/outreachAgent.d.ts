import { AgentConfig } from '../types/agent';
import { BaseAgent } from './baseAgent';
interface OutreachTarget {
    url: string;
    platform: string;
    score: number;
    insights: string[];
    metadata: Record<string, any>;
}
interface OutreachResult {
    url: string;
    platform: string;
    messageType: 'dm' | 'comment' | 'email';
    message: string;
    status: 'sent' | 'failed' | 'rate_limited';
    timestamp: Date;
    response?: string;
}
export declare class OutreachAgent extends BaseAgent<OutreachTarget> {
    private outreachQueue;
    constructor(config: AgentConfig);
    getItems(): Promise<OutreachTarget[]>;
    private generatePersonalizedMessage;
    processItem(target: OutreachTarget): Promise<OutreachResult>;
    execute(): Promise<import("../types/agent").AgentResult>;
}
export {};
//# sourceMappingURL=outreachAgent.d.ts.map