import type { Metadata } from "next";
import LegalPage, { ContactLink, H2, InternalLink, P, UL } from "../LegalPage";

export const metadata: Metadata = {
  title: "Refund Policy — Lonesome Chair Club",
  description: "When a seat can be refunded, what happens if you miss a session, and how to ask for an exception.",
};

// One constant drives every mention of the cancellation deadline on this page.
const CANCELLATION_WINDOW = "24 hours";

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      intro="Sessions are deliberately small — six seats at most — so a seat you book is a seat nobody else can take. This policy explains when a payment can be refunded."
    >
      <H2>Cancelling your seat</H2>
      <P>
        If you cancel <strong>more than {CANCELLATION_WINDOW} before</strong> a session starts, we will refund
        your payment in full.
      </P>
      <P>
        Within {CANCELLATION_WINDOW} of the start time, seats are generally non-refundable. By that point the
        group is settled and the materials are prepared, and the seat is unlikely to be filled by someone else.
      </P>
      <H2>If you miss a session</H2>
      <P>
        Missed sessions are not automatically refunded. If you book a seat and do not come, the payment is not
        returned by default, because the seat was held for you and could not be offered to anyone else.
      </P>
      <P>
        This is not meant to be harsh. Life happens, and if something went wrong we would much rather hear
        about it than have you quietly out of pocket — see below.
      </P>

      <H2>If we cancel</H2>
      <P>
        If a session is cancelled or rescheduled by us, you can take a full refund or move your seat to another
        session, whichever you prefer.
      </P>

      <H2>Asking for an exception</H2>
      <P>
        Illness, emergencies, technical trouble at our end, and simple honest mistakes are all worth raising.
        To ask for a refund or to move your seat, <ContactLink /> with:
      </P>
      <UL>
        <li>the name and email you booked with,</li>
        <li>which session it was, and</li>
        <li>briefly, what happened.</li>
      </UL>
      <P>
        We read every message and will do our best to sort something out — a refund, a seat at a later session,
        or the materials if you would still like them.
      </P>

      <H2>How refunds are paid</H2>
      <P>
        Refunds go back through the way you paid — Stripe or PayPal — to the same card or account. How quickly
        it appears is up to your bank or PayPal, and is usually a few working days.
      </P>

      <H2>Related</H2>
      <P>
        This policy forms part of our{" "}
        <InternalLink href="/legal/terms-of-service">Terms of Service</InternalLink>.
      </P>
    </LegalPage>
  );
}
