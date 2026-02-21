import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gymgurus.app',
  appName: 'GymGurus',

  // The built frontend assets (used when NOT using a live server URL)
  webDir: 'dist/public',

  // ── Live Server Mode ──────────────────────────────────────────────────────
  // Points the native shell to your Railway deployment.
  // Benefits: zero app-store resubmission for web-only updates.
  // Update the URL below to your actual production domain before running
  // `npx cap sync` and building the native project.
  //
  // To switch to bundled mode (fully offline): comment out `server` block
  // and run `npx cap copy` after each `npm run build`.
  server: {
    url: 'https://gymgurus.up.railway.app', // ← UPDATE to your Railway URL
    cleartext: false,
    androidScheme: 'https',
  },

  plugins: {
    // ── Splash Screen ─────────────────────────────────────────────────────
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      // iOS: add LaunchScreen.storyboard or use @capacitor/splash-screen docs
    },

    // ── Status Bar ────────────────────────────────────────────────────────
    // Makes the native status bar match the dark app theme
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0a0a0a',
      overlaysWebView: false,
    },
  },
};

export default config;
