import type { Metadata } from "next";
import LegalPage, { ContactLink, H2, InternalLink, LAST_UPDATED, P, UL } from "../LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Lonesome Chair Club",
  description: "The terms you agree to when you book a seat at a Lonesome Chair Club session.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms apply when you book a seat at a Lonesome Chair Club session. Booking a seat means you accept them."
    >
      <H2>What the service is</H2>
      <P>
        Lonesome Chair Club runs themed English-language conversation sessions on art, film, books, and
        theatre. Sessions are held live on Google Meet, last about an hour, and are capped at six people so
        everyone gets to speak.
      </P>
      <P>
        This is a conversation club, not a formal course. There is no certificate, qualification, or guaranteed
        outcome, and it is not a substitute for structured English tuition.
      </P>

      <H2>Registration and payment</H2>
      <UL>
        <li>
          <strong>Your seat is confirmed only once payment has completed.</strong> Filling in the registration
          form starts the process; until the payment goes through, the seat is not held for you.
        </li>
        <li>Payment is taken by Stripe or PayPal. We never see or store your card details.</li>
        <li>
          Once payment completes, you get a confirmation link, and the Google Meet link and session materials
          are shared with you before the session.
        </li>
        <li>
          Please register with an email address you actually read — it is how we send the materials and the
          meeting link.
        </li>
      </UL>
      <P>
        Seats are limited and allocated in the order payments complete. If a session fills or is cancelled
        before your payment completes, we will refund you in full.
      </P>

      <H2>Conduct during sessions</H2>
      <P>
        These sessions work because people feel comfortable speaking imperfectly in front of others. To keep
        that true, we ask that you:
      </P>
      <UL>
        <li>let other people finish, and leave room for quieter voices;</li>
        <li>treat other participants and their opinions with respect, especially when you disagree;</li>
        <li>
          do not record, photograph, or share any part of a session without everyone's agreement — including
          what other people say about themselves;
        </li>
        <li>keep your Meet link to yourself; it is for the seat you booked, not for a group;</li>
        <li>
          arrive roughly on time, since a small group notices an empty chair and a late arrival interrupts the
          conversation.
        </li>
      </UL>
      <P>
        Harassment, abuse, and discriminatory or deliberately hurtful behaviour are not tolerated. We may
        remove someone from a session, or decline future bookings, if that happens. In serious cases we will
        not offer a refund.
      </P>

      <H2>Refunds and cancellations</H2>
      <P>
        Cancellations, missed sessions, and how to ask for an exception are covered in full in our{" "}
        <InternalLink href="/legal/refund-policy">Refund Policy</InternalLink>, which forms part of these
        terms.
      </P>

      <H2>Age requirement</H2>
      <P>
        Sessions are intended for adults. You should be 18 or over to book a seat for yourself.
      </P>
      <P>
        Younger participants are welcome in principle, but a parent or guardian needs to <ContactLink /> first
        so we can agree it in advance and make sure the session is a good fit. Please do not book a seat for a
        minor without doing that.
      </P>

      <H2>Your data</H2>
      <P>
        What we collect and how to have it deleted is set out in our{" "}
        <InternalLink href="/legal/privacy-policy">Privacy Policy</InternalLink>. Browser storage is covered in
        our <InternalLink href="/legal/cookie-policy">Cookie Policy</InternalLink>.
      </P>

      <H2>Things outside our control</H2>
      <P>
        Sessions depend on Google Meet and on everyone's internet connection. If a session cannot go ahead
        because of a technical failure at our end, we will reschedule it or refund you. We cannot be
        responsible for problems with your own connection, device, or software.
      </P>

      <H2>Changes to these terms</H2>
      <P>
        We may update these terms as the club changes. The current version always appears on this page, with
        the date it was last changed shown at the top — this version is dated {LAST_UPDATED}. Material changes
        will not be applied retroactively to a session you have already paid for: the terms that apply to your
        booking are the ones published when you booked.
      </P>

      <H2>Contact</H2>
      <P>
        Questions about these terms, a booking, or anything else — <ContactLink />, and we will get back to
        you.
      </P>
    </LegalPage>
  );
}
