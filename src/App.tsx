import { useState, useEffect, useCallback } from 'react';

// Cryptographically secure random generator
const generateSecureString = (length: number, type: 'hex' | 'base64' | 'chars'): string => {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  
  if (type === 'hex') {
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
  }
  
  if (type === 'base64') {
    return btoa(String.fromCharCode.apply(null, array as unknown as number[])).slice(0, length);
  }

  // Alphanumeric + standard symbols for general passwords/keys
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
};

export default function App() {
  const [secret, setSecret] = useState('');
  const [length, setLength] = useState(64);
  const [type, setType] = useState<'hex' | 'base64' | 'chars'>('hex');
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(() => {
    setSecret(generateSecureString(length, type));
    setCopied(false);
  }, [length, type]);

  // Generate on mount
  useEffect(() => {
    handleGenerate();
  }, [handleGenerate]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="max-w-3xl w-full text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
          Secure <span className="text-emerald-400">JWT Secret</span> Generator
        </h1>
        <p className="text-lg text-gray-400">
          Generate cryptographically strong, random strings for JWT signatures, API keys, and passwords. 
          <span className="text-emerald-400 font-semibold ml-1">100% Client-Side.</span>
        </p>
      </header>

      {/* Main Tool UI */}
      <main className="max-w-3xl w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 sm:p-10 mb-16">
        
        {/* Output Display */}
        <div className="relative mb-8 group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative bg-gray-950 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <code className="font-mono text-emerald-400 text-lg sm:text-xl break-all w-full pr-4 select-all">
              {secret}
            </code>
            <div className="flex shrink-0 gap-2">
              <button 
                onClick={handleGenerate}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                title="Regenerate"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              </button>
              <button 
                onClick={copyToClipboard}
                className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-gray-950 rounded-lg transition-colors flex items-center gap-2 cursor-pointer font-medium"
              >
                {copied ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                )}
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Length Slider */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label htmlFor="length" className="text-sm font-semibold text-gray-300">Length: {length} characters</label>
              <span className="text-xs text-gray-500 font-mono">{length * 8} bits (approx)</span>
            </div>
            <input 
              id="length"
              type="range" 
              min="16" 
              max="256" 
              step="16"
              value={length} 
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-2 font-mono">
              <span>16</span>
              <span>128</span>
              <span>256</span>
            </div>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-4">Output Format</label>
            <div className="flex p-1 bg-gray-950 border border-gray-800 rounded-lg">
              {(['hex', 'base64', 'chars'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
                    type === t 
                      ? 'bg-gray-800 text-emerald-400 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* SEO Content Section */}
      <article className="max-w-3xl w-full text-gray-400 space-y-8 pb-12 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold text-white mb-3">What is a JWT Secret?</h2>
          <p>
            A JSON Web Token (JWT) secret is a cryptographic key used by an authentication server to sign a token. 
            When a client returns the token, the server uses the same secret (in symmetric algorithms like HS256) to verify 
            that the token has not been tampered with. If your secret is weak, attackers can brute-force it and forge administrative tokens.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-3">Why use this generator?</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Cryptographically Secure:</strong> We use the browser's native <code className="text-emerald-400 bg-gray-900 px-1 py-0.5 rounded">crypto.getRandomValues()</code> API rather than the insecure <code className="text-emerald-400 bg-gray-900 px-1 py-0.5 rounded">Math.random()</code>.</li>
            <li><strong>Zero Tracking:</strong> This tool operates entirely in your browser window. No data is sent to our servers.</li>
            <li><strong>Optimized Formats:</strong> Instantly output to Hexadecimal, Base64, or complex character strings depending on your framework's requirements.</li>
          </ul>
        </section>
      </article>
    </div>
  );
}
