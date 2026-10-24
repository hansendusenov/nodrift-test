/**
 * Central application configuration.
 * Adheres to nodrift-standard Section 1: Single config entrypoint.
 * Business logic imports from here; never call import.meta.env directly.
 */

const requiredEnvKeys = ['VITE_APP_NAME'];

// Fail-fast validation at startup per nodrift-standard Section 1
const missingKeys = requiredEnvKeys.filter((key) => !import.meta.env[key]);
if (missingKeys.length > 0) {
  const message = `[Config Error] Missing required environment variables: ${missingKeys.join(', ')}`;
  if (import.meta.env.PROD) {
    throw new Error(message);
  } else {
    console.warn(`[Config Warning] ${message}. Using fallback in development.`);
  }
}

export const appConfig = Object.freeze({
  appName: import.meta.env.VITE_APP_NAME || 'RentCar Pro',
  whatsappContact: import.meta.env.VITE_WHATSAPP_CONTACT || '6281234567890',
  defaultCurrency: import.meta.env.VITE_DEFAULT_CURRENCY || 'IDR',
  isDev: Boolean(import.meta.env.DEV),

  /**
   * Gate for the staff panel at `#/admin`.
   *
   * SECURITY: this is a mockup. The PIN ships in the client bundle and can be
   * read by anyone who opens DevTools, and all data lives in localStorage.
   * It only stops a casual visitor from wandering into the panel; it is not
   * authentication. Real access control requires a backend that verifies the
   * credential server-side.
   */
  adminPin: import.meta.env.VITE_ADMIN_PIN || '2468',
});

export default appConfig;
