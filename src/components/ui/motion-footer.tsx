import { forwardRef, useEffect, useRef } from 'react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils';
if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);
type MagneticButtonProps =
  | ({ as: 'a' } & AnchorHTMLAttributes<HTMLAnchorElement>)
  | ({ as?: 'button' } & ButtonHTMLAttributes<HTMLButtonElement>);
export const MagneticButton = forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  MagneticButtonProps
>(function MagneticButton(props, forwardedRef) {
  const local = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  useEffect(() => {
    const element = local.current;
    if (!element) return;
    const media = gsap.matchMedia();
    media.add(
      '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
      () => {
        const move = (event: Event) => {
          if (!(event instanceof MouseEvent)) return;
          if (element.closest('[data-motion="off"]')) return;
          const r = element.getBoundingClientRect();
          gsap.to(element, {
            x: (event.clientX - r.left - r.width / 2) * 0.14,
            y: (event.clientY - r.top - r.height / 2) * 0.14,
            scale: 1.025,
            duration: 0.35,
            overwrite: 'auto',
            ease: 'power2.out',
          });
        };
        const leave = () => {
          gsap.to(element, {
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.4,
            overwrite: 'auto',
            ease: 'power3.out',
          });
        };
        element.addEventListener('mousemove', move);
        element.addEventListener('mouseleave', leave);
        element.addEventListener('focus', leave);
        return () => {
          element.removeEventListener('mousemove', move);
          element.removeEventListener('mouseleave', leave);
          element.removeEventListener('focus', leave);
          gsap.killTweensOf(element);
          gsap.set(element, { clearProps: 'transform' });
        };
      },
    );
    return () => media.revert();
  }, []);
  const ref = (node: HTMLAnchorElement | HTMLButtonElement | null) => {
    local.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };
  if (props.as === 'a') {
    const { as: _as, className, ...rest } = props;
    void _as;
    return (
      <a ref={ref} className={cn('footer-glass-pill', className)} {...rest} />
    );
  }
  const { as: _as, className, ...rest } = props;
  void _as;
  return (
    <button
      ref={ref}
      className={cn('footer-glass-pill', className)}
      {...rest}
    />
  );
});
function MarqueeItem() {
  return (
    <span>
      Signed tickets <span>↗</span> Open doors <span>↗</span> Offline by design{' '}
      <span>↗</span> Records through light <span>↗</span>{' '}
    </span>
  );
}
export function CinematicFooter({
  organizerHref,
  staffHref,
  paused,
}: {
  organizerHref: string;
  staffHref: string;
  paused: boolean;
}) {
  const wrapper = useRef<HTMLElement>(null);
  useEffect(() => {
    if (paused || !wrapper.current) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.fromTo(
          '.footer-giant-bg-text',
          { yPercent: 24 },
          {
            yPercent: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: wrapper.current,
              start: 'top bottom',
              end: 'bottom bottom',
              scrub: true,
            },
          },
        );
        gsap.from('.footer-reveal', {
          y: 36,
          duration: 0.8,
          stagger: 0.09,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: wrapper.current,
            start: 'top 80%',
            once: true,
          },
        });
      }, wrapper);
      return () => context.revert();
    });
    return () => media.revert();
  }, [paused]);
  return (
    <footer
      ref={wrapper}
      className="cinematic-footer-wrapper"
      aria-labelledby="footer-title"
    >
      <div className="footer-aurora" aria-hidden="true" />
      <div className="footer-bg-grid" aria-hidden="true" />
      <div className="footer-marquee" aria-hidden="true">
        <div className="footer-marquee-track">
          <MarqueeItem />
          <MarqueeItem />
        </div>
      </div>
      <div className="footer-main">
        <h2 id="footer-title" className="footer-reveal">
          Keep the doors open.
        </h2>
        <p className="footer-reveal">
          Your event. Your entrances. A welcome that keeps moving.
        </p>
        <div className="footer-actions footer-reveal">
          <MagneticButton as="a" href={organizerHref}>
            Open organizer <span aria-hidden="true">↗</span>
          </MagneticButton>
          <MagneticButton as="a" href={staffHref}>
            Prepare a phone <span aria-hidden="true">↗</span>
          </MagneticButton>
        </div>
        <nav className="footer-links footer-reveal" aria-label="Footer">
          <a href="#offline">Installation & offline use</a>
          <a href="#trust">Data & recovery</a>
          <a href="#questions">Questions & help</a>
        </nav>
      </div>
      <div className="footer-giant-bg-text" aria-hidden="true">
        EntryLoop
      </div>
      <div className="footer-bottom">
        <span>EntryLoop · 2026</span>
        <span>Built for the moment the network isn’t.</span>
        <MagneticButton
          as="button"
          aria-label="Back to top"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior:
                paused ||
                window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? 'instant'
                  : 'smooth',
            })
          }
        >
          ↑
        </MagneticButton>
      </div>
    </footer>
  );
}
