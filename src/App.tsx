import { useState, useEffect, useCallback } from 'react';

// --- Utility: Cryptographically secure random generator ---
const generateSecureString = (length: number, type: 'hex' | 'base64' | 'chars'): string => {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  
  if (type === 'hex') {
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
  }
  
  if (type === 'base64') {
    return btoa(String.fromCharCode.apply(null, array as unknown as number[])).slice(0, length);
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
};

// --- Utility: JWT Decoder ---
const base64UrlDecode = (str: string) => {
  // Pad string with '=' to make it a multiple of 4
  let output = str.replace(/-/g, '+').replace(/_/g, '/');
  switch (output.length % 4) {
    case 0: break;
    case 2: output += '=='; break;
    case 3: output += '='; break;
    default: throw new Error('Illegal base64url string!');
  }
  return decodeURIComponent(window.atob(output).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'generate' | 'decode'>('generate');
  
  // Generator State
  const [secret, setSecret] = useState('');
  const [length, setLength] = useState(64);
  const [type, setType] = useState<'hex' | 'base64' | 'chars'>('hex');
  const [copied, setCopied] = useState(false);

  // Decoder State
  const [jwtInput, setJwtInput] = useState('');
  const [decodedHeader, setDecodedHeader] = useState('');
  const [decodedPayload, setDecodedPayload] = useState('');
  const [decodeError, setDecodeError] = useState('');

  // Generate on mount
  const handleGenerate = useCallback(() => {
    setSecret(generateSecureString(length, type));
    setCopied(false);
  }, [length, type]);

  useEffect(() => {
    handleGenerate();
  }, [handleGenerate]);

  // Decode JWT on input change
  useEffect(() => {
    if (!jwtInput.trim()) {
      setDecodedHeader('');
      setDecodedPayload('');
      setDecodeError('');
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
      setDecodedHeader('');
      setDecodedPayload('');
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
      <header className="max-w-4xl w-full text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
          JWT <span className="text-emerald-400">DevTools</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
          The ultimate, privacy-first toolkit for working with JSON Web Tokens.
          <span className="text-emerald-400 font-semibold ml-1 block sm:inline mt-1 sm:mt-0">100% Client-Side.</span>
        </p>
        
        {/* Tab Switcher */}
        <div className="mt-8 flex justify-center gap-2 sm:gap-4">
          <button 
            onClick={() => setActiveTab('generate')}
            className={`px-6 py-2.5 rounded-full font-semibold transition-all duration-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-950 ${
              activeTab === 'generate' 
              ? 'bg-emerald-500 text-gray-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Secret Generator
          </button>
          <button 
            onClick={() => setActiveTab('decode')}
            className={`px-6 py-2.5 rounded-full font-semibold transition-all duration-200 outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-950 ${
              activeTab === 'decode' 
              ? 'bg-emerald-500 text-gray-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            JWT Decoder
          </button>
        </div>
      </header>

      {/* Main App Container */}
      <main className="max-w-4xl w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-5 sm:p-8 lg:p-10 mb-16 overflow-hidden">
        
        {/* --- TAB: GENERATE --- */}
        {activeTab === 'generate' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="sr-only">Generate Secret</h2>
            
            <div className="relative mb-8 group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative bg-gray-950 border border-gray-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <code className="font-mono text-emerald-400 text-base sm:text-lg break-all w-full select-all">
                  {secret}
                </code>
                <div className="flex shrink-0 gap-2 self-end sm:self-auto">
                  <button 
                    onClick={handleGenerate}
                    className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500"
                    title="Regenerate"
                    aria-label="Regenerate secret"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  </button>
                  <button 
                    onClick={() => copyToClipboard(secret)}
                    className="px-4 py-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-gray-950 rounded-lg transition-colors flex items-center gap-2 cursor-pointer font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {copied ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    )}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Length Slider */}
              <div className="bg-gray-950/50 p-5 rounded-xl border border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <label htmlFor="length" className="text-sm font-semibold text-gray-300">Length: <span className="text-emerald-400">{length}</span> chars</label>
                  <span className="text-xs text-gray-500 font-mono">{length * 8} bits</span>
                </div>
                <input 
                  id="length"
                  type="range" 
                  min="16" max="256" step="16"
                  value={length} 
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-3 font-mono">
                  <span>16</span><span>128</span><span>256</span>
                </div>
              </div>

              {/* Type Selector */}
              <div className="bg-gray-950/50 p-5 rounded-xl border border-gray-800">
                <label className="block text-sm font-semibold text-gray-300 mb-4">Encoding Format</label>
                <div className="flex flex-col sm:flex-row p-1 bg-gray-900 border border-gray-800 rounded-lg gap-1">
                  {(['hex', 'base64', 'chars'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500 ${
                        type === t 
                          ? 'bg-gray-800 text-emerald-400 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                      }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
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
              <label htmlFor="jwt-input" className="text-sm font-semibold text-gray-300 mb-2">Encoded Token</label>
              <textarea 
                id="jwt-input"
                value={jwtInput}
                onChange={(e) => setJwtInput(e.target.value)}
                placeholder="Paste your JWT here (e.g., eyJhbGciOiJIUzI1Ni...)"
                className="w-full flex-1 min-h-[250px] md:min-h-[400px] bg-gray-950 border border-gray-800 rounded-xl p-4 text-emerald-400/80 font-mono text-sm leading-relaxed resize-y outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-700 transition-shadow"
                spellCheck={false}
              />
            </div>

            {/* Output Section */}
            <div className="flex-1 flex flex-col gap-4">
              {decodeError ? (
                <div className="flex-1 flex items-center justify-center bg-gray-950 border border-red-900/50 rounded-xl p-6">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-red-500/50 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <p className="text-red-400 font-medium">{jwtInput ? decodeError : 'Waiting for token...'}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-end mb-2">
                      <label className="text-sm font-semibold text-gray-300">Header <span className="text-xs text-gray-500 font-normal ml-1">(Algorithm & Type)</span></label>
                    </div>
                    <pre className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-cyan-400 font-mono text-sm overflow-auto h-[120px]">
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

      {/* Deep Research SEO & Educational Content */}
      <article className="max-w-4xl w-full text-gray-400 space-y-12 pb-12 leading-relaxed">
        
        {/* JWT Architecture Section */}
        <section className="bg-gray-900/50 p-6 sm:p-8 rounded-2xl border border-gray-800/50">
          <h2 className="text-2xl font-bold text-white mb-4">Deep Dive: The Architecture of a JWT</h2>
          <p className="mb-4">
            JSON Web Tokens (JWT) are an open, industry-standard (<strong>RFC 7519</strong>) method for representing claims securely between two parties. They are highly prevalent in stateless authentication systems (like Cloudflare Workers and Edge computing) because the server does not need to query a database to verify the user's identity.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="space-y-2">
              <h3 className="text-cyan-400 font-mono font-bold">1. Header (Red)</h3>
              <p className="text-sm">Consists of two parts: the type of the token (JWT) and the signing algorithm being used, such as HMAC SHA256 or RSA. This is Base64Url encoded to form the first part of the JWT.</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-purple-400 font-mono font-bold">2. Payload (Purple)</h3>
              <p className="text-sm">Contains the claims. Claims are statements about an entity (typically, the user) and additional data. Common standard claims include <code className="bg-gray-800 px-1 rounded text-gray-300">iss</code> (issuer), <code className="bg-gray-800 px-1 rounded text-gray-300">exp</code> (expiration time), and <code className="bg-gray-800 px-1 rounded text-gray-300">sub</code> (subject).</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-emerald-400 font-mono font-bold">3. Signature (Blue)</h3>
              <p className="text-sm">Created by taking the encoded header, the encoded payload, a secret, and the algorithm specified in the header. This ensures the token hasn't been altered in transit.</p>
            </div>
          </div>
        </section>

        {/* Security Best Practices */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Security Posture & Best Practices</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="mt-1 shrink-0 bg-red-500/20 text-red-500 p-1.5 rounded-full h-fit">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <div>
                <strong className="text-gray-200 block mb-1">Never put secrets in the payload</strong>
                <p className="text-sm">The payload is Base64Url encoded, <em className="text-gray-300">not encrypted</em>. Anyone who intercepts the token can read the payload (as demonstrated by our Decoder tool). Never store passwords, PII, or internal API keys in the JWT payload.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 shrink-0 bg-emerald-500/20 text-emerald-500 p-1.5 rounded-full h-fit">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              </div>
              <div>
                <strong className="text-gray-200 block mb-1">Secret Entropy</strong>
                <p className="text-sm">If you are using HMAC algorithms (HS256), your secret must be cryptographically strong. A weak secret allows attackers to brute-force the signature offline and subsequently forge administrative tokens. Use our generator to create secrets with at least 256 bits of entropy.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 shrink-0 bg-blue-500/20 text-blue-500 p-1.5 rounded-full h-fit">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div>
                <strong className="text-gray-200 block mb-1">Expiration is Mandatory</strong>
                <p className="text-sm">Always include an <code className="bg-gray-800 px-1 rounded">exp</code> (expiration) claim. Because JWTs are stateless, they cannot be easily invalidated on the server side once issued. Keeping token lifespans short (e.g., 15 minutes) and using refresh tokens mitigates the risk of a stolen token.</p>
              </div>
            </div>
          </div>
        </section>

      </article>
    </div>
  );
}
