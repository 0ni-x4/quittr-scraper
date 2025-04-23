import * as fs from 'fs';
import * as path from 'path';

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

export class MessageManager {
  private messagesFile: string;
  private threads: Map<string, ChatThread>;

  constructor() {
    this.messagesFile = path.join(process.cwd(), 'messages.json');
    this.threads = new Map();
    this.loadMessages();
  }

  private loadMessages() {
    try {
      if (fs.existsSync(this.messagesFile)) {
        const data = JSON.parse(fs.readFileSync(this.messagesFile, 'utf-8'));
        Object.entries(data).forEach(([username, thread]) => {
          this.threads.set(username, {
            ...(thread as ChatThread),
            lastUpdated: new Date((thread as ChatThread).lastUpdated),
            messages: (thread as ChatThread).messages.map(msg => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          });
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  private saveMessages() {
    const data = Object.fromEntries(this.threads.entries());
    fs.writeFileSync(this.messagesFile, JSON.stringify(data, null, 2));
  }

  hasMessagedUser(username: string): boolean {
    return this.threads.has(username);
  }

  addMessage(message: Omit<Message, 'id' | 'timestamp' | 'status'>) {
    const id = Math.random().toString(36).substring(7);
    const newMessage: Message = {
      ...message,
      id,
      timestamp: new Date(),
      status: 'sent'
    };

    let thread = this.threads.get(message.to);
    if (!thread) {
      thread = {
        targetUsername: message.to,
        messages: [],
        lastUpdated: new Date(),
        status: 'active'
      };
      this.threads.set(message.to, thread);
    }

    thread.messages.push(newMessage);
    thread.lastUpdated = new Date();
    this.saveMessages();
  }

  updateMessageStatus(username: string, messageId: string, status: Message['status']) {
    const thread = this.threads.get(username);
    if (thread) {
      const message = thread.messages.find(m => m.id === messageId);
      if (message) {
        message.status = status;
        thread.lastUpdated = new Date();
        this.saveMessages();
      }
    }
  }

  getThread(username: string): ChatThread | undefined {
    return this.threads.get(username);
  }

  getAllThreads(): ChatThread[] {
    return Array.from(this.threads.values());
  }

  getActiveThreads(): ChatThread[] {
    return Array.from(this.threads.values())
      .filter(thread => thread.status === 'active')
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  }

  updateThreadStatus(username: string, status: ChatThread['status']) {
    const thread = this.threads.get(username);
    if (thread) {
      thread.status = status;
      thread.lastUpdated = new Date();
      this.saveMessages();
    }
  }
} 