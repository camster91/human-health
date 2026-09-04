'use client';

/** Compatibility exports for links or branches that still import the original panels. */
export function TodayWholePerson({ strengthSessions }: { strengthSessions: number }) {
  return <section className="card"><p className="muted">Whole-person coaching is now integrated into the Today dashboard. {strengthSessions} recent strength session{strengthSessions === 1 ? '' : 's'} recorded.</p></section>;
}

export function CapabilityPanel() {
  return <section className="card"><p className="muted">Capability assessments and longitudinal trends are now integrated into Progress.</p></section>;
}
