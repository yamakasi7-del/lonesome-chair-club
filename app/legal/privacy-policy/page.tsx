import type { Metadata } from "next";
import LegalPage, { ContactLink, H2, InternalLink, P, UL } from "../LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Lonesome Chair Club",
  description: "What personal data Lonesome Chair Club collects, where it is stored, and how to have it deleted.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains what personal information Lonesome Chair Club collects from you, why we collect it, where it is kept, and how you can have it removed."
    >
      <H2>What we collect</H2>
      <P>We only ask for what we need to hold your seat and stay in touch:</P>
      <UL>
        <li>
          <strong>When you register for a session:</strong> your name and email address.
        </li>
        <li>
          <strong>When you subscribe to the newsletter:</strong> your email address.
        </li>
        <li>
          <strong>Alongside your registration:</strong> which session you booked, whether payment has been
          completed, and the date you registered.
        </li>
      </UL>
      <P>
        We do not ask for your address, phone number, or date of birth, and we do not build a profile of you
        beyond the above.
      </P>

      <H2>Where your data is stored</H2>
      <P>
        Registrations and newsletter subscriptions are stored in our database, hosted by Supabase. Access is
        restricted to the club host and to the site's own server code — the public website cannot read the
        registration or subscriber tables directly.
      </P>

      <H2>Payment information</H2>
      <P>
        <strong>This site never sees or stores your card details.</strong> When you pay, you are handed to
        Stripe or to PayPal, and you enter your payment details directly with them. They process the payment
        and tell us only whether it succeeded.
      </P>
      <P>
        We keep a reference to the payment (for example a Stripe checkout session identifier) so we can match
        your payment to your seat. Your card number, expiry date, and security code never reach our servers.
        Stripe and PayPal handle that data as independent controllers under their own privacy policies.
      </P>

      <H2>How we use your data</H2>
      <UL>
        <li>To confirm your seat and send you the session materials and the Google Meet link.</li>
        <li>To know how many people are attending, so sessions stay small.</li>
        <li>To send newsletter emails, if you asked for them.</li>
      </UL>
      <P>We do not sell your data, and we do not share it with anyone beyond the services described here.</P>

      <H2>How long we keep it</H2>
      <P>
        Registration records are kept while they are needed to run the club and to keep basic payment records.
        Newsletter subscriptions are kept until you ask to be removed.
      </P>

      <H2>Your choices and how to delete your data</H2>
      <P>
        You can ask us to show you what we hold about you, correct it, or delete it entirely. To do that,{" "}
        <ContactLink /> and say what you would like removed. We will confirm once it is done.
      </P>
      <P>
        Deleting your data may mean we can no longer confirm a seat you have already paid for, so if a session
        is coming up it is worth waiting until afterwards.
      </P>

      <H2>Cookies</H2>
      <P>
        Cookies and similar browser storage are covered separately in our{" "}
        <InternalLink href="/legal/cookie-policy">Cookie Policy</InternalLink>.
      </P>

      <H2>Questions</H2>
      <P>
        If anything here is unclear, or you want to know exactly what we hold about you, <ContactLink /> and we
        will answer.
      </P>
    </LegalPage>
  );
}
