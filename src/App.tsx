import { useState, useEffect, useCallback } from 'react';

// ==========================================
// 1. TYPES & CONSTANTS
// ==========================================
type EncodingType = 'hex' | 'base64' | 'chars' | 'alphanumeric' | 'uuid';
type TabId = 'generate' | 'decode' | 'hash' | 'hmac' | 'base64' | 'url' | 'json';

interface Preset {
  id: string;
  name: string;
  desc: string;
  config: { length: number; type: EncodingType; prefix?: string };
}

const PRESETS: Preset[] = [
  { id: 'jwt256', name: 'JWT Secret (HS256)', desc: '64-char Hex (256-bit)', config: { length: 64, type: 'hex' } },
  { id: 'jwt512', name: 'JWT Secret (HS512)', desc: '88-char Base64 (512-bit)', config: { length: 64, type: 'base64' } },
  { id: 'api_live', name: 'API Key (Live)', desc: 'Prefixed sk_live_', config: { length: 32, type: 'alphanumeric', prefix: 'sk_live_' } },
  { id: 'api_test', name: 'API Key (Test)', desc: 'Prefixed sk_test_', config: { length: 32, type: 'alphanumeric', prefix: 'sk_test_' } },
  { id: 'nextauth', name: 'Framework Secret', desc: 'High entropy symbols', config: { length: 48, type: 'chars' } },
  { id: 'uuid', name: 'UUID v4', desc: 'Standard RFC 4122', config: { length: 36, type: 'uuid' } },
];

const TAB_TITLES: Record<TabId, string> = {
  generate: 'Secret Generator',
  decode: 'JWT Decoder',
  hash: 'Hash Calculator',
  hmac: 'HMAC Generator',
  base64: 'Base64 Tool',
  url: 'URL Encoder',
  json: 'JSON Formatter'
};

// ==========================================
// 2. CRYPTOGRAPHY & UTILITIES
// ==========================================
const generateSecureString = (length: number, type: EncodingType, prefix: string = ''): string => {
  if (type === 'uuid') return window.crypto.randomUUID();
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  
  let result = '';
  if (type === 'hex') {
    result = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
  } else if (type === 'base64') {
    result = btoa(String.fromCharCode.apply(null, array as unknown as number[])).replace(/=/g, '').slice(0, length);
  } else if (type === 'alphanumeric') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) result += chars[array[i] % chars.length];
  } else if (type === 'chars') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
    for (let i = 0; i < length; i++) result += chars[array[i] % chars.length];
  }
  return prefix + result;
};

