import { parentPort } from 'worker_threads';

if (!parentPort) {
  throw new Error('This module must be run as a worker thread!');
}

// Base message handler
parentPort.on('message', async (data: any) => {
  try {
    // Process data - to be implemented by specific workers
    const result = await processData(data);
    parentPort!.postMessage(result);
  } catch (error) {
    parentPort!.postMessage({ error: error.message });
  }
});

// This function should be overridden by specific worker implementations
async function processData(data: any): Promise<any> {
  throw new Error('processData must be implemented by the worker!');
}

export { processData };