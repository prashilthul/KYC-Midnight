import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Upload, 
  Fingerprint, 
  CheckCircle2, 
  Terminal as TerminalIcon, 
  User, 
  Globe, 
  Eye, 
  EyeOff,
  ChevronRight,
  Database,
  Lock,
  Cpu
} from 'lucide-react';

type Mode = 'user' | 'verifier';
type Step = 'upload' | 'extract' | 'commit' | 'success';

function App() {
  const [mode, setMode] = useState<Mode>('user');
  const [step, setStep] = useState<Step>('upload');
  const [extractedData, setExtractedData] = useState({ name: '', dob: '', idNumber: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'checking' | 'verified' | 'failed'>('idle');

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Simulated Identity Processing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessing(true);
      addLog(`File attached: ${e.target.files[0].name}`);
      addLog('Secure Sandbox: Processing document locally...');
      setTimeout(() => {
        setExtractedData({ name: 'Satoshi Nakamoto', dob: '1975-04-05', idNumber: 'IDX-992-001' });
        addLog('OCR Engine: PII extraction successful.');
        setIsProcessing(false);
        setStep('extract');
      }, 1500);
    }
  };

  const handlePublish = () => {
    setIsProcessing(true);
    addLog('Midnight Wallet: Initializing Zero-Knowledge circuit...');
    addLog('Prover: Generating membership proof for birth year > 18...');
    setTimeout(() => {
      addLog('Success: Confidential Commitment published to Local Stack.');
      setIsProcessing(false);
      setStep('success');
    }, 2000);
  };

  const handleVerify = () => {
    setVerifyStatus('checking');
    addLog('Verifier: Connecting to user identity anchor...');
    addLog('Verifier: Mathematically checking ZK eligibility without PII...');
    setTimeout(() => {
      setVerifyStatus('verified');
      addLog('Verification Success: Identity is valid and satisfies requirements.');
    }, 2500);
  };

  return (
    <div className="relative min-h-screen p-4 md:p-8 flex flex-col items-center">
      {/* Background Decor */}
      <div className="glow-bg top-0 left-1/4 w-[500px] h-[500px]" />
      <div className="glow-bg bottom-0 right-1/4 w-[400px] h-[400px]" style={{ animationDelay: '-4s' }} />

      {/* Header & Mode Toggle */}
      <div className="flex flex-col items-center gap-6 mb-12 w-full max-w-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-xl border border-primary/30">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
            Midnight KYC
          </h1>
        </div>

        <div className="flex p-1 bg-white/5 border border-white/10 rounded-full">
          <button 
            onClick={() => setMode('user')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'user' ? 'bg-primary shadow-lg shadow-primary/20 text-white' : 'text-foreground/60 hover:text-white'}`}
          >
            Owner
          </button>
          <button 
            onClick={() => setMode('verifier')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'verifier' ? 'bg-primary shadow-lg shadow-primary/20 text-white' : 'text-foreground/60 hover:text-white'}`}
          >
            Verifier
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
                  { id: 'commit', icon: Lock },
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
                <div className="flex flex-col items-center text-center gap-6 py-8 animate-in transition-all">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">Verify Your Identity</h2>
                    <p className="text-foreground/60 max-w-md">Your documents are processed locally using your private keys. No PII ever reaches the network.</p>
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
                          <span className="font-medium">Drop Passport Image</span>
                          <span className="text-xs text-foreground/40 mt-1">PNG, JPG up to 10MB</span>
                        </div>
                      </>
                    )}
                  </label>
                </div>
              )}

              {step === 'extract' && (
                <div className="flex flex-col gap-6 py-4 animate-in">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">Audit Extracted Data</h2>
                    <p className="text-foreground/60">Confirm the details before they are mathematically hashed.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-widest text-foreground/40 ml-1">Full Name</label>
                      <input 
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        value={extractedData.name}
                        onChange={(e) => setExtractedData({...extractedData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-widest text-foreground/40 ml-1">Date of Birth</label>
                      <input 
                        type="date"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        value={extractedData.dob}
                        onChange={(e) => setExtractedData({...extractedData, dob: e.target.value})}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => setStep('commit')}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold p-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    Confirm & Sign <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {step === 'commit' && (
                <div className="flex flex-col items-center text-center gap-8 py-8 animate-in">
                  <div className="p-6 bg-primary/10 rounded-3xl border border-primary/20">
                    <Lock className="w-12 h-12 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">Zero-Knowledge Binding</h2>
                    <p className="text-foreground/60 max-w-md">We are currently calculating your identity's hash using your local private key. This key never leaves your persistent local storage.</p>
                  </div>

                  <div className="w-full max-w-sm bg-black/40 border border-white/5 p-6 rounded-2xl font-mono text-primary text-sm break-all leading-relaxed">
                    0x7a2...f8e9a4c1...00d2
                  </div>

                  <button 
                    onClick={handlePublish}
                    disabled={isProcessing}
                    className="w-full max-w-md bg-primary hover:bg-primary/90 text-white font-semibold p-4 rounded-xl shadow-xl shadow-primary/20 disabled:opacity-50 transition-all"
                  >
                    {isProcessing ? 'Generating Proof...' : 'Publish Commitment'}
                  </button>
                </div>
              )}

              {step === 'success' && (
                <div className="flex flex-col items-center text-center gap-8 py-12 animate-in">
                  <div className="w-24 h-24 bg-green-500/20 border-4 border-green-500/40 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold">Identity Bound</h2>
                    <p className="text-foreground/60 max-w-sm">Your Proof of Identity is now secured on the local Midnight stack. Services can now verify you anonymously.</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setStep('upload')} className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all">New Identity</button>
                    <button onClick={() => setMode('verifier')} className="px-8 py-3 bg-primary text-white rounded-xl font-medium shadow-lg shadow-primary/20">Go to Verifier</button>
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
                    <Globe className="w-10 h-10 text-accent" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold">Third-Party Verifier</h2>
                    <p className="text-foreground/60">Cross-check users without touching their private data.</p>
                  </div>
                </div>

                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-foreground/40">Expected Requirement:</span>
                    <span className="text-accent py-1 px-3 bg-accent/10 border border-accent/20 rounded-full">Age &gt; 18</span>
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="text-xs font-bold text-foreground/30 uppercase tracking-widest">Shared Proof Hash</label>
                    <div className="bg-black/40 border border-white/10 p-4 rounded-xl font-mono text-sm opacity-60">
                      0x7a2d48bf...e9a4c12d
                    </div>
                  </div>

                  <button 
                    onClick={handleVerify}
                    className="w-full bg-accent hover:bg-accent/90 text-white font-bold p-5 rounded-2xl shadow-xl shadow-accent/20 transition-all overflow-hidden relative group"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {verifyStatus === 'checking' ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Consulting Ledger...
                        </>
                      ) : 'Run ZK Verification'}
                    </span>
                  </button>

                  {verifyStatus === 'verified' && (
                    <div className="flex items-center justify-center gap-3 p-5 bg-green-500/10 border border-green-500/30 rounded-2xl animate-in text-green-500 font-bold tracking-tight">
                      <ShieldCheck className="w-6 h-6" />
                      IDENTITY VERIFIED: ACCESS GRANTED
                    </div>
                  )}
                </div>

                <div className="p-6 bg-white/2 border-l-4 border-accent/20 rounded-r-2xl">
                  <p className="text-sm text-foreground/60 italic leading-relaxed">
                    "This verifier never saw the user's name or birthdate. The validation was performed mathematically against the user's on-chain fingerprint."
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
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/40">Local Midnight Stack</h3>
            <div className="space-y-3">
              {[
                { label: 'Midnight Node', status: 'Online', color: 'bg-green-500' },
                { label: 'Indexer', status: 'Online', color: 'bg-green-500' },
                { label: 'Prover (Local)', status: 'Active', color: 'bg-green-500' },
                { label: 'Private State', status: 'Isolated', color: 'bg-primary' },
              ].map(stack => (
                <div key={stack.label} className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60 font-medium">{stack.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stack.color}`} />
                    <span className="text-xs uppercase font-bold text-foreground/80">{stack.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Console */}
          <div className="terminal-glass flex-1 flex flex-col h-[400px]">
            <div className="terminal-header">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-3 h-3" />
                <span>Midnight SDK Console</span>
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/40" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/40" />
                <div className="w-2 h-2 rounded-full bg-green-500/40" />
              </div>
            </div>
            <div className="log-area space-y-2 text-[11px] leading-relaxed">
              {logs.length === 0 ? (
                <div className="text-foreground/20 italic p-4">Waiting for Midnight operations to log...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-foreground/20 whitespace-nowrap">[{i.toString().padStart(2, '0')}]</span>
                    <span className="text-foreground/80 break-words">{log}</span>
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
          animation: slideUpFade 0.4s ease-out;
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default App;
