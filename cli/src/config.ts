export interface Config {
  readonly midnightNodeUrl: string;
  readonly indexerUrl: string;
  readonly indexerWebsocketUrl: string;
  readonly proofServerUrl: string;
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
  proofServerUrl: 'http://localhost:6300', // Still assuming local proof server for preprod
};
