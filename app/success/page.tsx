import StatusPanel from "./StatusPanel";

export default function SuccessPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;

  return (
    <section style={{ padding: "72px 0 100px" }}>
      <div className="wrap" style={{ maxWidth: 480 }}>
        <span className="eyebrow">You're in</span>
        <h1 style={{ fontSize: 30, marginBottom: 24 }}>Thanks for reserving your seat</h1>
        {token ? (
          <StatusPanel token={token} />
        ) : (
          <p style={{ color: "#993C1D" }}>Missing confirmation link — please use the link from your payment confirmation.</p>
        )}
      </div>
    </section>
  );
}