const base64UrlDecode = (str: string) => {
  let output = str.replace(/-/g, '+').replace(/_/g, '/');
  switch (output.length % 4) { case 0: break; case 2: output += '=='; break; case 3: output += '='; break; default: throw new Error('Illegal base64url string!'); }
  return decodeURIComponent(window.atob(output).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
};

const calculateSHA = async (message: string, algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512') => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest(algorithm, msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const calculateHMAC = async (message: string, secret: string, algorithm: 'SHA-256' | 'SHA-512') => {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: algorithm }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const safeBase64Encode = (text: string) => btoa(String.fromCodePoint(...new TextEncoder().encode(text)));
const safeBase64Decode = (base64: string) => new TextDecoder().decode(Uint8Array.from(atob(base64), m => m.codePointAt(0)!));

// ==========================================
// 3. MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('generate');
  const [toast, setToast] = useState<string | null>(null);

  // High Level SEO: Dynamic Title Tag Update
  useEffect(() => {
    document.title = `${TAB_TITLES[activeTab]} | Secure Auth Suite`;
  }, [activeTab]);

  const copyToClipboard = async (text: string, message: string = 'Copied to clipboard!') => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(message);
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans selection:bg-emerald-500/30 flex flex-col">
      
      {/* Global Toast Notification */}
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`} role="alert" aria-live="assertive">
        <div className="bg-emerald-500 text-gray-950 px-6 py-3 rounded-full font-semibold shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
          {toast}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8 lg:gap-12 flex-1 w-full">
        
        {/* Sidebar Navigation */}
        <aside className="lg:w-64 shrink-0 flex flex-col gap-6" aria-label="Sidebar Navigation">
          <header className="mb-4 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center lg:justify-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20" aria-hidden="true">
                <svg className="w-5 h-5 text-gray-950" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              Auth<span className="text-emerald-400">Suite</span>
            </h1>
            <p className="text-xs text-gray-500 mt-2 font-medium">100% Client-Side. Zero Tracking.</p>
          </header>

          <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 hide-scrollbar" aria-label="Main Tool Menu">
            <NavButton id="generate" current={activeTab} set={setActiveTab} title="Secret Generator" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />} />
            <NavButton id="decode" current={activeTab} set={setActiveTab} title="JWT Decoder" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />} />
            <NavButton id="hash" current={activeTab} set={setActiveTab} title="Hash Calculator" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />} />
            <NavButton id="hmac" current={activeTab} set={setActiveTab} title="HMAC Generator" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />} />
            <div className="h-px bg-gray-800/50 my-1 hidden lg:block"></div>
            <NavButton id="json" current={activeTab} set={setActiveTab} title="JSON Formatter" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />} />
            <NavButton id="base64" current={activeTab} set={setActiveTab} title="Base64 Tool" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />} />
            <NavButton id="url" current={activeTab} set={setActiveTab} title="URL Encoder" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />} />
          </nav>
        </aside>

        {/* Main Workspace Content */}
        <main className="flex-1 min-w-0 flex flex-col gap-8" aria-live="polite">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-5 sm:p-8 overflow-hidden min-h-[600px] flex flex-col">
            {activeTab === 'generate' && <GeneratorTool copy={copyToClipboard} />}
            {activeTab === 'decode' && <JwtDecoderTool copy={copyToClipboard} />}
            {activeTab === 'hash' && <HashTool copy={copyToClipboard} />}
            {activeTab === 'hmac' && <HmacTool copy={copyToClipboard} />}
            {activeTab === 'base64' && <Base64Tool copy={copyToClipboard} />}
            {activeTab === 'url' && <UrlEncoderTool copy={copyToClipboard} />}
            {activeTab === 'json' && <JsonFormatterTool copy={copyToClipboard} />}
          </div>

          <EducationalContent activeTab={activeTab} />
        </main>
      </div>
    </div>
  );
}

// ==========================================
// 4. SUB-COMPONENTS (TOOLS)
// ==========================================

function NavButton({ id, current, set, title, icon }: { id: TabId, current: TabId, set: (i: TabId) => void, title: string, icon: React.ReactNode }) {
  const active = current === id;
  return (
    <button
      onClick={() => set(id)}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900 border border-transparent'
      }`}
    >
      <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">{icon}</svg>
      {title}
    </button>
  );
}

