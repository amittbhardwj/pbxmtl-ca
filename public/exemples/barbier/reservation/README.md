# Barbier — réservation + Stripe (démo PBX MTL)

Static booking flow for the fictional barbershop example on **pbxmtl.ca**.

Target path on the site: `public/exemples/barbier/reservation/`  
(copy the contents of this folder there; keep `en/` as a subfolder).

## Demo mode (default)

Open `index.html` locally (or via any static server). No API keys required.

1. Choose service → barber → date → time → customer details  
2. Click **Simuler le paiement (démo)**  
3. Confirmation shows a fake `pi_demo_*` payment id and a `PBX-********` reference  

**No real card is ever charged** in this mode.

Banner: *Mode démo — site fictif PBX MTL. Pas une vraie boutique.*

## Enable Stripe.js UI (publishable test key only)

Still **no live charge** until you add a serverless PaymentIntent endpoint.

1. Create a [Stripe test mode](https://dashboard.stripe.com/test/apikeys) publishable key (`pk_test_…`).  
2. **Never commit** the secret key (`sk_test_…`).  
3. Before `booking.js`, set:

```html
<script>
  window.PBX_STRIPE_PUBLISHABLE_KEY = "pk_test_REPLACE_ME";
</script>
<script src="booking.js" defer></script>
```

Or inject the same global from your build / Netlify snippet / GitHub Pages layout.

When the key is present, the payment step loads Stripe.js and shows a clear **demo confirm** button (Payment Element needs a `client_secret` from your server).

## Live test charges (optional serverless)

To collect real **test** deposits you need a tiny backend that creates a PaymentIntent with your **secret** key (env var only).

### Example — Node (Express / Netlify Function style)

```js
// create-payment-intent.js  (server only — secret in env)
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // sk_test_…

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const { amountCents, currency = "cad", metadata = {} } = JSON.parse(event.body || "{}");
  // amountCents = deposit * 100 (e.g. 1000 for 10 CAD)
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    automatic_payment_methods: { enabled: true },
    metadata,
  });
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientSecret: intent.client_secret }),
  };
};
```

### Wire-up sketch (front-end)

```js
const res = await fetch("/.netlify/functions/create-payment-intent", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    amountCents: selectedService.deposit * 100,
    metadata: { ref: bookingRef, service: selectedService.id },
  }),
});
const { clientSecret } = await res.json();
const stripe = Stripe(window.PBX_STRIPE_PUBLISHABLE_KEY);
const elements = stripe.elements({ clientSecret });
elements.create("payment").mount("#payment-element");
// later: await stripe.confirmPayment({ elements, confirmParams: { return_url } });
```

This demo ships **without** that endpoint on purpose so GitHub Pages stays static and secret-free.

## Services (CAD)

| Service        | Price | Duration | Deposit |
|----------------|------:|---------:|--------:|
| Coupe          | 35$   | 30 min   | 10$     |
| Barbe          | 25$   | 20 min   | 10$     |
| Coupe + barbe  | 55$   | 45 min   | 15$     |

Barbers: Alex, Sam, Jordan (fictional).  
Slots: next Tue–Sat style days, 10:00–18:00 every 30 minutes (some marked taken).

## Files

| File | Role |
|------|------|
| `index.html` | FR-CA booking UI |
| `en/index.html` | English twin |
| `booking.js` | Step logic + demo / Stripe publishable key detection |
| `booking.css` | Dark wood / cream / brass theme (`theme-barber` / `ind-page`) |
| `README.md` | This file |

## Smoke test

```bash
# From this folder (or after copy into public/exemples/barbier/reservation/)
python3 -m http.server 8765
# Open http://127.0.0.1:8765/
# Complete: Coupe → Alex → date → time → name/email/phone → Simuler le paiement
# Expect confirmation with PBX-… ref and pi_demo_… id, no console errors
```

Or open `index.html` via `file://` — works for demo mode (Stripe.js CDN needs network if you set a `pk_test_` key).

## Security

- No secrets in this repo.  
- Publishable `pk_test_` keys are public by design; still prefer injecting them at deploy time.  
- Secret keys only in serverless env vars.
