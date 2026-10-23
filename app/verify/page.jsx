import AuthScreen from '../../components/AuthScreen';
import { authConfig } from '../../lib/auth.js';

export const metadata = {
  title: 'Verify email — Vydrivo',
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return <AuthScreen mode="verify" config={authConfig()} />;
}
