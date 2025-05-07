import { parentPort } from 'worker_threads';

if (!parentPort) {
  throw new Error('This module must be run as a worker thread!');
}

interface WorkerMessage {
  type: string;
  data: any;
}

// Base message handler
parentPort.on('message', async (message: WorkerMessage) => {
  try {
    // Process data - to be implemented by specific workers
    const result = await processData(message.data);
    parentPort!.postMessage(result);
  } catch (error: any) {
    parentPort!.postMessage({ error: error.message });
  }
});

// This function should be overridden by specific worker implementations
async function processData(data: any): Promise<any> {
  throw new Error('processData must be implemented by the worker!');
}

export { processData };