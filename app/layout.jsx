import './globals.css';

export const metadata = {
  title: 'Vydrivo — Turn your idea into a video you can shape',
  description: 'Plan your story, review every scene, and shape an AI video with narration and captions. Vydrivo is in private prototype development.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
