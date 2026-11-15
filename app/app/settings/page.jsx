import SessionKeeper from '../../../components/SessionKeeper';
import StudioSettings from '../../../components/dashboard/StudioSettings';
import { requireAppSession } from '../../../lib/app-session.js';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Settings — Vydrivo',
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const { user, needsRefresh } = await requireAppSession();
  return (
    <>
      {needsRefresh ? <SessionKeeper /> : null}
      <StudioSettings user={user} />
    </>
  );
}
