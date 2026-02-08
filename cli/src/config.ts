import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const currentDir = __dirname;

export interface Config {
  readonly midnightNodeUrl: string;
  readonly indexerUrl: string;
  readonly indexerWebsocketUrl: string;
  readonly proofServerUrl: string;
}

export class UndeployedConfig implements Config {
  readonly midnightNodeUrl: string;
  readonly indexerUrl: string;
  readonly indexerWebsocketUrl: string;
  readonly proofServerUrl: string;

  constructor() {
    this.midnightNodeUrl = process.env.MIDNIGHT_NODE_URL || 'http://localhost:9944';
    this.indexerUrl = process.env.INDEXER_URL || 'http://localhost:8088';
    this.indexerWebsocketUrl = process.env.INDEXER_WS_URL || 'ws://localhost:8088/ws';
    this.proofServerUrl = process.env.PROOF_SERVER_URL || 'http://localhost:6300';
  }
}

export const localConfig: Config = {
  midnightNodeUrl: 'http://localhost:9944',
  indexerUrl: 'http://localhost:8088',
  indexerWebsocketUrl: 'ws://localhost:8088/ws',
  proofServerUrl: 'http://localhost:6300',
};

export const preprodConfig: Config = {
  midnightNodeUrl: 'https://rpc.preprod.midnight.network',
  indexerUrl: 'https://indexer.preprod.midnight.network',
  indexerWebsocketUrl: 'wss://indexer.preprod.midnight.network/ws',
  proofServerUrl: 'http://localhost:6300',
};
