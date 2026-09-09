// The site has no contact form — Telegram is the contact channel used
// everywhere else, so "get in touch" links across the site point there.
// Swap the href here if a real contact page is ever added.
export default function ContactLink({
  children = "message us on Telegram",
}: {
  children?: React.ReactNode;
}) {
  return (
    <a
      href={process.env.NEXT_PUBLIC_TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "underline" }}
    >
      {children}
    </a>
  );
}
