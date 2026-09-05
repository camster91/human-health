import Link from 'next/link';

export default function PrivacyPage() {
  return <main className="app-shell">
    <header>
      <div>
        <span className="eyebrow">HUMAN HEALTH</span>
        <h1>Privacy & Data Practices</h1>
      </div>
      <Link className="route-back" href="/">Back to training</Link>
    </header>

    <section className="card">
      <h2>Your data stays on your device</h2>
      <p>Human Health stores all training, readiness, and health data locally in your browser. Nothing is automatically sent to external servers.</p>
      <p className="muted">This app is designed for privacy-first operation. Your workout history, readiness checks, and activity logs remain under your control.</p>
    </section>

    <section className="card">
      <h2>No diagnostic claims</h2>
      <p>Human Health provides general training guidance and does not diagnose injury, illness, or prescribe medication. The app does not replace medical advice from qualified healthcare professionals.</p>
      <p className="muted">Recommendations are based on training principles and should be adapted to your individual circumstances in consultation with appropriate healthcare providers.</p>
    </section>

    <section className="card">
      <h2>Diabetes and glucose management</h2>
      <p>This app does not provide insulin dosing recommendations or replace your clinician-directed diabetes management plan. Exercise impacts blood glucose, and you should follow your established care plan.</p>
      <p className="muted">Always consult with your healthcare team before starting or significantly changing an exercise program if you have diabetes or other metabolic conditions.</p>
    </section>

    <section className="card">
      <h2>Data export and portability</h2>
      <p>You can export your complete data archive at any time from Settings. Exported data includes training history, health tracking, and preventive care records in standard JSON format.</p>
      <p className="muted">Your data belongs to you. Export it before clearing browser storage or switching devices.</p>
    </section>

    <section className="card">
      <h2>Optional integrations</h2>
      <p>If you choose to connect external health data sources or share data with other services, you control which scopes and permissions are granted. Each integration request requires explicit confirmation.</p>
      <p className="muted">Connected integrations are documented with source attribution and can be disconnected at any time.</p>
    </section>

    <section className="card">
      <h2>Safety boundaries</h2>
      <p>When you flag pain, illness, or unusual discomfort in readiness checks, automatic exercise suggestions are paused. The app cannot determine whether exercise is safe in these contexts.</p>
      <p className="muted">Use your established care plan or seek appropriate professional support before resuming app-generated training suggestions after flagging safety concerns.</p>
    </section>

    <section className="card">
      <h2>Progressive Web App storage</h2>
      <p>This app uses browser storage APIs (IndexedDB and localStorage) to save your data. Browser policies control how long this data persists, and clearing browser data will delete locally stored workout history.</p>
      <p className="muted">For long-term data retention, export regular backups. Storage quotas vary by browser and may require permissions.</p>
    </section>

    <section className="card">
      <h2>No analytics or tracking</h2>
      <p>Human Health does not include analytics libraries, advertising trackers, or third-party behavioral tracking. Your usage patterns and training data are not monitored or transmitted.</p>
      <p className="muted">The app requests only the permissions needed for core functionality: storage, notifications (optional), and wake lock (during active workouts).</p>
    </section>

    <section className="card">
      <h2>Questions or concerns</h2>
      <p>For questions about data practices or to report issues, refer to the project repository or documentation.</p>
      <p className="muted">This privacy notice describes current practices as of the app version. Material changes will be communicated through app updates.</p>
    </section>
  </main>;
}
