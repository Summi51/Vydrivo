import AuthScreen from '../../components/AuthScreen';
import { authConfig } from '../../lib/auth.js';

export const metadata = {
  title: 'Sign in — Vydrivo',
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return <AuthScreen mode="sign-in" config={authConfig()} />;
}
