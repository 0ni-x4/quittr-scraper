interface Message {
    id: string;
    from: string;
    to: string;
    content: string;
    timestamp: Date;
    status: 'sent' | 'delivered' | 'seen' | 'failed';
}
interface ChatThread {
    targetUsername: string;
    messages: Message[];
    lastUpdated: Date;
    status: 'active' | 'pending' | 'completed';
}
export declare class MessageManager {
    private messagesFile;
    private threads;
    constructor();
    private loadMessages;
    private saveMessages;
    hasMessagedUser(username: string): boolean;
    addMessage(message: Omit<Message, 'id' | 'timestamp' | 'status'>): void;
    updateMessageStatus(username: string, messageId: string, status: Message['status']): void;
    getThread(username: string): ChatThread | undefined;
    getAllThreads(): ChatThread[];
    getActiveThreads(): ChatThread[];
    updateThreadStatus(username: string, status: ChatThread['status']): void;
}
export {};
