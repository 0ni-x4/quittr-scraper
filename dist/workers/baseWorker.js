"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processData = processData;
const worker_threads_1 = require("worker_threads");
if (!worker_threads_1.parentPort) {
    throw new Error('This module must be run as a worker thread!');
}
// Base message handler
worker_threads_1.parentPort.on('message', async (message) => {
    try {
        // Process data - to be implemented by specific workers
        const result = await processData(message.data);
        worker_threads_1.parentPort.postMessage(result);
    }
    catch (error) {
        worker_threads_1.parentPort.postMessage({ error: error.message });
    }
});
// This function should be overridden by specific worker implementations
async function processData(data) {
    throw new Error('processData must be implemented by the worker!');
}
//# sourceMappingURL=baseWorker.js.map