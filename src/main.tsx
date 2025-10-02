import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Expose Supabase client globally in dev tools for easier console testing (no hardcoding of keys here)
try {
  if (import.meta.env.DEV) {
    // Lazy import to avoid circulars if any
    import('./integrations/supabase/client').then((m) => {
      // Attach to window so you can use `window.supabase` in the browser console
      ;(window as any).supabase = m.supabase
      console.info('[Dev] window.supabase attached for console use')
    }).catch(() => {/* ignore */})
  }
} catch {/* ignore */}

createRoot(document.getElementById("root")!).render(<App />);
