import { parentPort } from 'worker_threads';
import { WorkerMessage } from '../types/agent';

if (parentPort) {
  parentPort.on('message', async (_message: WorkerMessage) => {
    try {
      // Worker-specific processing logic goes here
      // We'll implement this in derived worker classes
    } catch (error) {
      parentPort?.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}