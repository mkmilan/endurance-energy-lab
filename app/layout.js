import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './style.css';
export const metadata = {
  title: 'Endurance Energy Lab',
  description: 'Explore oxygen demand and energy expenditure by running pace or cycling power.'
};
export default function RootLayout({children}) {
  return <html lang="en"><body>{children}</body></html>;
}
