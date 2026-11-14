import { integrationRows, resolveIntegrations, storeLinks } from '@darjeeling/shared';

export const metadata = { title: 'Integration status' };

export default function SetupPage() {
  const status = resolveIntegrations(process.env as Record<string, string | undefined>);
  const rows = integrationRows(status);
  // App links status comes from config, not env.
  rows[rows.length - 1]!.report.connected = storeLinks.appsLive;

  return (
    <div className="stack">
      <h1>Integration status</h1>
      <p className="muted">
        Each service runs in real mode when its keys are present, and in local placeholder mode when
        they&apos;re missing. Mode: <strong>{status.mode}</strong>.
      </p>

      <div className="stack">
        {rows.map(({ key, report }) => (
          <div key={key} className="card card-pad stack" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{key}</strong>
              <span className={`status-badge`} style={{ background: report.connected ? '#3E6B48' : '#E8A33D', color: report.connected ? '#fff' : '#1F2A44' }}>
                {report.connected ? '✅ Connected' : '🟡 Placeholder'}
              </span>
            </div>
            <span className="muted">{report.detail}</span>
            {!report.connected && report.envKeys.length > 0 ? (
              <div className="banner banner-info" style={{ fontWeight: 400 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Keys needed to switch to real:</div>
                <code style={{ fontSize: 13 }}>{report.envKeys.join(', ')}</code>
                <div style={{ marginTop: 6 }}>
                  See <code>INTEGRATIONS.md</code> section <code>{report.guide}</code>.
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
