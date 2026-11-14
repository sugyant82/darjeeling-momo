export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="container stack" style={{ maxWidth: 720 }}>
      <h1>Privacy Policy</h1>
      <p className="banner banner-warn">
        PLACEHOLDER — replace this with your real privacy policy before launch.
      </p>
      <p className="muted">Last updated: [DATE]</p>
      <h2>What we collect</h2>
      <p>
        [Describe the personal information you collect: name, email, phone, order history, and
        payment information processed by Stripe.]
      </p>
      <h2>How we use it</h2>
      <p>[Explain how you use the information to process orders and notify customers.]</p>
      <h2>Who we share it with</h2>
      <p>[List processors: Supabase (hosting/database), Stripe (payments), Expo (push).]</p>
      <h2>Your rights</h2>
      <p>
        [Explain how customers can access or delete their data. Account deletion is available in the
        app and website under Account.]
      </p>
      <h2>Contact</h2>
      <p>[Your contact email/phone.]</p>
    </div>
  );
}
