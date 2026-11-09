import { useState } from 'react';
import { Button } from '@/components/ui/button';
const journeys = {
  organizer: [
    {
      title: 'Make it your event',
      body: 'Set the name, date and place. Your event and its signing identity stay in this browser.',
      image: 'overview',
      alt: 'Actual EntryLoop event overview for a fictional Harbor Makers rehearsal',
    },
    {
      title: 'Bring your guest list',
      body: 'Add a guest or import a spreadsheet. Preview errors and duplicates before anything is saved.',
      image: 'guests',
      alt: 'Actual EntryLoop guest list with three fictional attendees and issued tickets',
    },
    {
      title: 'Give guests their tickets',
      body: 'Issue signed QR tickets. Download one ticket or a printable sheet, then share each ticket with its intended guest.',
      image: 'ticket',
      alt: 'Actual signed EntryLoop ticket issued to a fictional rehearsal guest',
    },
    {
      title: 'Prepare the entrances',
      body: 'Transfer the event package, independently verify the organizer key, then explicitly approve each intended phone.',
      image: 'exchange',
      alt: 'Actual EntryLoop exchange controls before receiving entrance records',
    },
  ],
  staff: [
    {
      title: 'Prepare your phone',
      body: 'Open the organizer’s event package and verify the complete fingerprint through a trusted channel. Preparation alone is not permission to admit guests.',
      image: 'overview',
      alt: 'Fictional rehearsal event used to explain device preparation',
    },
    {
      title: 'Get organizer approval',
      body: 'Show your request to the organizer. They compare your full device fingerprint and return a signed approval for this phone and event.',
      image: 'ticket',
      alt: 'Example signed ticket that requires an approved scanner at the correct event',
    },
    {
      title: 'Welcome each guest',
      body: 'Scan the guest’s ticket. EntryLoop checks the signature, event and local admission status before saving an admission.',
      image: 'guests',
      alt: 'Organizer-only fictional guest list; scanner packages do not contain these names',
    },
    {
      title: 'Exchange the records',
      body: 'Bring two approved devices together. Scan the request, offer and batches, return the confirmation, then exchange the other direction if needed.',
      image: 'exchange',
      alt: 'Actual offline exchange interface with send, receive and saved transfer controls',
    },
  ],
} as const;
export function JourneyExplorer({
  organizerHref,
  staffHref,
}: {
  organizerHref: string;
  staffHref: string;
}) {
  const [role, setRole] = useState<'organizer' | 'staff'>('organizer');
  const [step, setStep] = useState(0);
  const current = journeys[role][step]!;
  return (
    <section
      id="start"
      className="journey-section site-section"
      aria-labelledby="journey-title"
    >
      <div className="section-intro" data-reveal>
        <h2 id="journey-title">Find your next move.</h2>
        <p>
          One event. Two simple jobs. Choose yours to walk through the actual
          workflow.
        </p>
      </div>
      <div className="journey-layout">
        <div className="journey-controls">
          <div
            className="role-switch"
            role="group"
            aria-label="Explore your role"
          >
            <button
              aria-pressed={role === 'organizer'}
              onClick={() => {
                setRole('organizer');
                setStep(0);
              }}
            >
              I’m organizing
            </button>
            <button
              aria-pressed={role === 'staff'}
              onClick={() => {
                setRole('staff');
                setStep(0);
              }}
            >
              I’m on the door
            </button>
          </div>
          <ol className="journey-steps">
            {journeys[role].map((item, index) => (
              <li key={item.title}>
                <button
                  aria-current={step === index ? 'step' : undefined}
                  onClick={() => setStep(index)}
                >
                  <span>{item.title}</span>
                  <span aria-hidden="true">{step === index ? '↘' : '↗'}</span>
                </button>
                {step === index && <p aria-live="polite">{item.body}</p>}
              </li>
            ))}
          </ol>
          <Button asChild>
            <a href={role === 'organizer' ? organizerHref : staffHref}>
              {role === 'organizer' ? 'Open organizer' : 'Prepare this phone'}{' '}
              <span aria-hidden="true">↗</span>
            </a>
          </Button>
        </div>
        <figure
          className={`journey-picture journey-picture-${current.image}`}
          data-ui
        >
          <div className="screenshot-window">
            <img
              key={current.image}
              src={`/website/${current.image}.png`}
              alt={current.alt}
              width={current.image === 'ticket' ? 760 : 2232}
              height={
                { ticket: 1560, overview: 1654, guests: 1662, exchange: 1444 }[
                  current.image
                ]
              }
              loading="lazy"
            />
          </div>
          <figcaption>
            Real EntryLoop interface · fictional rehearsal data
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
