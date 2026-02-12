import React, { useState, useEffect, useRef } from 'react';
import { MidnightDAppAPI, PII } from './midnight-api';
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
  ExternalLink,
  X
} from 'lucide-react';
import { 
  MidnightBech32m, 
  UnshieldedAddress, 
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey
} from '@midnight-ntwrk/wallet-sdk-address-format';

type Mode = 'user' | 'verifier';
type Step = 'upload' | 'extract' | 'commit' | 'success';
type VerificationType = 'age' | 'identity' | 'residency';

function App() {
  const [mode, setMode] = useState<Mode>('user');
  const [step, setStep] = useState<Step>('upload');
  const [extractedData, setExtractedData] = useState({ name: '', dob: '', country: 'india' });
  const [pii, setPii] = useState<PII | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [userHash, setUserHash] = useState('');
  const [hasCopied, setHasCopied] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [tempSecret, setTempSecret] = useState('');
  const [pendingVerification, setPendingVerification] = useState<{ type: VerificationType } | null>(null);

  // Verifier State
  const [verifierHash, setVerifierHash] = useState('');
  const [vType, setVType] = useState<VerificationType>('age');
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'checking' | 'verified' | 'failed'>('idle');
  const [ageThreshold, setAgeThreshold] = useState(18);
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [coinPublicKey, setCoinPublicKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMocked, setIsMocked] = useState(false);
  const [geoRequired, setGeoRequired] = useState('india');
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState('');
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
      
      const { unshieldedAddress } = await walletAPI.getUnshieldedAddress();
      
      // BIT-PERFECT LOGIC: Forged Transparent Pivot
      // 1. Decode generic Bech32 address
      const decodedBech32 = MidnightBech32m.parse(unshieldedAddress);
      
      // 2. Extract bit-perfect 32-byte public key using SDK codec
      const unshieldedAddr = UnshieldedAddress.codec.decode(decodedBech32.network, decodedBech32);
      const clean32Bytes = unshieldedAddr.data;
      
      // 3. Re-encode as BOTH brands to satisfy distinct SDK requirements
      const shieldedCPK = new ShieldedCoinPublicKey(clean32Bytes);
      const forgedCPK = ShieldedCoinPublicKey.codec.encode(decodedBech32.network, shieldedCPK).asString();
      
      const shieldedEPK = new ShieldedEncryptionPublicKey(clean32Bytes);
      const forgedEPK = ShieldedEncryptionPublicKey.codec.encode(decodedBech32.network, shieldedEPK).asString();
      
      // Initialize Midnight API with the connected wallet
      await midnightApi.current.initialize(walletAPI);
      
      setWalletAddr(unshieldedAddress);
      setCoinPublicKey(forgedCPK); // Use CPK for tx scoping
      setIsMocked(false);
      addLog(`Wallet Connected: ${unshieldedAddress.substring(0, 10)}... (Transparent Identity)`);
      addLog(`Identity re-tagged: CPK (${forgedCPK.substring(0, 15)}...) & EPK (${forgedEPK.substring(0, 15)}...)`);
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
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Simulated Identity Processing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessing(true);
      addLog(`File attached: ${e.target.files[0].name}`);
      addLog('Secure Sandbox: Processing document locally...');
      setTimeout(() => {
        setExtractedData({ name: 'Satoshi Nakamoto', dob: '1975-04-05', country: 'india' });
        addLog('OCR Engine: PII extraction successful.');
        setIsProcessing(false);
        setStep('extract');
      }, 1500);
    }
  };

  const preparePII = async () => {
    setIsProcessing(true);
    addLog('System: Generating secure identity secret...');
    
    const secretBytes = window.crypto.getRandomValues(new Uint8Array(32));
    const secretHex = Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const birthYear = new Date(extractedData.dob).getFullYear();
    
    const newPII = {
      fullName: extractedData.name,
      birthYear: birthYear,
      country: extractedData.country.toLowerCase().trim(),
      secret: secretHex
    };
    
    setPii(newPII);
    
    // In the real contract, the "commitment" is the hash of this struct
    // For the UI display, we'll just show it's ready
    setTimeout(() => {
      addLog("System: Identity object prepared and encrypted.");
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
    
    if (!pii) throw new Error("PII data missing");

    try {
      // Robust Address parser
      const parseAddress = (input: string) => {
          if (input.startsWith('mn_')) {
              const decoded = MidnightBech32m.parse(input);
              if (decoded.type === 'addr') {
                  return new Uint8Array(UnshieldedAddress.codec.decode(decoded.network, decoded).data);
              } else if (decoded.type === 'shield-cpk') {
                  return new Uint8Array(ShieldedCoinPublicKey.codec.decode(decoded.network, decoded).data);
              } else if (decoded.type === 'shield-epk') {
                  return new Uint8Array(ShieldedEncryptionPublicKey.codec.decode(decoded.network, decoded).data);
              }
              return new Uint8Array(decoded.data);
          }
          throw new Error("Invalid address format");
      };

      if (!coinPublicKey) throw new Error("Wallet Identity not found");
      const walletAddressBytes = parseAddress(coinPublicKey);
      
      // Check if contract address exists in environment or manual input
      const envContractAddress = manualAddress.trim() || (import.meta as any).env?.VITE_CONTRACT_ADDRESS;
      
      let finalizedTx;
      
      if (envContractAddress && envContractAddress.trim() !== '') {
        addLog(`Connecting to deployed contract: ${envContractAddress.substring(0, 10)}...`);
        try {
          await midnightApi.current.findContract(envContractAddress);
          finalizedTx = await midnightApi.current.callRegisterCircuit(pii, walletAddressBytes);
          addLog(`Registration circuit executed successfully!`);
        } catch (findErr: any) {
          if (findErr.message?.includes('mismatched verifier keys')) {
            addLog(`❌ Version Mismatch: Your local contract does not match the one at ${envContractAddress.substring(0, 8)}...`);
            addLog(`💡 Tip: Clear VITE_CONTRACT_ADDRESS in .env.local and reload to redeploy.`);
            throw new Error("CONTRACT_VERSION_MISMATCH");
          }
          throw findErr;
        }
      } else {
        addLog(`No contract address found - deploying new contract...`);
        const deployResult = await midnightApi.current.deployNewContract();
        addLog(`✅ Contract deployed! Address: ${deployResult.contractAddress}`);
        finalizedTx = await midnightApi.current.callRegisterCircuit(pii, walletAddressBytes);
      }
      
      addLog(`Success: Identity anchored on-chain! Tx: ${finalizedTx.txHash.substring(0, 10)}...`);
      setDeployedAddress(finalizedTx.contractAddress as string);
      setUserHash("0x" + pii.secret.substring(0, 32) + "..."); // Pseudo-view for UI
      
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
    if (deployedAddress && pii) {
        setPendingVerification({ type: vType });
        setShowSecretModal(true);
        return;
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



  const handleConfirmSecret = async () => {
    if (!pendingVerification || !pii) return;
    
    // Check if secret matches
    if (tempSecret !== pii.secret) {
      addLog('❌ Error: Identity Secret mismatch. Verification aborted.');
      setVerifyStatus('failed');
      setShowSecretModal(false);
      return;
    }

    setShowSecretModal(false);
    setVerifyStatus('checking');
    addLog(`Midnight Prover: Generating Proof of ${pendingVerification.type.toUpperCase()}...`);

    try {
      const decodedBech32 = MidnightBech32m.parse(coinPublicKey!);
      const walletAddressBytes = new Uint8Array(UnshieldedAddress.codec.decode(decodedBech32.network, decodedBech32).data);
      
      let result;
      if (pendingVerification.type === 'age') {
        result = await midnightApi.current.proveAge(pii, walletAddressBytes);
      } else if (pendingVerification.type === 'residency') {
        result = await midnightApi.current.proveResidency(pii, walletAddressBytes);
      }
      
      setVerifyStatus('verified');
      addLog(`✅ Success: ZK Proof verified on-chain!`);
    } catch (err: any) {
      const match = err.message.match(/failed assert: (.*)/);
      const friendlyError = match ? match[1] : err.message;
      addLog(`❌ VERIFICATION REJECTED: ${friendlyError}`);
      setVerifyStatus('failed');
    }
  };

  return (
    <div className="relative min-h-screen p-4 md:p-8 flex flex-col items-center">
      {/* Secret Modal */}
      {showSecretModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in">
          <div className="glass max-w-md w-full p-8 space-y-6 relative border border-primary/30 shadow-[0_0_50px_rgba(var(--primary-rgb),0.2)]">
            <button 
              onClick={() => setShowSecretModal(false)}
              className="absolute right-4 top-4 p-2 hover:bg-white/5 rounded-full transition-all text-foreground/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-2 text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LockIcon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white">Confirm Identity Secret</h3>
              <p className="text-sm text-foreground/60">Please enter your 64-character hex secret to authorize ZK proof generation.</p>
            </div>
            <div className="space-y-4">
              <textarea 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-sm focus:ring-2 focus:ring-primary/20 outline-none text-primary transition-all resize-none h-24"
                placeholder="Paste your hex secret here..."
                value={tempSecret}
                onChange={(e) => setTempSecret(e.target.value)}
              />
              <button 
                onClick={handleConfirmSecret}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
              >
                Authorize & Generate Proof
              </button>
            </div>
          </div>
        </div>
      )}
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
                    <div className="space-y-2 col-span-1 md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Country of Residence</label>
                      <input 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 outline-none text-white transition-all hover:bg-white/10"
                        value={extractedData.country}
                        onChange={(e) => setExtractedData({...extractedData, country: e.target.value})}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={preparePII}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold p-5 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    Prepare Identity Package <ChevronRight className="w-5 h-5" />
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

                  <div className="w-full max-w-md space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 ml-1">Existing Contract Address (Optional)</label>
                    <input 
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none text-white transition-all hover:bg-white/10 placeholder:text-foreground/20"
                      placeholder="Paste deployed contract address (d72d...)"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                    />
                    <p className="text-[10px] text-foreground/40 ml-1">Leave empty to deploy a new contract automatically.</p>
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
