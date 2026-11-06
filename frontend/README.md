# SULTANÉ storefront + owner dashboard

React 19 + TypeScript + Tailwind 4 + Vite. Talks only to the API in `../backend`.

```bash
npm install
cp .env.example .env     # VITE_API_URL (default http://localhost:4000/api; use /api when served by the API)
npm run dev
npm run build            # type-check + production build to dist/
```

## Storefront routes

`/` home · `/necklaces` `/earrings` `/bracelets` `/rings` · `/mens[/chains|/rings|/bracelets]` · `/collections[/:slug]` · `/premium` · `/shop?q=` (search) · `/product/:slug` · `/customize/:slug` · `/custom-jewellery` · `/cart` · `/checkout` · `/order/:ref` · `/track-order` · `/account` · `/verify[/:code]` (QR target) · `/about` `/contact` `/faq` `/care` `/policies/:slug`

## Owner dashboard (`/admin`)

Overview (reports) · Orders & payments (receipt viewer, verify/flag, status workflow, courier, WhatsApp templates, loyalty) · Custom requests (reference images, quotes, convert to order) · Products (add/edit/publish/pause, photos, collections, gemstones, testing) · Article registry (corrections, printable QR authenticity cards) · Promotions & rewards · Site settings (WhatsApp, bank details, delivery & testing fees, hero video, collections, story, FAQs, policies, password).

The dashboard is code-split, so shoppers never download it. Admin sessions are kept in `sessionStorage` and end when the tab closes.

## Notes

- All totals shown in the bag and checkout come from the server's `/orders/quote`; the bag itself persists in `localStorage`.
- Until the owner uploads photographs, products show an on-brand placeholder — never stock imagery.
- WhatsApp links use the number from settings everywhere (floating button, contact, enquiries, receipts).
