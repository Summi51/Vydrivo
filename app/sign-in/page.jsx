import AuthScreen from '../../components/AuthScreen';
import { authConfig } from '../../lib/auth.js';

export const metadata = {
  title: 'Sign in — Vydrivo',
  robots: { index: false, follow: false },
};

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const notice = params?.error === 'link' ? 'That sign-in link expired or was already used.' : '';
  return <AuthScreen mode="sign-in" config={authConfig()} notice={notice} />;
}
