import type { Metadata } from "next";
import LegalPage, { ContactLink, H2, InternalLink, P, UL } from "../LegalPage";

export const metadata: Metadata = {
  title: "Cookie Policy — Lonesome Chair Club",
  description: "Which cookies and browser storage Lonesome Chair Club uses, and which come from Stripe, PayPal, and Google Meet.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="Cookies are small files a website asks your browser to keep. This page explains the very short list we use, and the ones our payment and video providers may set."
    >
      <H2>What this site stores itself</H2>
      <P>
        Lonesome Chair Club sets no advertising or analytics cookies. The only thing we store on your device is
        your answer to the cookie banner:
      </P>
      <UL>
        <li>
          <strong>cookie-consent</strong> — records whether you pressed "Accept all" or "Only necessary", so
          the banner does not appear on every page. It is kept in your browser's local storage rather than in a cookie, it
          stays on your device, and it is never sent to us.
        </li>
      </UL>
      <P>
        You can clear it at any time through your browser's "clear site data" or "clear history" settings. The
        banner will then appear again on your next visit.
      </P>

      <H2>Cookies set by payment providers</H2>
      <P>
        When you go to pay, you are handed to Stripe or PayPal. Those companies set their own cookies to run
        the payment, keep it secure, and detect fraud. They are set by Stripe and PayPal, not by us, and we
        cannot read them.
      </P>
      <UL>
        <li>
          <strong>Stripe</strong> — cookies used for the checkout page and for fraud prevention.
        </li>
        <li>
          <strong>PayPal</strong> — cookies used to run the PayPal buttons and complete a payment.
        </li>
      </UL>
      <P>
        These are necessary for a payment to work. Choosing "Only necessary" on this site does not remove
        them, because they only appear once you choose to pay. Their use is governed by Stripe's and PayPal's own
        cookie and privacy policies.
      </P>

      <H2>Google Meet</H2>
      <P>
        Sessions are held on Google Meet. When you follow the meeting link, you leave this site and Google may
        set its own cookies in line with Google's policies. That happens on Google's side and is outside our
        control.
      </P>

      <H2>What your choice does</H2>
      <P>
        We do not currently set any optional cookies, so today the two buttons come to the same thing: your
        answer is recorded and we stop asking. Registration, payment, and the newsletter all work either way.
      </P>
      <P>
        The choice is offered so that it already means something the moment anything optional is added. If we
        ever introduce analytics, "Only necessary" will keep it switched off for you.
      </P>

      <H2>Changes</H2>
      <P>
        If we ever add analytics or anything else that tracks visitors, we will update this page and ask for
        consent before switching it on. See also our{" "}
        <InternalLink href="/legal/privacy-policy">Privacy Policy</InternalLink>.
      </P>

      <H2>Questions</H2>
      <P>
        If you would like more detail about anything on this page, <ContactLink />.
      </P>
    </LegalPage>
  );
}
