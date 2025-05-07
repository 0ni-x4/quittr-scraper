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
const dmAgent_1 = require("../agents/dmAgent");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const config = {
    accounts: [
        {
            username: process.env.INSTAGRAM_USERNAME_1 || '',
            password: process.env.INSTAGRAM_PASSWORD_1 || ''
        },
        {
            username: process.env.INSTAGRAM_USERNAME_2 || '',
            password: process.env.INSTAGRAM_PASSWORD_2 || ''
        }
    ],
    messageTemplate: `Hi {username}! 👋

I noticed your amazing content and {followers} engaged followers. I'd love to discuss potential collaboration opportunities that could benefit both our audiences.

Would you be open to a quick chat about this?

Best regards,
[Your Name]`
};
async function main() {
    // Validate config
    if (!config.accounts.every(acc => acc.username && acc.password)) {
        console.error('Please set all Instagram account credentials in .env file');
        process.exit(1);
    }
    const agent = new dmAgent_1.DMAgent(config);
    try {
        await agent.start();
        // Example: Process a list of usernames
        const targetUsernames = [
            'example_user1',
            'example_user2',
            // Add more usernames here
        ];
        for (const username of targetUsernames) {
            const success = await agent.processProfile(username);
            if (success) {
                console.log(`Successfully processed ${username}`);
            }
            else {
                console.log(`Failed to process ${username}`);
            }
            // Random delay between profiles
            await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 2000));
        }
    }
    catch (error) {
        console.error('Error running DM agent:', error);
    }
    finally {
        await agent.stop();
    }
}
// Run the agent
main()
    .then(() => console.log('DM agent completed'))
    .catch(error => console.error('DM agent failed:', error));
//# sourceMappingURL=runDmAgent.js.map