import { useState, useEffect, useCallback } from 'react';

// --- Types & Constants ---
type EncodingType = 'hex' | 'base64' | 'chars' | 'alphanumeric' | 'uuid';

interface Preset {
  id: string;
  name: string;
  desc: string;
  config: { length: number; type: EncodingType; prefix?: string };
}

const PRESETS: Preset[] = [
  { id: 'jwt256', name: 'JWT Secret (HS256)', desc: '64-char Hex (256-bit entropy)', config: { length: 64, type: 'hex' } },
  { id: 'jwt512', name: 'JWT Secret (HS512)', desc: '88-char Base64 (512-bit entropy)', config: { length: 64, type: 'base64' } }, // 64 bytes = 512 bits. Base64 of 64 bytes is ~88 chars.
  { id: 'api_live', name: 'API Key (Live)', desc: 'Stripe-style sk_live_ key', config: { length: 32, type: 'alphanumeric', prefix: 'sk_live_' } },
  { id: 'api_test', name: 'API Key (Test)', desc: 'Stripe-style sk_test_ key', config: { length: 32, type: 'alphanumeric', prefix: 'sk_test_' } },
  { id: 'nextauth', name: 'NextAuth / Django', desc: 'High entropy mixed characters', config: { length: 48, type: 'chars' } },
  { id: 'oauth', name: 'OAuth Client Secret', desc: '40-char Hex string', config: { length: 40, type: 'hex' } },
  { id: 'uuid', name: 'UUID v4', desc: 'Standard RFC 4122 identifier', config: { length: 36, type: 'uuid' } },
];

