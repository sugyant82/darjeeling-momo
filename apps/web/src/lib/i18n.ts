'use client';

import { useCallback } from 'react';
import { usePrefs } from '@/components/prefs-context';
import { useTodayLocations } from '@/hooks/queries';
import type { Lang } from '@/lib/prefs';

/**
 * Lightweight client-side i18n. English is the source of truth; every key must
 * exist in Hindi too (enforced by the `Dict` type). Māori greetings are kept
 * verbatim in both languages (a brand element), per product direction.
 *
 * Interpolation: `t('key', { name: 'Sam' })` replaces `{name}`. The pickup-venue
 * word is dynamic — see useVenue() — so venue strings carry a `{venue}` slot.
 */

const en = {
  // Māori greetings — kept in both languages.
  'greet.kiaora': 'Kia ora',
  'greet.welcome': 'Nau mai, haere mai',
  'greet.thanks': 'Ngā mihi',
  'greet.thanksBig': 'Ngā mihi nui',
  'greet.farewell': 'Ka kite anō',

  // Pickup venue words (swapped live by venue type).
  'venue.kitchen': 'kitchen',
  'venue.truck': 'truck',
  'venue.kitchenCap': 'Kitchen',
  'venue.truckCap': 'Truck',
  'pickup.home': 'Home kitchen',
  'pickup.truck': 'Food truck',

  // Brand copy.
  'brand.tagline': 'Himalayan street dumplings · South Auckland',
  'brand.headline': 'Steamed fresh, the Darjeeling way',

  // Nav / controls.
  'nav.menu': 'Menu',
  'nav.admin': 'Admin',
  'nav.home': 'Home',
  'a11y.homeLink': '{app} home',
  'a11y.account': 'Your account',
  'a11y.signin': 'Sign in',
  'a11y.cart': 'Cart, {count} item(s)',
  'theme.toLight': 'Switch to light mode',
  'theme.toDark': 'Switch to dark mode',
  'lang.label': 'Language',
  'lang.en': 'English',
  'lang.hi': 'हिन्दी (Hindi)',

  // Common UI.
  'ui.loading': 'Loading…',
  'ui.tryAgain': 'Try again',
  'ui.somethingWrong': 'Something went wrong.',

  // Home.
  'home.orderNow': 'Order now',
  'home.findVenue': 'Find the {venue}',
  'home.comeEat': 'Come and eat',
  'home.findTruckTitle': 'Find the {venue}',
  'home.todayKicker': 'Today at the {venue}',
  'home.openNow': 'Open now · until {time}',
  'home.opensAt': 'Opens at {time}',
  'home.closedForToday': 'Closed for today',
  'home.closedTodayChip': 'Closed today',
  'home.offRoad': 'Off the {venue} today',
  'home.offRoadBody': 'Check back soon for our next location — or browse the menu and plan your order.',
  'home.seeMenu': 'See the menu',
  'home.openingHours': 'Opening hours',
  'home.pickupSlots': 'Pickup slots',
  'home.everyMin': 'Every {n} min',
  'home.startOrder': 'Start your order',
  'home.openInMaps': 'Open in maps',
  'home.orderAheadTitle': 'Order ahead, skip the queue',
  'home.orderAheadBody': 'Pick your momos, pay online and collect them hot from the {venue}.',
  'home.browseMenu': 'Browse the menu',
  'home.getApp': 'Get the app',
  'home.getAppBody': 'Order faster and get a notification the moment your momos are ready.',
  'home.favKicker': 'Very delicious',
  'home.favTitle': 'Fan favourites',
  'home.fullMenu': 'Full menu',
  'home.howKicker': 'How it works',
  'home.howTitle': 'Hot momos in three steps',
  'home.step1Title': 'Choose your kai',
  'home.step1Body': 'Browse our menu and build your order.',
  'home.step2Title': 'Pay online',
  'home.step2Body': 'Pick a pickup time and check out in seconds.',
  'home.step3Title': 'Collect it hot',
  'home.step3Body': 'Track your order live, then grab it from the {venue}.',
  // Marquee phrases.
  'home.m1': 'Steamed to order',
  'home.m2': 'Himalayan street dumplings',
  'home.m3': 'Order ahead, skip the queue',
  'home.m4': 'Steamed fresh in Auckland',

  // Menu.
  'menu.title': 'Menu',
  'menu.sampleNote': 'Sample menu — prices are GST-inclusive.',
  'menu.loading': 'Loading the menu…',
  'menu.loadError': 'We couldn’t load the menu.',
  'menu.emptyTitle': 'No items yet',
  'menu.emptyBody': 'The menu is being set up. Check back soon.',

  // Menu card.
  'card.addToCart': 'Add to cart',
  'card.soldOut': 'Sold out',
  'card.onlyLeft': 'Only {n} left',

  // Item sheet.
  'sheet.required': 'required',
  'sheet.chooseUpTo': 'choose up to {n}',
  'sheet.quantity': 'Quantity',
  'sheet.decrease': 'Decrease quantity',
  'sheet.increase': 'Increase quantity',
  'sheet.close': 'Close',
  'sheet.pleaseChoose': 'Please choose: {names}',
  'sheet.add': 'Add {n} · {price}',
  'sheet.adding': 'Adding…',
  'sheet.added': 'Ka pai! {n} × {name} added',
  'sheet.addError': 'Could not add to cart. Please try again.',

  // Cart.
  'cart.title': 'Your cart',
  'cart.yourBasket': 'Your basket',
  'cart.emptyTitle': 'Your cart is empty',
  'cart.emptyBody': 'Add some momos to get started.',
  'cart.browseMenu': 'Browse the menu',
  'cart.subtotal': 'Subtotal (excl. GST)',
  'cart.gst': 'GST (15%)',
  'cart.total': 'Total',
  'cart.checkout': 'Go to checkout',
  'cart.remove': 'Remove {name}',
  'cart.decrease': 'Decrease {name}',
  'cart.increase': 'Increase {name}',

  // Checkout.
  'checkout.title': 'Checkout',
  'checkout.pickup': 'Pickup',
  'checkout.contact': 'Contact',
  'checkout.phone': 'Phone number',
  'checkout.notes': 'Order notes (optional)',
  'checkout.notesPlaceholder': 'Allergies, extra achar on the side…',
  'checkout.when': 'When',
  'checkout.asap': 'ASAP',
  'checkout.readyAround': 'ready around {time}',
  'checkout.scheduleTime': 'Schedule a time',
  'checkout.pickupTime': 'Pickup time',
  'checkout.chooseTime': 'Choose a time…',
  'checkout.full': 'full',
  'checkout.prepNote': 'Momos take {wait} to prepare right now.',
  'checkout.earliest': 'Earliest pickup {time}.',
  'checkout.noTimesLeft': 'No pickup times left today.',
  'checkout.noTimes': 'No pickup times are available — please try again soon.',
  'checkout.paused': 'This kitchen has paused new orders right now. Please check back soon.',
  'checkout.pausedShort': 'paused',
  'checkout.closedShort': 'closed',
  'checkout.locationClosed': 'This location is closed right now.',
  'checkout.noPickupToday': 'No pickup is available today. Please check back soon.',
  'checkout.checkingTimes': 'Checking pickup times…',
  'checkout.stockProblem': 'Some items in your cart just sold out or ran low. Please adjust your cart.',
  'checkout.pay': 'Pay {price}',
  'checkout.starting': 'Starting payment…',
  'checkout.nothingTitle': 'Nothing to check out',
  'checkout.nothingBody': 'Your cart is empty.',
  'checkout.chooseTimeError': 'Please choose a pickup time.',
  'checkout.checkDetails': 'Please check your details.',
  'checkout.couldNotStart': 'Could not start checkout.',

  // Order.
  'order.thanks': 'thanks for your order',
  'order.awaitingPayment': 'Awaiting payment confirmation…',
  'order.ready': 'Your order is ready for pickup!',
  'order.cancelled': 'This order was cancelled.',
  'order.pickup': 'Pickup',
  'order.readyAround': 'Ready around {time}',
  'order.asap': 'ASAP',
  'order.contact': 'Contact: {phone}',
  'order.notes': 'Notes: {notes}',
  'order.items': 'Items',
  'order.total': 'Total',
  'order.openInMaps': 'Open in maps',
  'order.notFound': 'We couldn’t find that order.',
  'order.loading': 'Loading your order…',

  // Account.
  'account.title': 'Your account',
  'account.profile': 'Profile',
  'account.name': 'Name',
  'account.email': 'Email',
  'account.phone': 'Phone',
  'account.save': 'Save profile',
  'account.saving': 'Saving…',
  'account.saved': 'Profile saved.',
  'account.saveError': 'Could not save.',
  'account.history': 'Order history',
  'account.noOrders': 'No orders yet.',
  'account.reorder': 'Reorder',
  'account.reordered': 'Added to cart.',
  'account.reorderError': 'Could not reorder.',
  'account.refresh': 'Refresh',
  'account.signOut': 'Sign out',
  'account.deleteAccount': 'Delete account',
  'account.deleteConfirm': 'This permanently deletes your account and data. Continue?',
  'account.deleted': 'Account deleted.',
  'account.deleteError': 'Could not delete account.',
  'account.notSignedIn': 'Not signed in',
  'account.notSignedInBody': 'Sign in to see your orders and profile.',
  'account.itemsCount': '{n} item(s)',

  // Sign in.
  'signin.title': 'Sign in',
  'signin.subtitle': 'Browse freely — you only need to sign in to place an order.',
  'signin.google': 'Continue with Google',
  'signin.devNote': 'Dev sign-in — local only. Pick a seeded account or use a magic link.',
  'signin.signInAs': 'Sign in as {label}',
  'signin.orMagic': 'Or get a magic link',
  'signin.sendMagic': 'Send magic link',
  'signin.googleFailed': 'Google sign-in failed.',
  'signin.devFailed': 'Dev sign-in failed. Did the seed run?',
  'signin.magicSent': 'Magic link sent — check the local mailbox (:54324).',
  'signin.magicFailed': 'Could not send magic link.',

  // Not found.
  'nf.title': 'Page not found',
  'nf.body': 'That page has gone cold. Let’s get you back to the momos.',
  'nf.back': 'Back home',

  // Get app.
  'app.appStore': 'App Store',
  'app.googlePlay': 'Google Play',
  'app.comingSoon': 'Coming soon',
  'app.bannerText': 'Get a smoother experience in the app.',
  'app.dismiss': 'Dismiss app banner',

  // Footer.
  'footer.explore': 'Explore',
  'footer.getApp': 'Get the app',
  'footer.getAppNote': 'Order faster and get a ping the moment your momos are ready.',
  'footer.mihi': 'thank you for backing a local food {venue}.',
  'footer.seeYou': 'see you at the {venue}!',
  'footer.cart': 'Cart',
  'footer.account': 'Account',
  'footer.privacy': 'Privacy',
  'footer.terms': 'Terms',
  'footer.integration': 'Integration status',
  'footer.rights': '© {year} {app}. Sample data — not a real business yet.',
} as const;

