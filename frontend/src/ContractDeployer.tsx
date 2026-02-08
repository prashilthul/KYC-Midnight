import { useState } from 'react';
import { MidnightDAppAPI } from './midnight-api';

export function ContractDeployer() {
  const [contractAddress, setContractAddress] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState('');

  const deployContract = async () => {
    try {
      setDeploying(true);
      setError('');
      
      // This is a one-time deployment
      // After getting the address, you'll add it to .env.local
      
      const api = new MidnightDAppAPI();
      
      // You'll need to initialize with Lace wallet first
      // Then deploy empty contract (no initial registration)
      
      // For now, just show instructions
      alert('Deploy via Lace:\n1. Connect wallet\n2. Deploy contract\n3. Save address to .env.local');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '2px solid #4CAF50', borderRadius: '8px', margin: '20px' }}>
      <h2>🚀 One-Time Contract Deployment</h2>
      <p>Deploy the KYC contract once to the network.</p>
      
      <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
        <strong>⚠️ Deploy only ONCE!</strong>
        <ol>
          <li>Click deploy below</li>
          <li>Confirm in Lace wallet</li>
          <li>Copy the contract address</li>
          <li>Add to <code>frontend/.env.local</code></li>
        </ol>
      </div>

      <button 
        onClick={deployContract}
        disabled={deploying}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: deploying ? 'not-allowed' : 'pointer'
        }}
      >
        {deploying ? 'Deploying...' : '🚀 Deploy Contract'}
      </button>

      {contractAddress && (
        <div style={{ marginTop: '20px', background: '#d4edda', padding: '15px', borderRadius: '4px' }}>
          <h3>✅ Contract Deployed!</h3>
          <p><strong>Address:</strong></p>
          <code style={{ background: 'white', padding: '10px', display: 'block', wordBreak: 'break-all' }}>
            {contractAddress}
          </code>
          <p style={{ marginTop: '10px' }}>
            Add this to <code>frontend/.env.local</code>:
          </p>
          <code style={{ background: 'white', padding: '10px', display: 'block' }}>
            VITE_CONTRACT_ADDRESS={contractAddress}
          </code>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '20px', background: '#f8d7da', padding: '15px', borderRadius: '4px', color: '#721c24' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
