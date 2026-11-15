import { ViewTransition } from 'react';

/**
 * Templates remount on every navigation, so the page content here gets enter/exit
 * view transitions (animations in globals.css under "View transitions"). The header is
 * named separately and stays put. Browsers without the View Transitions API just
 * swap pages instantly.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      <div className="route">{children}</div>
    </ViewTransition>
  );
}
