import { useEffect, useRef, useState } from 'react';
export function QrDisplay({
  image,
  totalModules,
  alt,
  testId,
}: {
  image: string;
  totalModules: number;
  alt: string;
  testId?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const [small, setSmall] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    function resize() {
      const available = Math.min(360, element!.clientWidth);
      const ratio = window.devicePixelRatio || 1;
      const pixels = Math.max(
        2,
        Math.floor((available * ratio) / totalModules),
      );
      setSize((totalModules * pixels) / ratio);
      setSmall(pixels / ratio < 3);
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [totalModules]);
  return (
    <div ref={container} className="qr-display">
      {size > 0 && (
        <img
          className="qr"
          src={image}
          alt={alt}
          data-testid={testId}
          data-total-modules={totalModules}
          style={{ width: size, height: size, maxWidth: 'none' }}
        />
      )}
      {small && (
        <p role="status">
          Small QR target. Enlarge this window or use the original downloaded
          image on a larger display; do not crop its white border.
        </p>
      )}
    </div>
  );
}
