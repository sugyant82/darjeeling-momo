export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <div className="container stack" style={{ maxWidth: 720 }}>
      <h1>Terms of Service</h1>
      <p className="banner banner-warn">
        PLACEHOLDER — replace this with your real terms before launch.
      </p>
      <p className="muted">Last updated: [DATE]</p>
      <h2>Orders and pickup</h2>
      <p>[Explain that orders are for pickup at the truck, and pickup times are estimates.]</p>
      <h2>Payment</h2>
      <p>[Explain that prices are in NZD and GST-inclusive, and payment is taken at checkout.]</p>
      <h2>Cancellations and refunds</h2>
      <p>[Describe your cancellation and refund policy.]</p>
      <h2>Allergens</h2>
      <p>[Add any allergen / food safety disclaimers.]</p>
      <h2>Contact</h2>
      <p>[Your contact email/phone.]</p>
    </div>
  );
}
