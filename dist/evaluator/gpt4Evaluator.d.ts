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
export declare function evaluateProfile(data: ProfileData): Promise<EvaluationResult>;
export {};
