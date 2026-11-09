import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@/components/ui/button';
import { CinematicFooter } from '@/components/ui/motion-footer';
import { JourneyExplorer } from './JourneyExplorer';
import './website.css';
gsap.registerPlugin(ScrollTrigger);
function entryHref(mode: 'organizer' | 'staff') {
  const params = new URLSearchParams(window.location.search);
  params.set('mode', mode);
  return '/start?' + params.toString();
}
const questions = [
  [
    'What is EntryLoop?',
    'An offline-first event organizer and check-in app. Create an event, import guests, issue signed tickets and prepare entrance phones. Approved devices can then verify tickets and exchange their stored admissions through QR codes without a server.',
  ],
  [
    'Does it need internet?',
    'The prepared core workflow does not. First load and cache the application, transfer the latest event package and authorize each scanner. Test a normal offline reload before event day. Separate initial file transfer or application updates can require connectivity.',
  ],
  [
    'How do records move?',
    'One approved device displays a request, and another reads it with its camera. The sender shows an offer and numbered batches. The receiver verifies the complete transfer before accepting admissions and returns a signed confirmation. Exchange the other direction when their verified records differ.',
  ],
  [
    'Duplicate tickets?',
    'Disconnected devices can admit copies of the same valid ticket independently. EntryLoop rejects duplicates it already knows locally. After exchange, distinct admissions for the same ticket are preserved and shown as a conflict for investigation. It cannot prevent a simultaneous duplicate it has not learned about.',
  ],
  [
    'Interrupted exchange?',
    'Verified admissions remain saved. Incomplete batches are staged separately and survive a normal restart in the same browser workspace. Resume the saved exchange and request missing batches. A transfer is not complete just because two counts happen to match.',
  ],
  [
    'How are phones approved?',
    'Each phone creates its own private signing identity. The organizer explicitly approves that identity for one event after independent full-fingerprint verification. The signed approval can be checked offline. An event file or a workspace name alone does not authorize a scanner.',
  ],
  [
    'Where is my data?',
    'Guest information, events and private signing keys stay in their original local browser storage. Names and emails are not included in scanner packages or admission-exchange QR codes. Ticket downloads include the intended guest’s name, so share them privately. Browser data is not a cloud backup.',
  ],
  [
    'Missing event or lost key?',
    'First return to the original browser, exact website address and saved workspace. Do not clear storage or create a replacement as a recovery step. Recovery tools can inspect known local contexts and export recoverable records. A records-only export cannot recreate a lost non-exportable signing key; lost authority can require a new event and ticket reissuance.',
  ],
];
export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const organizerHref = entryHref('organizer'),
    staffHref = entryHref('staff');
  useEffect(() => {
    const previous = document.title;
    document.title = 'EntryLoop — Keep the doors open';
    return () => {
      document.title = previous;
    };
  }, []);
  useEffect(() => {
    if (paused || !root.current) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.from('.hero-line > span', {
          yPercent: 90,
          duration: 0.9,
          stagger: 0.1,
          ease: 'power4.out',
        });
        gsap.from('.hero-enter', {
          y: 24,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
        });
        gsap.to('.hero-ticket img', {
          yPercent: -4,
          ease: 'none',
          scrollTrigger: {
            trigger: '.site-hero',
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
        for (const element of gsap.utils.toArray<HTMLElement>('[data-reveal]'))
          gsap.from(element, {
            y: 30,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 95%', once: true },
          });
        gsap.from('.handoff-line', {
          scaleX: 0,
          transformOrigin: 'left',
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.optical-story',
            start: 'top 85%',
            once: true,
          },
        });
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, [paused]);
  return (
    <div
      ref={root}
      className="entryloop-site"
      data-motion={paused ? 'off' : 'on'}
    >
      <a className="site-skip" href="#website-content">
        Skip to content
      </a>
      <header className="site-nav">
        <a
          className="site-brand"
          href={'/welcome' + window.location.search}
          aria-label="EntryLoop home"
        >
          EntryLoop<span aria-hidden="true">↗</span>
        </a>
        <nav aria-label="Website">
          <a href="#how-it-works">How it works</a>
          <a href="#start">Your role</a>
          <a href="#questions">Questions</a>
        </nav>
        <div className="site-nav-actions">
          <button
            className="motion-control"
            aria-pressed={paused}
            onClick={() => setPaused((v) => !v)}
          >
            {paused ? 'Enable motion' : 'Pause motion'}
          </button>
          <Button asChild>
            <a href={organizerHref}>
              Open app <span aria-hidden="true">↗</span>
            </a>
          </Button>
        </div>
      </header>
      <main id="website-content" className="website-main">
        <section className="site-hero" aria-labelledby="site-title">
          <div className="hero-copy">
            <h1 id="site-title" aria-label="Doors open. Network off.">
              <span className="hero-line">
                <span>Doors open.</span>
              </span>
              <span className="hero-line">
                <span>Network off.</span>
              </span>
            </h1>
            <p className="hero-enter">
              Offline event check-in. Signed tickets, approved phones, and
              entrance records exchanged through QR codes.
            </p>
            <div className="hero-actions hero-enter">
              <Button asChild>
                <a href={organizerHref}>
                  Organize an event <span aria-hidden="true">↗</span>
                </a>
              </Button>
              <a className="hero-text-link" href={staffHref}>
                Prepare an entrance phone <span aria-hidden="true">↗</span>
              </a>
            </div>
            <p className="hero-note hero-enter">
              Prepare once. Welcome guests. Exchange records.
            </p>
          </div>
          <figure className="hero-ticket hero-enter" data-ui>
            <img
              src="/website/ticket.png"
              alt="Actual signed EntryLoop ticket for the fictional Harbor Makers rehearsal"
              width="760"
              height="1560"
              fetchPriority="high"
            />
            <figcaption>
              One signed ticket. One confident welcome.
              <br />
              Fictional rehearsal shown.
            </figcaption>
          </figure>
          <div className="hero-bottom" aria-label="Core capabilities">
            <span>Built for organizers</span>
            <span>Made for the entrance</span>
            <span>Prepared to work offline</span>
            <span>EntryLoop ↗</span>
          </div>
        </section>
        <section
          id="how-it-works"
          className="optical-story site-section"
          aria-labelledby="optical-title"
        >
          <div className="section-intro" data-reveal>
            <h2 id="optical-title">The connection is light.</h2>
            <p>
              Two entrances. No shared network. Hold up a QR, read it on the
              other device, and bring the records together.
            </p>
          </div>
          <div className="optical-stage" data-reveal>
            <article className="entrance-slab">
              <strong>North shows the code.</strong>
              <p>The sender displays signed batches of its saved admissions.</p>
              <div className="optical-mark" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
            </article>
            <div className="handoff-line" aria-hidden="true">
              <span>→</span>
              <span>Light, not a network</span>
            </div>
            <article className="entrance-slab entrance-receiver">
              <strong>South reads and saves.</strong>
              <p>
                The receiver verifies the whole transfer and returns a signed
                confirmation.
              </p>
              <span className="optical-check" aria-hidden="true">
                ↙
              </span>
            </article>
          </div>
          <p className="story-footnote" data-reveal>
            This diagram explains the handoff. Actual exchanges compare signed
            record identities and content, preserve conflicts and can resume
            missing batches.
          </p>
        </section>
        <JourneyExplorer organizerHref={organizerHref} staffHref={staffHref} />
        <section
          className="proof-section site-section"
          aria-labelledby="proof-title"
        >
          <div className="proof-copy" data-reveal>
            <h2 id="proof-title">A welcome, not a spreadsheet.</h2>
            <p>
              Bring your guest list. Make the tickets. Know what has reached
              this device.
            </p>
            <p>
              Import a CSV with a preview, fix invalid rows and catch duplicates
              before saving. Each guest receives a unique ticket ID. Issue the
              signed ticket once and download it again without creating a
              different admission token.
            </p>
            <a href={organizerHref}>
              Build your guest list <span aria-hidden="true">↗</span>
            </a>
          </div>
          <figure className="proof-picture" data-ui data-reveal>
            <img
              src="/website/guests.png"
              alt="Real EntryLoop guest-management interface showing three fictional guests"
              width="2232"
              height="1662"
              loading="lazy"
            />
            <figcaption>Guest management · fictional rehearsal</figcaption>
          </figure>
        </section>
        <section
          id="offline"
          className="offline-section site-section"
          aria-labelledby="offline-title"
        >
          <div data-reveal>
            <h2 id="offline-title">Ready before the rush.</h2>
            <p className="section-deck">
              Offline confidence starts before the doors open.
            </p>
            <ol className="offline-list">
              <li>
                <h3>Load and keep the app</h3>
                <p>
                  Open EntryLoop on every device while connected. Install it
                  from the browser where supported, or keep the browser
                  shortcut. Allow caching to finish, then test an ordinary
                  offline reload.
                </p>
              </li>
              <li>
                <h3>Prepare and approve each phone</h3>
                <p>
                  Issue tickets, transfer the latest event package and
                  independently verify the organizer’s full fingerprint. Each
                  phone requests its own event-scoped approval. Keep private
                  keys on their original devices.
                </p>
              </li>
              <li>
                <h3>Switch off and rehearse</h3>
                <p>
                  Disable the network, scan a real signed test ticket and
                  complete a two-way exchange. Camera access needs trusted HTTPS
                  or localhost on that device. A desktop screenshot test is not
                  physical camera proof.
                </p>
              </li>
            </ol>
            <Button asChild variant="secondary">
              <a href={staffHref}>
                Prepare this phone <span aria-hidden="true">↗</span>
              </a>
            </Button>
          </div>
          <figure className="offline-picture" data-ui data-reveal>
            <img
              src="/website/overview.png"
              alt="Actual event overview showing three issued tickets and no admitted guests or approved scanners in a fictional event"
              width="2232"
              height="1654"
              loading="lazy"
            />
            <figcaption>Local setup overview · fictional rehearsal</figcaption>
          </figure>
        </section>
        <section
          id="trust"
          className="trust-section site-section"
          aria-labelledby="trust-title"
        >
          <div data-reveal>
            <h2 id="trust-title">Clear about the limits.</h2>
            <p className="section-deck">
              Offline does not mean everything is known everywhere.
            </p>
          </div>
          <div className="trust-columns">
            <article data-reveal>
              <h3>Local means local</h3>
              <p>
                Events and signing keys belong to this browser and website
                address. Another browser, device or installed-app context may
                have different storage. Keep the original context safe; there is
                no cloud key recovery.
              </p>
            </article>
            <article data-reveal>
              <h3>Duplicates stay visible</h3>
              <p>
                Two disconnected entrances can admit the same ticket. Exchange
                reveals those distinct admissions as a conflict. Records are
                preserved; a device timestamp does not choose a winner.
              </p>
            </article>
            <article data-reveal>
              <h3>Approval has a boundary</h3>
              <p>
                Only organizer-approved identities can contribute trusted signed
                admissions. Disconnected phones cannot learn a new revocation
                immediately. Distribute current event packages and policies
                before every shift.
              </p>
            </article>
          </div>
          <div className="prototype-note" data-reveal>
            <strong>Testing status</strong>
            <p>
              EntryLoop is a working prototype under release review. An original
              report of an organizer event disappearing remains unexplained; the
              reliability gate remains FAILED. Physical camera and
              first-time-user acceptance still require evidence.
            </p>
          </div>
        </section>
        <section
          id="questions"
          className="questions-section site-section"
          aria-labelledby="questions-title"
        >
          <div className="section-intro" data-reveal>
            <h2 id="questions-title">Before the doors open.</h2>
            <p>The practical answers, in plain language.</p>
          </div>
          <div className="questions-list">
            {questions.map(([question, answer]) => (
              <details key={question} data-reveal>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <CinematicFooter
        organizerHref={organizerHref}
        staffHref={staffHref}
        paused={paused}
      />
    </div>
  );
}
