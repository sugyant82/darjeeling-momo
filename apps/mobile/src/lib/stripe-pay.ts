/**
 * Stripe Payment Sheet on mobile. The Stripe RN SDK is a NATIVE module, so it
 * only works in a dev/production build (not Expo Go). We require it lazily so the
 * local mock flow keeps working in Expo Go without the dependency installed.
 *
 * To enable: add `@stripe/stripe-react-native` (expo install) and build with EAS.
 */
import { appName } from './env';

export async function payWithStripe(
  clientSecret: string,
  publishableKey: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require('@stripe/stripe-react-native');
    await Stripe.initStripe({ publishableKey });
    const init = await Stripe.initPaymentSheet({
      paymentIntentClientSecret: clientSecret,
      merchantDisplayName: appName,
      applePay: { merchantCountryCode: 'NZ' },
      googlePay: { merchantCountryCode: 'NZ', currencyCode: 'NZD', testEnv: true },
    });
    if (init.error) return { ok: false, error: init.error.message };
    const result = await Stripe.presentPaymentSheet();
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'Stripe is not available in Expo Go. Build a dev client with EAS to test real payments.',
    };
  }
}
