import pino from 'pino';
import path from 'path';
import * as fs from 'fs';

export async function createLogger(logPath: string) {
  // Ensure log directory exists
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  return pino(
    {
      level: 'debug',
      transport: {
        targets: [
          {
            target: 'pino-pretty',
            level: 'info',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
          {
            target: 'pino/file',
            level: 'debug',
            options: {
              destination: logPath,
            },
          },
        ],
      },
    }
  );
}
