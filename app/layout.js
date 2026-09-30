import './globals.css';

export const metadata = {
  title: 'Wall Street Daily',
  description: 'Private personal market and business news dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