function GeneratorTool({ copy }: { copy: (t: string) => void }) {
  const [secret, setSecret] = useState('');
  const [activePreset, setActivePreset] = useState<string>('jwt256');
  const [customLength, setCustomLength] = useState(64);
  const [customType, setCustomType] = useState<EncodingType>('hex');
  const [customPrefix, setCustomPrefix] = useState('');

  const handleGenerate = useCallback(() => {
    if (activePreset === 'custom') {
      setSecret(generateSecureString(customLength, customType, customPrefix));
    } else {
      const preset = PRESETS.find(p => p.id === activePreset)!;
      setSecret(generateSecureString(preset.config.length, preset.config.type, preset.config.prefix));
      setCustomLength(preset.config.length); setCustomType(preset.config.type); setCustomPrefix(preset.config.prefix || '');
    }
  }, [activePreset, customLength, customType, customPrefix]);

  useEffect(() => { handleGenerate(); }, [handleGenerate]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-8 h-full">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
        <div className="relative bg-gray-950 border border-gray-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <code className="font-mono text-emerald-400 text-lg sm:text-xl break-all w-full select-all leading-tight" aria-label="Generated Secret">{secret}</code>
          <div className="flex shrink-0 gap-2 self-end sm:self-auto">
            <button onClick={handleGenerate} className="p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-emerald-500" title="Regenerate" aria-label="Regenerate Secret">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
            <button onClick={() => copy(secret)} className="px-5 py-3 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-gray-950 rounded-lg transition-colors font-medium outline-none focus:ring-2 focus:ring-emerald-500">Copy</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Presets</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup">
            {[...PRESETS, { id: 'custom', name: 'Custom', desc: 'Fine-tune settings', config: null }].map((p) => (
              <button
                key={p.id} onClick={() => setActivePreset(p.id)}
                role="radio" aria-checked={activePreset === p.id}
                className={`text-left p-3 rounded-lg border transition-all duration-200 outline-none focus:ring-2 focus:ring-emerald-500 ${
                  activePreset === p.id ? 'bg-gray-800/80 border-emerald-500/50 shadow-inner' : 'bg-gray-950/50 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className={`font-semibold text-sm ${activePreset === p.id ? 'text-emerald-400' : 'text-gray-200'}`}>{p.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className={`bg-gray-950/50 p-5 rounded-xl border border-gray-800 flex flex-col gap-5 transition-opacity ${activePreset !== 'custom' ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
           <div>
            <div className="flex justify-between text-sm mb-2"><span className="text-gray-300">Length</span><span className="text-emerald-400 font-mono">{customLength} chars</span></div>
            <input type="range" min="12" max="256" step="4" value={customLength} onChange={(e) => { setCustomLength(Number(e.target.value)); handleGenerate(); }} disabled={activePreset !== 'custom' || customType === 'uuid'} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" aria-label="Secret length" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(['hex', 'base64', 'alphanumeric', 'chars', 'uuid'] as const).map((t) => (
                <button key={t} onClick={() => { setCustomType(t); handleGenerate(); }} disabled={activePreset !== 'custom'} className={`py-1.5 px-2 text-xs font-medium rounded border ${customType === t ? 'bg-gray-800 border-emerald-500/50 text-emerald-400' : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'}`}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Prefix</label>
            <input type="text" value={customPrefix} onChange={(e) => { setCustomPrefix(e.target.value); handleGenerate(); }} disabled={activePreset !== 'custom' || customType === 'uuid'} placeholder="sk_live_" className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-gray-200 outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-sm" aria-label="Custom Prefix" />
          </div>
        </div>
      </div>
    </div>
  );
}

function JwtDecoderTool({ copy }: { copy: (t: string) => void }) {
  const [input, setInput] = useState('');
  const [header, setHeader] = useState('');
  const [payload, setPayload] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input.trim()) { setHeader(''); setPayload(''); setError(''); return; }
    try {
      const parts = input.split('.');
      if (parts.length !== 3) throw new Error('JWT must contain 3 parts separated by dots.');
      setHeader(JSON.stringify(JSON.parse(base64UrlDecode(parts[0])), null, 2));
      setPayload(JSON.stringify(JSON.parse(base64UrlDecode(parts[1])), null, 2));
      setError('');
    } catch (err: unknown) {
      setHeader(''); setPayload(''); setError(err instanceof Error ? err.message : 'Invalid JWT');
    }
  }, [input]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col lg:flex-row gap-6 h-full flex-1">
      <div className="flex-1 flex flex-col">
        <label className="text-sm font-semibold text-gray-300 mb-2">Encoded JWT</label>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="eyJhbGciOiJIUzI1Ni..." className="w-full flex-1 min-h-[200px] bg-gray-950 border border-gray-800 rounded-xl p-4 text-emerald-400/80 font-mono text-sm leading-relaxed resize-none outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-700" spellCheck={false} aria-label="JWT Input" />
      </div>
      <div className="flex-1 flex flex-col gap-4">
        {error ? (
          <div className="flex-1 flex items-center justify-center bg-gray-950 border border-red-900/50 rounded-xl p-6 text-center text-red-400 font-medium">
            <div><svg className="w-10 h-10 text-red-500/50 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>{input ? error : 'Waiting for valid token...'}</div>
          </div>
        ) : (
          <>
            <div className="flex flex-col relative group">
              <label className="text-sm font-semibold text-gray-300 mb-2 flex justify-between">Header <button onClick={()=>copy(header)} className="text-xs text-emerald-500 hover:text-emerald-400 hidden group-hover:block" aria-label="Copy Header">Copy</button></label>
              <pre className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-cyan-400 font-mono text-sm overflow-auto max-h-[150px]">{header}</pre>
            </div>
            <div className="flex-1 flex flex-col relative group">
              <label className="text-sm font-semibold text-gray-300 mb-2 flex justify-between">Payload <button onClick={()=>copy(payload)} className="text-xs text-purple-500 hover:text-purple-400 hidden group-hover:block" aria-label="Copy Payload">Copy</button></label>
              <pre className="w-full flex-1 bg-gray-950 border border-gray-800 rounded-xl p-4 text-purple-400 font-mono text-sm overflow-auto min-h-[200px]">{payload}</pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HashTool({ copy }: { copy: (t: string) => void }) {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!input) { setHashes({}); return; }
    let isMounted = true;
    Promise.all([
      calculateSHA(input, 'SHA-1'), calculateSHA(input, 'SHA-256'), calculateSHA(input, 'SHA-512')
    ]).then(([sha1, sha256, sha512]) => {
      if (isMounted) setHashes({ 'SHA-1': sha1, 'SHA-256': sha256, 'SHA-512': sha512 });
    });
    return () => { isMounted = false; };
  }, [input]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6 h-full flex-1">
       <div className="flex flex-col">
        <label className="text-sm font-semibold text-gray-300 mb-2">Input String</label>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter text to hash..." className="w-full min-h-[120px] bg-gray-950 border border-gray-800 rounded-xl p-4 text-gray-200 font-mono text-sm outline-none focus:ring-2 focus:ring-emerald-500" spellCheck={false} aria-label="Text to hash" />
      </div>
      <div className="flex-1 flex flex-col gap-4">
        {['SHA-256', 'SHA-512', 'SHA-1'].map((algo) => (
          <div key={algo} className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col gap-2 relative group">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{algo}</span>
              {hashes[algo] && <button onClick={() => copy(hashes[algo])} className="text-xs text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Copy</button>}
            </div>
            <code className="font-mono text-emerald-400 text-sm break-all select-all">{hashes[algo] || '-'}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

function HmacTool({ copy }: { copy: (t: string) => void }) {
  const [message, setMessage] = useState('');
  const [secret, setSecret] = useState('');
  const [signatures, setSignatures] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!message || !secret) { setSignatures({}); return; }
    let isMounted = true;
    Promise.all([
      calculateHMAC(message, secret, 'SHA-256'), 
      calculateHMAC(message, secret, 'SHA-512')
    ]).then(([sha256, sha512]) => {
      if (isMounted) setSignatures({ 'HS256': sha256, 'HS512': sha512 });
    });
    return () => { isMounted = false; };
  }, [message, secret]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6 h-full flex-1">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col">
          <label className="text-sm font-semibold text-gray-300 mb-2">Message (Payload)</label>
          <textarea 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            placeholder='{"event":"payment_intent.succeeded"}' 
            className="w-full min-h-[120px] bg-gray-950 border border-gray-800 rounded-xl p-4 text-gray-200 font-mono text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
            spellCheck={false} 
          />
        </div>
        <div className="flex-1 flex flex-col">
          <label className="text-sm font-semibold text-gray-300 mb-2">Secret Key</label>
          <textarea 
            value={secret} 
            onChange={(e) => setSecret(e.target.value)} 
            placeholder="whsec_..." 
            className="w-full min-h-[120px] bg-gray-950 border border-gray-800 rounded-xl p-4 text-cyan-400 font-mono text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
            spellCheck={false} 
          />
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-4">
        {['HS256', 'HS512'].map((algo) => (
          <div key={algo} className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col gap-2 relative group">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">HMAC {algo}</span>
              {signatures[algo] && <button onClick={() => copy(signatures[algo])} className="text-xs text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Copy</button>}
            </div>
            <code className="font-mono text-emerald-400 text-sm break-all select-all">{signatures[algo] || 'Waiting for message and secret...'}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

function Base64Tool({ copy }: { copy: (t: string) => void }) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encode'|'decode'>('encode');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input) { setOutput(''); setError(''); return; }
    try {
      setOutput(mode === 'encode' ? safeBase64Encode(input) : safeBase64Decode(input));
      setError('');
    } catch (e) {
      setOutput(''); setError('Invalid input for selected operation.');
    }
  }, [input, mode]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full gap-6 flex-1">
      <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800 w-fit">
        <button onClick={() => setMode('encode')} aria-pressed={mode === 'encode'} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'encode' ? 'bg-gray-800 text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}>Encode</button>
        <button onClick={() => setMode('decode')} aria-pressed={mode === 'decode'} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'decode' ? 'bg-gray-800 text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}>Decode</button>
      </div>
      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Enter text to ${mode}...`} className="flex-1 w-full min-h-[200px] bg-gray-950 border border-gray-800 rounded-xl p-4 text-gray-300 font-mono text-sm outline-none focus:ring-2 focus:ring-emerald-500" spellCheck={false} />
        <div className="flex-1 w-full bg-gray-950 border border-gray-800 rounded-xl p-4 relative group flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Output</span>
            {output && <button onClick={() => copy(output)} className="text-xs text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Copy</button>}
          </div>
          {error ? <div className="text-red-400 text-sm mt-4">{error}</div> : <code className="font-mono text-emerald-400/90 text-sm break-all whitespace-pre-wrap flex-1 overflow-auto">{output}</code>}
        </div>
      </div>
    </div>
  );
}

function UrlEncoderTool({ copy }: { copy: (t: string) => void }) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encode'|'decode'>('encode');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input) { setOutput(''); setError(''); return; }
    try {
      setOutput(mode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input));
      setError('');
    } catch (e) {
      setOutput(''); setError('URI Malformed.');
    }
  }, [input, mode]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full gap-6 flex-1">
      <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800 w-fit">
        <button onClick={() => setMode('encode')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'encode' ? 'bg-gray-800 text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}>Encode URI</button>
        <button onClick={() => setMode('decode')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'decode' ? 'bg-gray-800 text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}>Decode URI</button>
      </div>
      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Enter URL or parameters to ${mode}...`} className="flex-1 w-full min-h-[200px] bg-gray-950 border border-gray-800 rounded-xl p-4 text-gray-300 font-mono text-sm outline-none focus:ring-2 focus:ring-emerald-500" spellCheck={false} />
        <div className="flex-1 w-full bg-gray-950 border border-gray-800 rounded-xl p-4 relative group flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Output</span>
            {output && <button onClick={() => copy(output)} className="text-xs text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Copy</button>}
          </div>
          {error ? <div className="text-red-400 text-sm mt-4">{error}</div> : <code className="font-mono text-emerald-400/90 text-sm break-all whitespace-pre-wrap flex-1 overflow-auto">{output}</code>}
        </div>
      </div>
    </div>
  );
}

function JsonFormatterTool({ copy }: { copy: (t: string) => void }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input.trim()) { setOutput(''); setError(''); return; }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError('');
    } catch (e: any) {
      setOutput(''); setError(e.message || 'Invalid JSON format');
    }
  }, [input]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col lg:flex-row gap-6 h-full flex-1">
      <div className="flex-1 flex flex-col">
        <label className="text-sm font-semibold text-gray-300 mb-2">Raw JSON</label>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder='{"user": "dev", "active": true}' className="w-full flex-1 min-h-[200px] bg-gray-950 border border-gray-800 rounded-xl p-4 text-gray-300 font-mono text-sm resize-none outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-700" spellCheck={false} />
      </div>
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex flex-col relative group h-full">
          <label className="text-sm font-semibold text-gray-300 mb-2 flex justify-between">
            Formatted Output 
            {output && <button onClick={() => copy(output)} className="text-xs text-emerald-500 hover:text-emerald-400 hidden group-hover:block">Copy</button>}
          </label>
          <div className={`w-full flex-1 bg-gray-950 border rounded-xl p-4 font-mono text-sm overflow-auto ${error ? 'border-red-900/50 text-red-400' : 'border-gray-800 text-cyan-400'}`}>
            {error ? (
              <div className="flex items-center gap-2"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Syntax Error: {error}</div>
            ) : (
              <pre className="h-full">{output}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. EDUCATIONAL / SEO CONTENT
// ==========================================
function EducationalContent({ activeTab }: { activeTab: TabId }) {
  return (
    <article className="bg-gray-900/50 p-6 sm:p-8 rounded-2xl border border-gray-800/50 text-gray-400 text-sm leading-relaxed" aria-labelledby="edu-heading">
      <h2 id="edu-heading" className="sr-only">Developer Knowledge Base</h2>
      {activeTab === 'generate' && (
        <div className="animate-in fade-in duration-500">
          <h3 className="text-xl font-bold text-white mb-4">Application Secrets Architecture</h3>
          <p className="mb-4">Strong cryptographic secrets are the bedrock of secure edge computing and API design. Utilizing the Web Crypto API guarantees high entropy.</p>
          <ul className="space-y-3 list-disc pl-5">
            <li><strong className="text-emerald-400">API Keys:</strong> Prefixes (e.g., <code className="bg-gray-800 px-1 rounded">sk_live_</code>) allow secret scanners like GitHub Advanced Security to instantly detect leaks.</li>
            <li><strong className="text-cyan-400">JWT Signatures (HS256):</strong> Require exactly 256 bits of true entropy (e.g., 64 Hex characters) to prevent offline brute-force attacks.</li>
          </ul>
        </div>
      )}
      {activeTab === 'decode' && (
        <div className="animate-in fade-in duration-500">
          <h3 className="text-xl font-bold text-white mb-4">JSON Web Token Privacy</h3>
          <p className="mb-4">A JWT payload is merely Base64Url encoded, <em>not encrypted</em>. Never store Personally Identifiable Information (PII) or passwords inside a JWT payload.</p>
          <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-lg mt-4">
            <strong className="text-red-400 block mb-1">Zero-Trust Inspection</strong>
            Our decoder executes 100% locally in your browser. Pasting production tokens into server-backed online tools is a critical security vulnerability.
          </div>
        </div>
      )}
      {activeTab === 'hash' && (
        <div className="animate-in fade-in duration-500">
          <h3 className="text-xl font-bold text-white mb-4">Cryptographic Hashing</h3>
          <p className="mb-4">Hashing algorithms map data of arbitrary size to fixed-size values. They are deterministic (same input always yields same output) and one-way (cannot be decrypted).</p>
          <ul className="space-y-3 list-disc pl-5">
            <li><strong className="text-emerald-400">SHA-256:</strong> The current industry standard for data integrity and blockchain systems.</li>
            <li><strong className="text-gray-500">SHA-1:</strong> Provided for legacy systems debugging only. It is considered cryptographically broken and vulnerable to collision attacks.</li>
          </ul>
        </div>
      )}
      {activeTab === 'hmac' && (
        <div className="animate-in fade-in duration-500">
          <h3 className="text-xl font-bold text-white mb-4">HMAC (Hash-based Message Authentication Code)</h3>
          <p className="mb-4">HMACs provide a way to verify both the <strong>data integrity</strong> and the <strong>authenticity</strong> of a message using a shared secret key. Widely used for verifying Webhook payloads (like Stripe or GitHub events) preventing man-in-the-middle tampering.</p>
          <p>Our generator utilizes the native browser <code>crypto.subtle.sign</code> API ensuring your shared secrets never leave your device.</p>
        </div>
      )}
      {activeTab === 'base64' && (
        <div className="animate-in fade-in duration-500">
          <h3 className="text-xl font-bold text-white mb-4">Base64 Encoding & Unicode</h3>
          <p>Base64 is not encryption; it is an encoding scheme used to represent binary data in an ASCII string format. It is universally used in HTTP headers (Basic Auth), email protocols, and data URLs. This tool safely handles multi-byte Unicode/Emoji characters by utilizing <code className="bg-gray-800 px-1 rounded text-emerald-400">TextEncoder</code> buffers prior to transformation.</p>
        </div>
      )}
      {activeTab === 'url' && (
        <div className="animate-in fade-in duration-500">
          <h3 className="text-xl font-bold text-white mb-4">URL Encoding (Percent-encoding)</h3>
          <p>URL encoding replaces unsafe ASCII characters with a "%" followed by two hexadecimal digits. This is absolutely critical when passing parameters through GET requests or redirecting URLs during OAuth 2.0 flows, preventing injection or malformed payload errors.</p>
        </div>
      )}
      {activeTab === 'json' && (
        <div className="animate-in fade-in duration-500">
          <h3 className="text-xl font-bold text-white mb-4">JSON Formatting & Validation</h3>
          <p>Writing or receiving messy JSON payloads from APIs is common. This tool instantly parses strings, validates the schema structure according to ECMA-404, and formats it with standard 2-space indentation for human readability. Because it runs locally, you can safely parse payloads containing PII.</p>
        </div>
      )}
    </article>
  );
}
