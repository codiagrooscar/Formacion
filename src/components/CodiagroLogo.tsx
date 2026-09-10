import React, { useState, useEffect } from 'react';

interface CodiagroLogoProps {
  className?: string;
  variant?: 'full' | 'icon';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  lightText?: boolean;
  src?: string;
}

export const CodiagroLogo: React.FC<CodiagroLogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
  src,
}) => {
  // Dimension definitions
  const dimensions = {
    xs: { height: 'h-6', iconH: 'h-6', maxH: 24 },
    sm: { height: 'h-8', iconH: 'h-8', maxH: 32 },
    md: { height: 'h-10', iconH: 'h-10', maxH: 40 },
    lg: { height: 'h-12', iconH: 'h-12', maxH: 48 },
    xl: { height: 'h-16', iconH: 'h-16', maxH: 64 },
  };

  const currentDim = dimensions[size] || dimensions.md;

  const [fallbackIndex, setFallbackIndex] = useState(0);

  const fallbackPaths = ['/logo.png', '/logoapp.png', '/assets/logo.png', '/assets/logoapp.png'];

  // Stored logo from settings / storage
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    if (src) return src;
    try {
      const stored = localStorage.getItem('codiagro_logo_url');
      if (stored) return stored;
    } catch {
      // ignore
    }
    return fallbackPaths[0];
  });

  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (src) {
      setLogoUrl(src);
      setHasError(false);
      setFallbackIndex(0);
    }
  }, [src]);

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem('codiagro_logo_url');
        if (stored && stored !== logoUrl) {
          setLogoUrl(stored);
          setHasError(false);
          setFallbackIndex(0);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('codiagro_logo_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('codiagro_logo_updated', handleStorageChange);
    };
  }, [logoUrl]);

  const handleImageError = () => {
    const nextIdx = fallbackIndex + 1;
    if (nextIdx < fallbackPaths.length) {
      setFallbackIndex(nextIdx);
      setLogoUrl(fallbackPaths[nextIdx]);
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      id="codiagro-official-logo"
      className={`inline-flex items-center select-none ${className}`}
      aria-label="CODIAGRO"
    >
      {!hasError ? (
        <img
          src={logoUrl}
          alt="CODIAGRO"
          onError={handleImageError}
          className={`${currentDim.height} w-auto object-contain transition-transform duration-200`}
          style={{ maxHeight: currentDim.maxH }}
        />
      ) : (
        /* Clean fallback if image file is missing in public folder */
        <div className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <span className="font-black tracking-wider text-emerald-400 font-sans text-sm">
            CODIAGRO
          </span>
          <span className="text-[10px] font-bold text-amber-400">
            [logo.png]
          </span>
        </div>
      )}
    </div>
  );
};


