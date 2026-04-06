import { useEffect, useRef, useState } from 'react';

interface Props {
  url: string;
  company?: string;
}

type LoadState = 'loading' | 'loaded' | 'blocked';

// Upgrade http:// to https:// when the app itself is on HTTPS to avoid
// mixed-content blocks. The original URL is kept for "open in new tab".
function toSecureUrl(raw: string): string {
  if (window.location.protocol === 'https:' && raw.startsWith('http://')) {
    return raw.replace(/^http:\/\//, 'https://');
  }
  return raw;
}

export function WebsitePanel({ url, company }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [displayUrl, setDisplayUrl] = useState(url);
  const [loadCount, setLoadCount] = useState(0); // >1 means back is possible
  const [popupOpened, setPopupOpened] = useState(false);

  const secureUrl = toSecureUrl(url);

  // Reset when the source URL changes (new row)
  useEffect(() => {
    setLoadState('loading');
    setDisplayUrl(secureUrl);
    setLoadCount(0);
    setPopupOpened(false);
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Called when we detect blocking. autoOpen=true when inside an event handler
  // (popup allowed); false when from a timeout (popup blocker will suppress it).
  const markBlocked = (autoOpen: boolean) => {
    setLoadState('blocked');
    if (autoOpen) {
      const tab = window.open(secureUrl, '_blank', 'noopener,noreferrer');
      setPopupOpened(tab !== null);
    } else {
      setPopupOpened(false);
    }
  };

  const handleLoad = () => {
    // Try to read the current URL (works same-origin, silently fails cross-origin)
    try {
      const current = iframeRef.current?.contentWindow?.location?.href;
      if (current && current !== 'about:blank') {
        setDisplayUrl(current);
      }
    } catch {
      // cross-origin — keep last known URL
    }

    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc && doc.body && doc.body.innerHTML === '') {
        // Inside onLoad event handler — popup allowed by browser
        markBlocked(true);
        return;
      }
    } catch {
      // cross-origin — page loaded fine visually
    }

    setLoadState('loaded');
    setLoadCount(c => c + 1);
  };

  const handleBack = () => {
    try {
      iframeRef.current?.contentWindow?.history.back();
    } catch {
      // ignore
    }
  };

  // Fallback timeout — if no load event in 8s assume blocked.
  // Fired from setTimeout so the browser popup blocker will suppress window.open.
  useEffect(() => {
    if (loadState !== 'loading') return;
    const t = setTimeout(() => markBlocked(false), 8000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, loadState]);

  if (!url) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">No website URL for this row</p>
      </div>
    );
  }

  const canGoBack = loadCount > 1;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white shrink-0">
        {/* Traffic lights */}
        <div className="flex gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-green-400" />
        </div>

        {/* Back button */}
        <button
          onClick={handleBack}
          disabled={!canGoBack}
          title="Back"
          className={`shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors ${
            canGoBack
              ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* URL bar */}
        <div className="flex-1 bg-gray-100 rounded-md px-3 py-1 text-xs text-gray-500 truncate font-mono min-w-0">
          {displayUrl}
        </div>

        {/* Open in new tab */}
        <a
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          title="Open in new tab"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {loadState === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50 z-10">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading {company || 'website'}...</p>
          </div>
        )}

        {loadState === 'blocked' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-50 z-10 p-8">
            {popupOpened ? (
              <>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Opened in new tab
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    {company || 'This site'} blocks embedding — opened automatically.
                  </p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Open again
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {company || 'This site'} blocks embedding
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    The website prevents iframe display (X-Frame-Options).
                  </p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Open in new tab
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={secureUrl}
          onLoad={handleLoad}
          className={`w-full h-full border-0 transition-opacity duration-200 ${
            loadState === 'loading' ? 'opacity-0' : 'opacity-100'
          }`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title={`${company || 'Company'} website`}
        />
      </div>
    </div>
  );
}
