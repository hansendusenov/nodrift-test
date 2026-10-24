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
});

export default appConfig;

