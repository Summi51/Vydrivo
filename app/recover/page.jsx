import AuthScreen from '../../components/AuthScreen';
import { authConfig } from '../../lib/auth.js';

export const metadata = {
  title: 'Reset password — Vydrivo',
  robots: { index: false, follow: false },
};

export default function RecoverPage() {
  return <AuthScreen mode="recover" config={authConfig()} />;
}
