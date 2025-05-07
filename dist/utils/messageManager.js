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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class MessageManager {
    constructor() {
        this.messagesFile = path.join(process.cwd(), 'messages.json');
        this.threads = new Map();
        this.loadMessages();
    }
    loadMessages() {
        try {
            if (fs.existsSync(this.messagesFile)) {
                const data = JSON.parse(fs.readFileSync(this.messagesFile, 'utf-8'));
                Object.entries(data).forEach(([username, thread]) => {
                    this.threads.set(username, {
                        ...thread,
                        lastUpdated: new Date(thread.lastUpdated),
                        messages: thread.messages.map(msg => ({
                            ...msg,
                            timestamp: new Date(msg.timestamp)
                        }))
                    });
                });
            }
        }
        catch (error) {
            console.error('Error loading messages:', error);
        }
    }
    saveMessages() {
        const data = Object.fromEntries(this.threads.entries());
        fs.writeFileSync(this.messagesFile, JSON.stringify(data, null, 2));
    }
    hasMessagedUser(username) {
        return this.threads.has(username);
    }
    addMessage(message) {
        const id = Math.random().toString(36).substring(7);
        const newMessage = {
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
    updateMessageStatus(username, messageId, status) {
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
    getThread(username) {
        return this.threads.get(username);
    }
    getAllThreads() {
        return Array.from(this.threads.values());
    }
    getActiveThreads() {
        return Array.from(this.threads.values())
            .filter(thread => thread.status === 'active')
            .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
    }
    updateThreadStatus(username, status) {
        const thread = this.threads.get(username);
        if (thread) {
            thread.status = status;
            thread.lastUpdated = new Date();
            this.saveMessages();
        }
    }
}
exports.MessageManager = MessageManager;
//# sourceMappingURL=messageManager.js.map