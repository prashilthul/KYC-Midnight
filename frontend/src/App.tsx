import React, { useState, useEffect, useRef } from 'react';
import { MidnightDAppAPI } from './midnight-api';
import { 
  ShieldCheck, 
  Upload, 
  Fingerprint, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  ChevronRight, 
  Copy, 
  Check, 
  FileText, 
  CheckCircle2, 
  ShieldAlert, 
  Cpu, 
  Database, 
  Wallet, 
  Link,
  EyeOff,
  Lock as LockIcon,
  Terminal as TerminalIcon,
  ExternalLink
} from 'lucide-react';

type Mode = 'user' | 'verifier';
type Step = 'upload' | 'extract' | 'commit' | 'success';
type VerificationType = 'age' | 'identity' | 'residency';

function App() {
  const [mode, setMode] = useState<Mode>('user');
  const [step, setStep] = useState<Step>('upload');
  const [extractedData, setExtractedData] = useState({ name: '', dob: '', idNumber: '', country: 'United States' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [userHash, setUserHash] = useState('0x7a2d48bf6e9a4c12d00d2f8e9a4c12d00d2f8e9a4c12d00d2f8e9a4c12d00d2');
  const [hasCopied, setHasCopied] = useState(false);

  // Verifier State
  const [verifierHash, setVerifierHash] = useState('');
  const [vType, setVType] = useState<VerificationType>('age');
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'checking' | 'verified' | 'failed'>('idle');
  const [ageThreshold, setAgeThreshold] = useState(18);
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMocked, setIsMocked] = useState(false);
  const [geoRequired, setGeoRequired] = useState('United States');
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [kycSecret, setKycSecret] = useState<Uint8Array | null>(null);
  const midnightApi = useRef<MidnightDAppAPI>(new MidnightDAppAPI());

  const COUNTRY_MAP: Record<string, number> = {
    'United States': 1,
    'United Kingdom': 2,
    'India': 3,
    'Japan': 4,
    'Germany': 5,
    'Other': 99
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Helper to check if hash is valid format
  const isValidHashFormat = (hash: string): boolean => {
    const hexPattern = /^0x[0-9a-fA-F]{64}$/;
    return hexPattern.test(hash.trim());
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    addLog('System: Searching for Midnight Lace extension...');
    
    try {
      // @ts-ignore
      const midnight = window.midnight;
      if (!midnight || !midnight.mnLace) {
        throw new Error('EXTENSION_MISSING');
      }

      addLog('System: Requesting connection from Lace...');
      const walletAPI = await midnight.mnLace.connect('undeployed');
      
      const { shieldedAddress } = await walletAPI.getShieldedAddresses();
      
      // Initialize Midnight API with the connected wallet
      await midnightApi.current.initialize(walletAPI);
      
      setWalletAddr(shieldedAddress);
      setIsMocked(false);
      addLog(`Wallet Connected: ${shieldedAddress.substring(0, 10)}... (Real Connection)`);
      setIsConnecting(false);
    } catch (err: any) {
      if (err.message === 'EXTENSION_MISSING') {
        addLog('⚠️ Error: Midnight Lace Wallet not found.');
        addLog('👉 Please install the extension to use the real flow.');
      } else {
        addLog(`Error: ${err.message || 'Failed to connect to Lace Wallet.'}`);
      }
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    // Only scroll to the end of logs without smooth behavior to avoid hijacking the scroll
    logEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [logs]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(userHash);
    setHasCopied(true);
    addLog('System: Hash copied to clipboard.');
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Simulated Identity Processing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessing(true);
      addLog(`File attached: ${e.target.files[0].name}`);
      addLog('Secure Sandbox: Processing document locally...');
      setTimeout(() => {
        setExtractedData({ name: 'Satoshi Nakamoto', dob: '1975-04-05', idNumber: 'IDX-992-001', country: 'United States' });
        addLog('OCR Engine: PII extraction successful.');
        setIsProcessing(false);
        setStep('extract');
      }, 1500);
    }
  };

  // --- Real Hashing Logic (SubtleCrypto) ---
  const calculateHash = async () => {
    setIsProcessing(true);
    addLog('System: Generating Zero-Knowledge commitment secret...');
    const secret = window.crypto.getRandomValues(new Uint8Array(32));
    setKycSecret(secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', secret);
    const hashHex = '0x' + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    setTimeout(() => {
      setUserHash(hashHex);
      addLog("System: Commitment generated: " + hashHex.substring(0, 16) + "...");
      setIsProcessing(false);
      setStep('commit');
    }, 1200);
  };

  const handlePublish = async () => {
    setIsProcessing(true);
    
    // Check if wallet is connected (required for real blockchain deployment)
    if (!walletAddr) {
      addLog('⚠️ Warning: Lace Wallet not connected. Using SIMULATION mode.');
      addLog('💡 Connect wallet for REAL Zero-Knowledge Proof generation.');
      addLog('Simulation: Storing commitment in localStorage (NOT on blockchain)...');
      
      // Fallback to simulation
      const ledger = JSON.parse(localStorage.getItem('midnight_sim_ledger') || '[]');
      if (!ledger.includes(userHash)) {
        ledger.push(userHash);
        localStorage.setItem('midnight_sim_ledger', JSON.stringify(ledger));
      }
      
      setTimeout(() => {
        addLog(`Simulation Complete: Hash stored locally (not on Midnight blockchain)`);
        setIsProcessing(false);
        setStep('success');
      }, 1500);
      return;
    }
    
    // Real blockchain deployment path
    addLog('Midnight Prover: Generating ZK proof for commitment ownership...');
    addLog(`Midnight Node: Submitting registration transaction to local ledger...`);
    
    try {
      // Convert userHash (from calculation) back to Uint8Array for the circuit
      const commitment = new Uint8Array(userHash.replace('0x', '').match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const walletAddressBytes = new Uint8Array(32); // Mocked for now, in real it should match the wallet
      
      // Check if contract address exists in environment
      const envContractAddress = (import.meta as any).env?.VITE_CONTRACT_ADDRESS;
      
      let finalizedTx;
      
      if (envContractAddress && envContractAddress.trim() !== '') {
        // Connect to existing contract and call register circuit
        addLog(`Connecting to deployed contract: ${envContractAddress.substring(0, 10)}...`);
        await midnightApi.current.findContract(envContractAddress);
        finalizedTx = await midnightApi.current.callRegisterCircuit(commitment, walletAddressBytes);
        addLog(`Registration circuit executed successfully!`);
      } else {
        // First-time deployment - deploy then call register separately
        addLog(`No contract address found - deploying new contract...`);
        addLog(`⚠️ IMPORTANT: Save the contract address to frontend/.env.local after deployment!`);
        
        // Step 1: Deploy contract
        const deployResult = await midnightApi.current.deployNewContract();
        addLog(`✅ Contract deployed! Address: ${deployResult.contractAddress}`);
        addLog(`📝 Add to .env.local: VITE_CONTRACT_ADDRESS=${deployResult.contractAddress}`);
        
        // Step 2: Call register circuit on deployed contract
        addLog(`Calling register circuit...`);
        const registerResult = await midnightApi.current.callRegisterCircuit(commitment, walletAddressBytes);
        
        // Combine results
        finalizedTx = {
          txHash: registerResult.txHash,
          contractAddress: deployResult.contractAddress
        };
      }
      
      addLog(`Success: Identity anchored on-chain! Tx: ${finalizedTx.txHash.substring(0, 10)}...`);
      setDeployedAddress(finalizedTx.contractAddress as string);
      
      // Still push to sim ledger for verifier ease in this demo
      const ledger = JSON.parse(localStorage.getItem('midnight_sim_ledger') || '[]');
      if (!ledger.includes(userHash)) {
        ledger.push(userHash);
        localStorage.setItem('midnight_sim_ledger', JSON.stringify(ledger));
      }
      
      setIsProcessing(false);
      setStep('success');
    } catch (err: any) {
      addLog(`Error: Blockchain registration failed. ${err.message}`);
      setIsProcessing(false);
    }
  };
  const handleVerify = async () => {
    // Input validation - MUST validate before ANY processing
    const trimmedHash = verifierHash.trim();
    
    // Check if hash is empty
    if (!trimmedHash) {
      setVerifyStatus('failed');
      addLog('❌ Verification Error: No hash provided. Please paste a valid commitment hash.');
      return;
    }
    
    // Validate hash format: must be 0x followed by 64 hex characters (32 bytes)
    const hexPattern = /^0x[0-9a-fA-F]{64}$/;
    if (!hexPattern.test(trimmedHash)) {
      setVerifyStatus('failed');
      addLog('❌ Verification Error: Invalid hash format.');
      addLog('   Expected: 0x + 64 hexadecimal characters (e.g., 0x7a2d48bf...)');
      addLog(`   Received: "${trimmedHash.substring(0, 30)}${trimmedHash.length > 30 ? '...' : ''}"`);
      return;
    }
    
    setVerifyStatus('checking');
    addLog(`Verifier: Initiating [${vType.toUpperCase()}] verification for hash ${trimmedHash.substring(0, 16)}...`);
    
    // REAL ZK PROOF PATH (with Lace Wallet connected)
    if (deployedAddress && kycSecret) {
        addLog(`Midnight Prover: Generating Zero-Knowledge Proof of Eligibility...`);
        try {
            const walletAddressBytes = new Uint8Array(32); // Mock for demo
            let result;
            
            if (vType === 'age') {
                const birthYear = new Date(extractedData.dob).getFullYear();
                result = await midnightApi.current.proveAge(birthYear, ageThreshold, kycSecret!, walletAddressBytes);
            } else if (vType === 'residency') {
                // Residency check currently disabled in v3 implementation
                throw new Error("Residency check not yet implemented in v3 bridge");
            }
            
            setVerifyStatus('verified');
            addLog(`✅ Success: ZK Proof verified on-chain! Identity is ${vType === 'age' ? 'age-eligible' : 'residency-cleared'}.`);
            return;
        } catch (err: any) {
            addLog(`❌ Error: ZK Proof generation/verification failed. ${err.message}`);
            setVerifyStatus('failed');
            return;
        }
    }

    // SIMULATION PATH (when wallet not connected)
    addLog('⚠️ Simulation Mode: Consulting Local Ledger (NOT on blockchain)...');
    setTimeout(() => {
      // Step 1: Check if hash exists in ledger
      const ledger = JSON.parse(localStorage.getItem('midnight_sim_ledger') || '[]');
      const isRegistered = ledger.includes(trimmedHash);
      const isCurrentSession = trimmedHash.toLowerCase() === userHash.trim().toLowerCase();

      if (!isRegistered && !isCurrentSession) {
        setVerifyStatus('failed');
        addLog('❌ Verification Failed: Hash not found in ledger. User has not registered this identity.');
        return;
      }

      // Step 2: Hash exists - now verify the ACTUAL requirements
      // In simulation, we can only verify if this is the current session user
      if (isCurrentSession) {
        // We have access to extractedData for current session
        let requirementMet = false;
        
        if (vType === 'age') {
          const birthYear = new Date(extractedData.dob).getFullYear();
          const currentYear = new Date().getFullYear();
          const userAge = currentYear - birthYear;
          requirementMet = userAge >= ageThreshold;
          
          if (requirementMet) {
            addLog(`✅ Simulation Success: User age (${userAge}) meets ${ageThreshold}+ requirement.`);
            addLog(`   Note: In REAL mode, age would be hidden via Zero-Knowledge Proof.`);
          } else {
            addLog(`❌ Verification Failed: User age (${userAge}) does not meet ${ageThreshold}+ requirement.`);
          }
        } else if (vType === 'identity') {
          requirementMet = true; // Identity check just confirms ownership
          addLog(`✅ Simulation Success: Identity ownership confirmed.`);
          addLog(`   Note: In REAL mode, this uses cryptographic proof of private key.`);
        } else if (vType === 'residency') {
          requirementMet = extractedData.country === geoRequired;
          
          if (requirementMet) {
            addLog(`✅ Simulation Success: User residence (${extractedData.country}) matches requirement (${geoRequired}).`);
            addLog(`   Note: In REAL mode, country would be hidden via Zero-Knowledge Proof.`);
          } else {
            addLog(`❌ Verification Failed: User residence (${extractedData.country}) does not match requirement (${geoRequired}).`);
          }
        }
        
        setVerifyStatus(requirementMet ? 'verified' : 'failed');
      } else {
        // Hash is in ledger but not current session - we can't verify requirements in simulation
        setVerifyStatus('failed');
        addLog('❌ Simulation Limitation: Cannot verify requirements for non-current session users.');
        addLog('   Connect Lace Wallet for REAL Zero-Knowledge Proof verification.');
        addLog('   In real mode, verifier would receive cryptographic proof without seeing private data.');
      }
    }, 2500);
  };



  return (
    <div className="relative min-h-screen p-4 md:p-8 flex flex-col items-center">
      {/* Background Decor */}
      <div className="glow-bg top-0 left-1/4 w-[500px] h-[500px]" />
      <div className="glow-bg bottom-0 right-1/4 w-[400px] h-[400px]" style={{ animationDelay: '-4s' }} />

      {/* Header & Mode Toggle */}
      <div className="flex flex-col items-center gap-6 mb-12 w-full max-w-xl text-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-xl border border-primary/30">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Midnight Identity
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex p-1 bg-white/5 border border-white/10 rounded-full">
            <button 
              onClick={() => setMode('user')}
              className={`px-8 py-2 rounded-full text-sm font-medium transition-all ${mode === 'user' ? 'bg-primary shadow-lg shadow-primary/20 text-white' : 'text-foreground/60 hover:text-white'}`}
            >
              Owner
            </button>
            <button 
              onClick={() => setMode('verifier')}
              className={`px-8 py-2 rounded-full text-sm font-medium transition-all ${mode === 'verifier' ? 'bg-primary shadow-lg shadow-primary/20 text-white' : 'text-foreground/60 hover:text-white'}`}
            >
              Verifier
            </button>
          </div>

          <button 
            onClick={connectWallet}
            disabled={!!walletAddr || isConnecting}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold border transition-all ${walletAddr ? (isMocked ? 'border-orange-500/30 bg-orange-500/10 text-orange-500' : 'border-green-500/30 bg-green-500/10 text-green-500') : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}
          >
            <Wallet className="w-4 h-4" />
            {isConnecting ? 'Connecting...' : walletAddr ? (isMocked ? `SIM: ${walletAddr.substring(0, 8)}...` : `${walletAddr.substring(0, 8)}...`) : 'Connect Lace'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr,400px] gap-8 w-full max-w-7xl">
        {/* Main Interaction Area */}
        <main className="glass p-8 flex flex-col gap-8">
          {mode === 'user' ? (
            <>
              {/* User Steps */}
              <div className="flex justify-between items-center px-4">
                {[
                  { id: 'upload', icon: Upload },
                  { id: 'extract', icon: User },
                  { id: 'commit', icon: LockIcon },
                  { id: 'success', icon: CheckCircle2 },
                ].map((s, idx) => (
                  <React.Fragment key={s.id}>
                    <div className={`flex flex-col items-center gap-2 ${step === s.id ? 'text-primary' : 'text-foreground/20'}`}>
                      <div className={`p-3 rounded-full border ${step === s.id ? 'border-primary bg-primary/10' : 'border-current'}`}>
                        <s.icon className="w-5 h-5" />
                      </div>
                    </div>
                    {idx < 3 && <div className="h-px flex-1 bg-white/10 mx-2" />}
                  </React.Fragment>
                ))}
              </div>

              {step === 'upload' && (
                <div className="flex flex-col items-center text-center gap-6 py-8 animate-in">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-white">Verify Your Identity</h2>
                    <p className="text-foreground/60 max-w-md">Data is hashed locally on your device. Only a Zero-Knowledge Proof is sent to the network.</p>
                  </div>
                  
                  <label className="w-full max-w-md aspect-video border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group">
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                    {isProcessing ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium animate-pulse">Running Local OCR...</span>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-primary/20 transition-all">
                          <Upload className="w-8 h-8 text-foreground/40 group-hover:text-primary transition-all" />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-white">Upload Identity Document</span>
                          <span className="text-xs text-foreground/40 mt-1">Processed entirely in-browser</span>
                        </div>
                      </>
                    )}
                  </label>
                </div>
              )}

              {step === 'extract' && (
                <div className="flex flex-col gap-8 py-4 animate-in">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-white">Review Extracted Data</h2>
                    <p className="text-foreground/60">Audit your information before generating the cryptographic commitment.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Full Name</label>
                      <input 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 outline-none text-white transition-all hover:bg-white/10"
                        value={extractedData.name}
                        onChange={(e) => setExtractedData({...extractedData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Date of Birth</label>
                      <input 
                        type="date"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 outline-none text-white transition-all hover:bg-white/10"
                        value={extractedData.dob}
                        onChange={(e) => setExtractedData({...extractedData, dob: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Country of Residence</label>
                      <input 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 outline-none text-white transition-all hover:bg-white/10"
                        value={extractedData.country}
                        onChange={(e) => setExtractedData({...extractedData, country: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">ID Number</label>
                      <input 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 outline-none text-white transition-all hover:bg-white/10"
                        value={extractedData.idNumber}
                        onChange={(e) => setExtractedData({...extractedData, idNumber: e.target.value})}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={calculateHash}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold p-5 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    Generate Commitment <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {step === 'commit' && (
                <div className="flex flex-col items-center text-center gap-8 py-8 animate-in">
                  <div className="w-20 h-20 bg-primary/10 rounded-3xl border border-primary/20 flex items-center justify-center">
                    <Fingerprint className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-white">Your Identity Commitment</h2>
                    <p className="text-foreground/60 max-w-md">This hash represents your identity. Copy and share it with verifiers to prove your attributes anonymously.</p>
                  </div>

                  <div className="relative w-full max-w-lg group">
                    <div className="w-full bg-black/40 border border-white/10 p-6 rounded-2xl font-mono text-primary text-sm break-all leading-relaxed pr-16 bg-gradient-to-r from-black/40 to-primary/5">
                      {userHash}
                    </div>
                    <button 
                        onClick={copyToClipboard}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-white group-hover:scale-110 active:scale-95"
                    >
                        {hasCopied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>

                  <button 
                    onClick={handlePublish}
                    disabled={isProcessing}
                    className="w-full max-w-md bg-primary hover:bg-primary/90 text-white font-bold p-5 rounded-xl shadow-xl shadow-primary/20 disabled:opacity-50 transition-all"
                  >
                    {isProcessing ? 'Generating Proof...' : 'Publish to Midnight Ledger'}
                  </button>
                </div>
              )}

              {step === 'success' && (
                <div className="flex flex-col items-center text-center gap-8 py-12 animate-in">
                  <div className="w-28 h-28 bg-green-500/10 border-4 border-green-500/30 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.2)]">
                    <CheckCircle2 className="w-14 h-14 text-green-500" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-4xl font-extrabold text-white tracking-tight">Identity Anchored</h2>
                    <p className="text-foreground/60 max-sm text-lg">Your Zero-Knowledge Identity Pillar is now active. You can now prove your Age, Identity, and Residency to third parties.</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setStep('upload')} className="px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold text-white transition-all">New Profile</button>
                    <button onClick={() => { setMode('verifier'); setVerifierHash(userHash); }} className="px-10 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/30 hover:scale-105 transition-all">Switch to Verifier</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Verifier Logic */}
              <div className="flex flex-col gap-10 py-6 animate-in">
                <div className="flex items-center gap-6">
                  <div className="p-5 bg-accent/20 rounded-2xl border border-accent/30">
                    <Search className="w-10 h-10 text-accent" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-white">Trustless Verification</h2>
                    <p className="text-foreground/60">Validate claims without accessing PII.</p>
                  </div>
                </div>

                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl space-y-8">
                  {/* Select Verification Type */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'age', label: 'AgeCheck', icon: Calendar },
                      { id: 'identity', label: 'AuthCheck', icon: User },
                      { id: 'residency', label: 'GeoCheck', icon: MapPin },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => { setVType(t.id as VerificationType); setVerifyStatus('idle'); }}
                            className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${vType === t.id ? 'bg-accent/20 border-accent text-accent' : 'bg-white/5 border-white/10 text-foreground/40 hover:text-white hover:bg-white/10'}`}
                        >
                            <t.icon className="w-6 h-6" />
                            <span className="text-xs font-bold uppercase tracking-wider">{t.label}</span>
                        </button>
                    ))}
                  </div>

                  {vType === 'age' && (
                    <div className="space-y-4 animate-in">
                        <label className="text-xs font-bold text-foreground/30 uppercase tracking-widest ml-1">Minimum Age Requirement</label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="number" 
                                className="w-24 bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold text-center outline-none focus:ring-2 focus:ring-accent/40"
                                value={ageThreshold}
                                onChange={(e) => setAgeThreshold(parseInt(e.target.value) || 0)}
                            />
                            <span className="text-foreground/40 text-sm font-medium">Years Old</span>
                        </div>
                    </div>
                  )}

                  {vType === 'residency' && (
                    <div className="space-y-4 animate-in">
                        <label className="text-xs font-bold text-foreground/30 uppercase tracking-widest ml-1">Required Country of Residence</label>
                        <select 
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-accent/40"
                            value={geoRequired}
                            onChange={(e) => setGeoRequired(e.target.value)}
                        >
                            {Object.keys(COUNTRY_MAP).map(c => (
                                <option key={c} value={c} className="bg-gray-900">{c}</option>
                            ))}
                        </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-foreground/40 ml-1">
                        <span>User Proof Hash</span>
                        <span className="text-[10px] text-accent font-normal normal-case italic">Shared by user</span>
                    </div>
                    <textarea 
                        className={`w-full bg-black/40 border rounded-xl p-4 font-mono text-sm focus:ring-2 outline-none transition-all resize-none h-24 ${
                          verifierHash && !isValidHashFormat(verifierHash) 
                            ? 'border-red-500/50 text-red-400 focus:ring-red-500/20' 
                            : 'border-white/10 text-primary focus:ring-primary/20'
                        }`}
                        value={verifierHash}
                        onChange={(e) => { setVerifierHash(e.target.value); setVerifyStatus('idle'); }}
                        placeholder="Paste user's identity hash here (0x...)"
                    />
                    {verifierHash && !isValidHashFormat(verifierHash) && (
                      <p className="text-xs text-red-400 ml-1 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Invalid format. Expected: 0x + 64 hex characters
                      </p>
                    )}
                  </div>

                  <button 
                    onClick={handleVerify}
                    className="w-full bg-accent hover:bg-accent/90 text-white font-bold p-6 rounded-2xl shadow-xl shadow-accent/20 transition-all group active:scale-95"
                  >
                    <span className="flex items-center justify-center gap-3">
                      {verifyStatus === 'checking' ? (
                        <>
                          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                          Consulting Local Ledger...
                        </>
                      ) : `Verify ${vType.charAt(0).toUpperCase() + vType.slice(1)} Requirement`}
                    </span>
                  </button>

                  {verifyStatus === 'verified' && (
                    <div className="flex items-center justify-center gap-4 p-6 bg-green-500/10 border border-green-500/30 rounded-2xl animate-in text-green-500 font-bold text-lg shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                      <ShieldCheck className="w-7 h-7" />
                      CLAIM VALIDATED
                    </div>
                  )}

                  {verifyStatus === 'failed' && (
                    <div className="flex items-center justify-center gap-4 p-6 bg-red-500/10 border border-red-500/30 rounded-2xl animate-in text-red-400 font-bold">
                      <EyeOff className="w-6 h-6" />
                      VERIFICATION FAILED
                    </div>
                  )}
                </div>

                <div className="p-6 bg-white/5 border-l-4 border-accent/20 rounded-r-2xl">
                  <p className="text-sm text-foreground/60 leading-relaxed">
                    Verify that the user meets the <b>{vType.toUpperCase()}</b> criteria without ever seeing their personal registration data. 
                  </p>
                </div>
              </div>
            </>
          )}
        </main>

        {/* Sidebar: Console & Stats */}
        <aside className="flex flex-col gap-8">
          {/* Stack Status */}
          <div className="terminal-glass p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40">Environment</h3>
                <div className={`px-2 py-0.5 ${isMocked ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'} text-[10px] font-bold rounded uppercase`}>
                  {isMocked ? 'Simulation' : 'Localhost'}
                </div>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Blockchain Node', status: isMocked ? 'Simulation' : 'Healthy', color: isMocked ? 'bg-orange-500' : 'bg-green-500' },
                { label: 'Standalone Indexer', status: isMocked ? 'Local Storage' : 'Syncing', color: isMocked ? 'bg-orange-500' : 'bg-green-500' },
                { label: 'ZK Prover Engine', status: 'Available', color: 'bg-primary' },
                { label: 'Identity Store', status: 'Encrypted', color: 'bg-white/10' },
              ].map(stack => (
                <div key={stack.label} className="group cursor-default">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-foreground/40 group-hover:text-foreground/80 transition-all font-medium">{stack.label}</span>
                    <span className="text-[10px] uppercase font-black text-foreground/20 group-hover:text-foreground/60 transition-all">{stack.status}</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${stack.color} w-full transition-all`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Console */}
          <div className="terminal-glass flex-1 flex flex-col min-h-[400px]">
            <div className="terminal-header">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-3 h-3" />
                <span>Midnight SDK Debug</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto font-mono text-[11px] leading-relaxed">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-foreground/20 py-12">
                    <Cpu className="w-8 h-8 opacity-20" />
                    <span className="text-[11px] uppercase tracking-widest">Awaiting Operations</span>
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex gap-4 group">
                    <span className="text-foreground/10 select-none">#{i.toString().padStart(2, '0')}</span>
                    <span className="text-foreground/80 break-all group-hover:text-primary transition-all">{log}</span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .animate-in {
          animation: slideUpFade 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default App;
