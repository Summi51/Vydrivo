import SessionKeeper from '../../../components/SessionKeeper';
import StudioPosts from '../../../components/dashboard/StudioPosts';
import { requireAppSession } from '../../../lib/app-session.js';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Posts — Vydrivo',
  robots: { index: false, follow: false },
};

export default async function PostsPage() {
  const { user, needsRefresh } = await requireAppSession();
  return (
    <>
      {needsRefresh ? <SessionKeeper /> : null}
      <StudioPosts user={user} />
    </>
  );
}