// --- Utilities: Cryptography & Decoding ---
const generateSecureString = (length: number, type: EncodingType, prefix: string = ''): string => {
  if (type === 'uuid') {
    return window.crypto.randomUUID();
  }

  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  
  let result = '';
  
  if (type === 'hex') {
    result = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
  } else if (type === 'base64') {
    result = btoa(String.fromCharCode.apply(null, array as unknown as number[])).replace(/=/g, ''); // Strip padding for cleaner URLs
    result = result.slice(0, length);
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
  switch (output.length % 4) {
    case 0: break;
    case 2: output += '=='; break;
    case 3: output += '='; break;
    default: throw new Error('Illegal base64url string!');
  }
  return decodeURIComponent(window.atob(output).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'generate' | 'decode'>('generate');
  
  // Generator State
  const [secret, setSecret] = useState('');
  const [activePresetId, setActivePresetId] = useState<string>('jwt256');
  const [customLength, setCustomLength] = useState(64);
  const [customType, setCustomType] = useState<EncodingType>('hex');
  const [customPrefix, setCustomPrefix] = useState('');
  const [copied, setCopied] = useState(false);

  // Decoder State
  const [jwtInput, setJwtInput] = useState('');
  const [decodedHeader, setDecodedHeader] = useState('');
  const [decodedPayload, setDecodedPayload] = useState('');
  const [decodeError, setDecodeError] = useState('');

  // Handle Generation
  const handleGenerate = useCallback(() => {
    if (activePresetId === 'custom') {
      setSecret(generateSecureString(customLength, customType, customPrefix));
    } else {
      const preset = PRESETS.find(p => p.id === activePresetId)!;
      setSecret(generateSecureString(preset.config.length, preset.config.type, preset.config.prefix));
      // Sync custom state for UI continuity if user switches to custom later
      setCustomLength(preset.config.length);
      setCustomType(preset.config.type);
      setCustomPrefix(preset.config.prefix || '');
    }
    setCopied(false);
  }, [activePresetId, customLength, customType, customPrefix]);

  useEffect(() => {
    handleGenerate();
  }, [handleGenerate, activePresetId]); // Auto regenerate on preset change

  // Handle Decode
  useEffect(() => {
    if (!jwtInput.trim()) {
      setDecodedHeader(''); setDecodedPayload(''); setDecodeError('');
      return;
    }
    try {
      const parts = jwtInput.split('.');
      if (parts.length !== 3) throw new Error('A valid JWT must contain exactly 3 parts separated by dots.');
      const header = JSON.parse(base64UrlDecode(parts[0]));
      const payload = JSON.parse(base64UrlDecode(parts[1]));
      setDecodedHeader(JSON.stringify(header, null, 2));
      setDecodedPayload(JSON.stringify(payload, null, 2));
      setDecodeError('');
    } catch (err: unknown) {
      setDecodedHeader(''); setDecodedPayload('');
      setDecodeError(err instanceof Error ? err.message : 'Invalid JWT Format');
    }
  }, [jwtInput]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Header & Navigation */}
      <header className="max-w-5xl w-full text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
          Auth <span className="text-emerald-400">DevTools</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
          Enterprise-grade secret generation and JWT inspection.
          <span className="text-emerald-400 font-semibold ml-1 block sm:inline mt-1 sm:mt-0">100% Client-Side. Zero Tracking.</span>
        </p>
        
        {/* Tab Switcher */}
        <div className="mt-8 flex justify-center gap-2 sm:gap-4 p-1 bg-gray-900/50 rounded-full w-fit mx-auto border border-gray-800">
          <button 
            onClick={() => setActiveTab('generate')}
            className={`px-6 py-2.5 rounded-full font-semibold transition-all duration-300 outline-none ${
              activeTab === 'generate' 
              ? 'bg-emerald-500 text-gray-950 shadow-md' 
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Secret Generator
          </button>
          <button 
            onClick={() => setActiveTab('decode')}
            className={`px-6 py-2.5 rounded-full font-semibold transition-all duration-300 outline-none ${
              activeTab === 'decode' 
              ? 'bg-emerald-500 text-gray-950 shadow-md' 
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            JWT Decoder
          </button>
        </div>
      </header>

      {/* Main App Container */}
      <main className="max-w-5xl w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-5 sm:p-8 lg:p-10 mb-16 overflow-hidden">
        
        {/* --- TAB: GENERATE --- */}
        {activeTab === 'generate' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-8">
            <h2 className="sr-only">Generate Auth Secrets</h2>
            
            {/* Output Display */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative bg-gray-950 border border-gray-800 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <code className="font-mono text-emerald-400 text-lg sm:text-xl md:text-2xl break-all w-full select-all leading-tight">
                  {secret}
                </code>
                <div className="flex shrink-0 gap-2 self-end sm:self-auto">
                  <button 
                    onClick={handleGenerate}
                    className="p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500"
                    title="Regenerate"
                    aria-label="Regenerate secret"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  </button>
                  <button 
                    onClick={() => copyToClipboard(secret)}
                    className="px-5 py-3 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-gray-950 rounded-lg transition-colors flex items-center gap-2 cursor-pointer font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {copied ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    )}
                    <span className="text-lg">{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Col: Presets Grid */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Industry Standard Presets</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setActivePresetId(preset.id)}
                      className={`text-left p-4 rounded-xl border transition-all duration-200 outline-none focus:ring-2 focus:ring-emerald-500 ${
                        activePresetId === preset.id
                        ? 'bg-gray-800/80 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                        : 'bg-gray-950/50 border-gray-800 hover:border-gray-700 hover:bg-gray-900'
                      }`}
                    >
                      <div className={`font-semibold mb-1 ${activePresetId === preset.id ? 'text-emerald-400' : 'text-gray-200'}`}>
                        {preset.name}
                      </div>
                      <div className="text-xs text-gray-500">{preset.desc}</div>
                    </button>
                  ))}
                  
                  {/* Custom Preset Button */}
                  <button
                      onClick={() => setActivePresetId('custom')}
                      className={`text-left p-4 rounded-xl border transition-all duration-200 outline-none focus:ring-2 focus:ring-emerald-500 ${
                        activePresetId === 'custom'
                        ? 'bg-gray-800/80 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                        : 'bg-gray-950/50 border-gray-800 hover:border-gray-700 hover:bg-gray-900'
                      }`}
                    >
                      <div className={`font-semibold mb-1 ${activePresetId === 'custom' ? 'text-emerald-400' : 'text-gray-200'}`}>
                        Custom Configuration
                      </div>
                      <div className="text-xs text-gray-500">Fine-tune length, prefix, and encoding</div>
                  </button>
                </div>
              </div>

              {/* Right Col: Custom Controls */}
              <div className={`lg:col-span-5 bg-gray-950/50 p-6 rounded-xl border border-gray-800 flex flex-col gap-6 transition-opacity duration-300 ${activePresetId !== 'custom' ? 'opacity-50 pointer-events-none grayscale-[50%]' : 'opacity-100'}`}>
                
                {/* Length */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label htmlFor="length" className="text-sm font-semibold text-gray-300">Length: <span className="text-emerald-400">{customLength}</span> chars</label>
                  </div>
                  <input 
                    id="length" type="range" min="12" max="256" step="4"
                    value={customLength} 
                    onChange={(e) => { setCustomLength(Number(e.target.value)); handleGenerate(); }}
                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500"
                    disabled={activePresetId !== 'custom' || customType === 'uuid'}
                  />
                </div>

                {/* Encoding Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3">Encoding Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['hex', 'base64', 'alphanumeric', 'chars', 'uuid'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => { setCustomType(t); handleGenerate(); }}
                        disabled={activePresetId !== 'custom'}
                        className={`py-2 px-3 text-xs font-medium rounded-lg border transition-all ${
                          customType === t 
                            ? 'bg-gray-800 border-emerald-500/50 text-emerald-400' 
                            : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'
                        }`}
                      >
                        {t === 'chars' ? 'SYMBOLS' : t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prefix */}
                <div>
                  <label htmlFor="prefix" className="block text-sm font-semibold text-gray-300 mb-3">Prefix (Optional)</label>
                  <input
                    id="prefix"
                    type="text"
                    value={customPrefix}
                    onChange={(e) => { setCustomPrefix(e.target.value); handleGenerate(); }}
                    disabled={activePresetId !== 'custom' || customType === 'uuid'}
                    placeholder="e.g., my_app_"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-600 font-mono text-sm disabled:opacity-50"
                  />
                </div>

              </div>
            </div>
          </div>
        )}

        {/* --- TAB: DECODE --- */}
        {activeTab === 'decode' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col md:flex-row gap-6">
            <h2 className="sr-only">Decode JWT</h2>
            
            {/* Input Section */}
            <div className="flex-1 flex flex-col">
              <label htmlFor="jwt-input" className="text-sm font-semibold text-gray-300 mb-2">Encoded JWT</label>
              <textarea 
                id="jwt-input"
                value={jwtInput}
                onChange={(e) => setJwtInput(e.target.value)}
                placeholder="Paste your JWT here (e.g., eyJhbGciOiJIUzI1Ni...)"
                className="w-full flex-1 min-h-[300px] md:min-h-[450px] bg-gray-950 border border-gray-800 rounded-xl p-4 text-emerald-400/80 font-mono text-sm leading-relaxed resize-y outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-700 transition-shadow"
                spellCheck={false}
              />
            </div>

            {/* Output Section */}
            <div className="flex-1 flex flex-col gap-4">
              {decodeError ? (
                <div className="flex-1 flex items-center justify-center bg-gray-950 border border-red-900/50 rounded-xl p-6">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-red-500/50 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <p className="text-red-400 font-medium">{jwtInput ? decodeError : 'Waiting for valid token...'}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-end mb-2">
                      <label className="text-sm font-semibold text-gray-300">Header <span className="text-xs text-gray-500 font-normal ml-1">(Algorithm & Type)</span></label>
                    </div>
                    <pre className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-cyan-400 font-mono text-sm overflow-auto h-[140px]">
                      {decodedHeader}
                    </pre>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-end mb-2">
                      <label className="text-sm font-semibold text-gray-300">Payload <span className="text-xs text-gray-500 font-normal ml-1">(Data & Claims)</span></label>
                    </div>
                    <pre className="w-full flex-1 bg-gray-950 border border-gray-800 rounded-xl p-4 text-purple-400 font-mono text-sm overflow-auto min-h-[200px]">
                      {decodedPayload}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* SEO & Educational Content */}
      <article className="max-w-5xl w-full text-gray-400 space-y-12 pb-12 leading-relaxed">
        
        {/* Secrets Overview */}
        <section className="bg-gray-900/50 p-6 sm:p-8 rounded-2xl border border-gray-800/50">
          <h2 className="text-2xl font-bold text-white mb-6">The Anatomy of Application Secrets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h3 className="text-emerald-400 font-mono font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                API Keys (Prefixed)
              </h3>
              <p className="text-sm">Modern API design uses prefixes (like <code className="bg-gray-800 px-1 rounded text-gray-300">sk_live_</code>) followed by a Base62 alphanumeric string. The prefix allows automated secret scanners (like GitHub Advanced Security) to instantly identify and revoke leaked keys. Base62 ensures the key can be easily double-clicked and copied without terminal character boundary issues.</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-cyan-400 font-mono font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                JWT Secrets (HS256)
              </h3>
              <p className="text-sm">When generating symmetric JWT signatures, the secret must have high entropy. An HS256 algorithm requires a 256-bit secret. Using a 64-character Hex string provides exactly 256 bits of true cryptographic entropy, making offline brute-force attacks mathematically infeasible.</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-purple-400 font-mono font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                Framework Secrets
              </h3>
              <p className="text-sm">Web frameworks like Django, Ruby on Rails, or NextAuth use a master secret to sign session cookies, generate password reset tokens, and prevent CSRF attacks. These should utilize the maximum available character space (alphanumerics + symbols) to defend against dictionary attacks.</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-orange-400 font-mono font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                UUID v4
              </h3>
              <p className="text-sm">Universally Unique Identifiers (RFC 4122) aren't strictly "secrets," but they are essential for distributed systems, database primary keys, and idempotency tokens. Version 4 UUIDs are completely randomized, offering 122 bits of randomness.</p>
            </div>
          </div>
        </section>

        {/* Security Warning Section */}
        <section className="bg-red-950/20 p-6 rounded-2xl border border-red-900/30">
           <h2 className="text-xl font-bold text-red-400 mb-3 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            Security Posture
          </h2>
          <p className="text-sm text-gray-300">
            <strong>Client-Side Guarantee:</strong> This tool utilizes your browser's native <code className="text-red-300 font-mono bg-red-950/50 px-1 rounded">window.crypto.getRandomValues()</code>. True randomness is generated locally. No keys, secrets, or decoded JWT payloads ever leave your browser or are sent to any server. 
            <br/><br/>
            Never paste production JWTs containing Personally Identifiable Information (PII) into unverified, server-backed online tools.
          </p>
        </section>

      </article>
    </div>
  );
}