export type MsgKey = keyof typeof en;
type Dict = Record<MsgKey, string>;

const hi: Dict = {
  'greet.kiaora': 'Kia ora',
  'greet.welcome': 'Nau mai, haere mai',
  'greet.thanks': 'Ngā mihi',
  'greet.thanksBig': 'Ngā mihi nui',
  'greet.farewell': 'Ka kite anō',

  'venue.kitchen': 'रसोई',
  'venue.truck': 'ट्रक',
  'venue.kitchenCap': 'रसोई',
  'venue.truckCap': 'ट्रक',
  'pickup.home': 'घर की रसोई',
  'pickup.truck': 'फ़ूड ट्रक',

  'brand.tagline': 'हिमालयी स्ट्रीट डम्पलिंग · साउथ ऑकलैंड',
  'brand.headline': 'ताज़े भाप में पके, दार्जिलिंग अंदाज़ में',

  'nav.menu': 'मेन्यू',
  'nav.admin': 'एडमिन',
  'nav.home': 'होम',
  'a11y.homeLink': '{app} होम',
  'a11y.account': 'आपका अकाउंट',
  'a11y.signin': 'साइन इन',
  'a11y.cart': 'कार्ट, {count} आइटम',
  'theme.toLight': 'लाइट मोड पर जाएँ',
  'theme.toDark': 'डार्क मोड पर जाएँ',
  'lang.label': 'भाषा',
  'lang.en': 'English',
  'lang.hi': 'हिन्दी (Hindi)',

  'ui.loading': 'लोड हो रहा है…',
  'ui.tryAgain': 'फिर कोशिश करें',
  'ui.somethingWrong': 'कुछ गड़बड़ हो गई।',

  'home.orderNow': 'अभी ऑर्डर करें',
  'home.findVenue': '{venue} ढूँढें',
  'home.comeEat': 'आइए और खाइए',
  'home.findTruckTitle': '{venue} ढूँढें',
  'home.todayKicker': 'आज {venue} पर',
  'home.openNow': 'अभी खुला · {time} तक',
  'home.opensAt': '{time} बजे खुलेगा',
  'home.closedForToday': 'आज के लिए बंद',
  'home.closedTodayChip': 'आज बंद',
  'home.offRoad': 'आज {venue} बंद है',
  'home.offRoadBody': 'हमारी अगली जगह के लिए जल्द ही देखें — या मेन्यू देखकर अपना ऑर्डर प्लान करें।',
  'home.seeMenu': 'मेन्यू देखें',
  'home.openingHours': 'खुलने का समय',
  'home.pickupSlots': 'पिकअप स्लॉट',
  'home.everyMin': 'हर {n} मिनट',
  'home.startOrder': 'ऑर्डर शुरू करें',
  'home.openInMaps': 'मैप में खोलें',
  'home.orderAheadTitle': 'पहले से ऑर्डर करें, लाइन छोड़ें',
  'home.orderAheadBody': 'अपने मोमो चुनें, ऑनलाइन भुगतान करें और {venue} से गरमागरम ले जाएँ।',
  'home.browseMenu': 'मेन्यू देखें',
  'home.getApp': 'ऐप डाउनलोड करें',
  'home.getAppBody': 'तेज़ ऑर्डर करें और जैसे ही आपके मोमो तैयार हों, सूचना पाएँ।',
  'home.favKicker': 'बहुत स्वादिष्ट',
  'home.favTitle': 'सबके पसंदीदा',
  'home.fullMenu': 'पूरा मेन्यू',
  'home.howKicker': 'यह कैसे काम करता है',
  'home.howTitle': 'तीन चरणों में गरम मोमो',
  'home.step1Title': 'अपना खाना चुनें',
  'home.step1Body': 'हमारा मेन्यू देखें और अपना ऑर्डर बनाएँ।',
  'home.step2Title': 'ऑनलाइन भुगतान करें',
  'home.step2Body': 'पिकअप समय चुनें और कुछ ही पलों में चेकआउट करें।',
  'home.step3Title': 'गरमागरम ले जाएँ',
  'home.step3Body': 'अपने ऑर्डर को लाइव ट्रैक करें, फिर {venue} से ले जाएँ।',
  'home.m1': 'ऑर्डर पर भाप में पका',
  'home.m2': 'हिमालयी स्ट्रीट डम्पलिंग',
  'home.m3': 'पहले से ऑर्डर करें, लाइन छोड़ें',
  'home.m4': 'ऑकलैंड में ताज़ा भाप में पका',

  'menu.title': 'मेन्यू',
  'menu.sampleNote': 'नमूना मेन्यू — कीमतें GST सहित हैं।',
  'menu.loading': 'मेन्यू लोड हो रहा है…',
  'menu.loadError': 'हम मेन्यू लोड नहीं कर सके।',
  'menu.emptyTitle': 'अभी कोई आइटम नहीं',
  'menu.emptyBody': 'मेन्यू तैयार किया जा रहा है। जल्द ही देखें।',

  'card.addToCart': 'कार्ट में डालें',
  'card.soldOut': 'बिक गया',
  'card.onlyLeft': 'केवल {n} बचे',

  'sheet.required': 'ज़रूरी',
  'sheet.chooseUpTo': '{n} तक चुनें',
  'sheet.quantity': 'मात्रा',
  'sheet.decrease': 'मात्रा घटाएँ',
  'sheet.increase': 'मात्रा बढ़ाएँ',
  'sheet.close': 'बंद करें',
  'sheet.pleaseChoose': 'कृपया चुनें: {names}',
  'sheet.add': 'जोड़ें {n} · {price}',
  'sheet.adding': 'जोड़ा जा रहा है…',
  'sheet.added': 'Ka pai! {n} × {name} जोड़ा गया',
  'sheet.addError': 'कार्ट में नहीं जोड़ सके। कृपया फिर कोशिश करें।',

  'cart.title': 'आपका कार्ट',
  'cart.yourBasket': 'आपकी टोकरी',
  'cart.emptyTitle': 'आपका कार्ट खाली है',
  'cart.emptyBody': 'शुरू करने के लिए कुछ मोमो जोड़ें।',
  'cart.browseMenu': 'मेन्यू देखें',
  'cart.subtotal': 'उप-कुल (GST के बिना)',
  'cart.gst': 'GST (15%)',
  'cart.total': 'कुल',
  'cart.checkout': 'चेकआउट पर जाएँ',
  'cart.remove': '{name} हटाएँ',
  'cart.decrease': '{name} घटाएँ',
  'cart.increase': '{name} बढ़ाएँ',

  'checkout.title': 'चेकआउट',
  'checkout.pickup': 'पिकअप',
  'checkout.contact': 'संपर्क',
  'checkout.phone': 'फ़ोन नंबर',
  'checkout.notes': 'ऑर्डर नोट्स (वैकल्पिक)',
  'checkout.notesPlaceholder': 'एलर्जी, साइड में अतिरिक्त अचार…',
  'checkout.when': 'कब',
  'checkout.asap': 'जल्द से जल्द',
  'checkout.readyAround': 'लगभग {time} तक तैयार',
  'checkout.scheduleTime': 'समय तय करें',
  'checkout.pickupTime': 'पिकअप समय',
  'checkout.chooseTime': 'समय चुनें…',
  'checkout.full': 'भरा',
  'checkout.prepNote': 'अभी मोमो तैयार होने में {wait} लगते हैं।',
  'checkout.earliest': 'सबसे जल्दी पिकअप {time}।',
  'checkout.noTimesLeft': 'आज के लिए कोई पिकअप समय नहीं बचा।',
  'checkout.noTimes': 'कोई पिकअप समय उपलब्ध नहीं — कृपया जल्द ही फिर कोशिश करें।',
  'checkout.paused': 'इस रसोई ने अभी नए ऑर्डर रोक दिए हैं। कृपया जल्द ही फिर देखें।',
  'checkout.pausedShort': 'रुका',
  'checkout.closedShort': 'बंद',
  'checkout.locationClosed': 'यह जगह अभी बंद है।',
  'checkout.noPickupToday': 'आज कोई पिकअप उपलब्ध नहीं है। कृपया जल्द ही फिर देखें।',
  'checkout.checkingTimes': 'पिकअप समय जाँचे जा रहे हैं…',
  'checkout.stockProblem': 'आपके कार्ट के कुछ आइटम अभी बिक गए या कम पड़ गए। कृपया अपना कार्ट ठीक करें।',
  'checkout.pay': 'भुगतान करें {price}',
  'checkout.starting': 'भुगतान शुरू हो रहा है…',
  'checkout.nothingTitle': 'चेकआउट के लिए कुछ नहीं',
  'checkout.nothingBody': 'आपका कार्ट खाली है।',
  'checkout.chooseTimeError': 'कृपया पिकअप समय चुनें।',
  'checkout.checkDetails': 'कृपया अपनी जानकारी जाँचें।',
  'checkout.couldNotStart': 'चेकआउट शुरू नहीं हो सका।',

  'order.thanks': 'आपके ऑर्डर के लिए धन्यवाद',
  'order.awaitingPayment': 'भुगतान की पुष्टि का इंतज़ार…',
  'order.ready': 'आपका ऑर्डर पिकअप के लिए तैयार है!',
  'order.cancelled': 'यह ऑर्डर रद्द कर दिया गया।',
  'order.pickup': 'पिकअप',
  'order.readyAround': 'लगभग {time} तक तैयार',
  'order.asap': 'जल्द से जल्द',
  'order.contact': 'संपर्क: {phone}',
  'order.notes': 'नोट्स: {notes}',
  'order.items': 'आइटम',
  'order.total': 'कुल',
  'order.openInMaps': 'मैप में खोलें',
  'order.notFound': 'हम वह ऑर्डर नहीं ढूँढ सके।',
  'order.loading': 'आपका ऑर्डर लोड हो रहा है…',

  'account.title': 'आपका अकाउंट',
  'account.profile': 'प्रोफ़ाइल',
  'account.name': 'नाम',
  'account.email': 'ईमेल',
  'account.phone': 'फ़ोन',
  'account.save': 'प्रोफ़ाइल सहेजें',
  'account.saving': 'सहेजा जा रहा है…',
  'account.saved': 'प्रोफ़ाइल सहेजी गई।',
  'account.saveError': 'सहेज नहीं सके।',
  'account.history': 'ऑर्डर इतिहास',
  'account.noOrders': 'अभी कोई ऑर्डर नहीं।',
  'account.reorder': 'फिर ऑर्डर करें',
  'account.reordered': 'कार्ट में जोड़ा गया।',
  'account.reorderError': 'फिर ऑर्डर नहीं कर सके।',
  'account.refresh': 'रिफ़्रेश',
  'account.signOut': 'साइन आउट',
  'account.deleteAccount': 'अकाउंट मिटाएँ',
  'account.deleteConfirm': 'इससे आपका अकाउंट और डेटा स्थायी रूप से मिट जाएगा। जारी रखें?',
  'account.deleted': 'अकाउंट मिटा दिया गया।',
  'account.deleteError': 'अकाउंट नहीं मिटा सके।',
  'account.notSignedIn': 'साइन इन नहीं हैं',
  'account.notSignedInBody': 'अपने ऑर्डर और प्रोफ़ाइल देखने के लिए साइन इन करें।',
  'account.itemsCount': '{n} आइटम',

  'signin.title': 'साइन इन',
  'signin.subtitle': 'आराम से देखें — ऑर्डर देने के लिए ही साइन इन करना होता है।',
  'signin.google': 'Google से जारी रखें',
  'signin.devNote': 'डेव साइन-इन — केवल लोकल। कोई सीडेड अकाउंट चुनें या मैजिक लिंक इस्तेमाल करें।',
  'signin.signInAs': '{label} के रूप में साइन इन करें',
  'signin.orMagic': 'या मैजिक लिंक पाएँ',
  'signin.sendMagic': 'मैजिक लिंक भेजें',
  'signin.googleFailed': 'Google साइन-इन विफल रहा।',
  'signin.devFailed': 'डेव साइन-इन विफल रहा। क्या सीड चला था?',
  'signin.magicSent': 'मैजिक लिंक भेजा गया — लोकल मेलबॉक्स (:54324) देखें।',
  'signin.magicFailed': 'मैजिक लिंक नहीं भेज सके।',

  'nf.title': 'पेज नहीं मिला',
  'nf.body': 'वह पेज ठंडा हो गया। चलिए आपको वापस मोमो तक ले चलते हैं।',
  'nf.back': 'होम पर वापस',

  'app.appStore': 'App Store',
  'app.googlePlay': 'Google Play',
  'app.comingSoon': 'जल्द आ रहा है',
  'app.bannerText': 'ऐप में बेहतर अनुभव पाएँ।',
  'app.dismiss': 'ऐप बैनर हटाएँ',

  'footer.explore': 'एक्सप्लोर',
  'footer.getApp': 'ऐप डाउनलोड करें',
  'footer.getAppNote': 'तेज़ ऑर्डर करें और जैसे ही आपके मोमो तैयार हों, सूचना पाएँ।',
  'footer.mihi': 'एक स्थानीय फ़ूड {venue} का साथ देने के लिए धन्यवाद।',
  'footer.seeYou': '{venue} पर मिलते हैं!',
  'footer.cart': 'कार्ट',
  'footer.account': 'अकाउंट',
  'footer.privacy': 'प्राइवेसी',
  'footer.terms': 'शर्तें',
  'footer.integration': 'इंटीग्रेशन स्थिति',
  'footer.rights': '© {year} {app}. नमूना डेटा — अभी असली व्यवसाय नहीं।',
};

const DICTS: Record<Lang, Dict> = { en, hi };

export type TFunc = (key: MsgKey, vars?: Record<string, string | number>) => string;

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Translation function for the current language. */
export function useT(): { t: TFunc; lang: Lang } {
  const { lang } = usePrefs();
  const t = useCallback<TFunc>(
    (key, vars) => interpolate(DICTS[lang][key] ?? en[key] ?? key, vars),
    [lang],
  );
  return { t, lang };
}

/**
 * The live pickup-venue word. Uses "truck" whenever a food truck is trading today,
 * otherwise "kitchen" (the home-kitchen phase). Returns localized nouns for {venue}.
 */
export function useVenue(): { type: 'kitchen' | 'truck'; noun: string; nounCap: string } {
  const { lang } = usePrefs();
  const { data: locations } = useTodayLocations();
  const hasTruck = (locations ?? []).some((l) => l.pickup_type === 'truck' && !l.is_closed);
  const type = hasTruck ? 'truck' : 'kitchen';
  const d = DICTS[lang];
  return { type, noun: type === 'truck' ? d['venue.truck'] : d['venue.kitchen'], nounCap: type === 'truck' ? d['venue.truckCap'] : d['venue.kitchenCap'] };
}
