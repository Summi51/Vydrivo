import SessionKeeper from '../../../../../components/SessionKeeper';
import PublishWorkspace from '../../../../../components/dashboard/PublishWorkspace';
import { requireAppSession } from '../../../../../lib/app-session.js';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Publish — Vydrivo',
  robots: { index: false, follow: false },
};

export default async function PublishPage({ params }) {
  const { id } = await params;
  const { user, needsRefresh } = await requireAppSession();
  return (
    <>
      {needsRefresh ? <SessionKeeper /> : null}
      <PublishWorkspace user={user} projectId={id} />
    </>
  );
}
