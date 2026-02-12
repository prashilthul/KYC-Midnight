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
    this.midnightNodeUrl = process.env.MIDNIGHT_NODE_URL || 'http://127.0.0.1:9944';
    this.indexerUrl = process.env.INDEXER_URL || 'http://127.0.0.1:8088/api/v3/graphql';
    this.indexerWebsocketUrl = process.env.INDEXER_WS_URL || 'ws://127.0.0.1:8088/api/v3/graphql/ws';
    this.proofServerUrl = process.env.PROOF_SERVER_URL || 'http://127.0.0.1:6300';
  }
}

export const localConfig: Config = {
  midnightNodeUrl: 'http://127.0.0.1:9944',
  indexerUrl: 'http://127.0.0.1:8088/api/v3/graphql',
  indexerWebsocketUrl: 'ws://127.0.0.1:8088/api/v3/graphql/ws',
  proofServerUrl: 'http://127.0.0.1:6300',
};

export const preprodConfig: Config = {
  midnightNodeUrl: 'https://rpc.preprod.midnight.network',
  indexerUrl: 'https://indexer.preprod.midnight.network',
  indexerWebsocketUrl: 'wss://indexer.preprod.midnight.network/ws',
  proofServerUrl: 'http://localhost:6300',
};
