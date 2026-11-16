# MIVO Website V2 — Cloudflare Pages

## What works now
- Cinematic landing page and MIVO assets carried over from the deployed prototype.
- Responsive gallery: 2 columns mobile, 3 tablet, 4 desktop; rarity-separated Common/Rare/Legendary/Mythic.
- Rotating rarity borders, NFT details modal, search, favorites stored locally, direct OpenSea links.
- No invented NFTs, prices, sales, or promotions. Planned supply is clearly separate from live OpenSea data.
- Real OpenSea collection NFT feed via Cloudflare Pages Function, with server-side API key.
- Manually curated Coming Soon, announcements, promotions and official links in `site-config.json`.

## Deploy (replace current GitHub files)
Upload **the contents** of this folder to the root of `mivo-website` GitHub repository, preserving the `assets/` and `functions/api/` directories. Cloudflare Pages settings: framework None, build command blank, output directory `.`. The existing Pages deployment should redeploy automatically on `main` changes.

## Connect OpenSea
1. Mint/create the official OpenSea collection and get its **collection slug** (not profile name).
2. Edit `site-config.json`: set `collectionSlug` and `openseaCollectionUrl` (plus the verified X URL).
3. In Cloudflare Pages project Settings > Variables and Secrets, set `COLLECTION_SLUG` to the same slug, and add secret `OPEN_SEA_API_KEY` with your OpenSea API key. Never put the API key in GitHub or in site-config.json.
4. Redeploy. The API returns NFTs only from this one configured collection.

### IMPORTANT LIMITATIONS
- This version uses the collection NFT endpoint, which may not return trait attributes for every NFT; rarity depends on NFT metadata availability. Verify against the collection after connection.
- **Listing prices, accurate total active listings, and auction counts are NOT connected yet.** They show "—" or "Price not verified" and must not be interpreted as sold. The marketplace listing integration must be added and tested against the real collection before launch. (Current cards should not be marketed as complete sale availability.)
- Browser notification button only requests permission; true background push requires a server-side subscription system and is not yet live.
- This package **does not include a secure web admin login**. Editing `site-config.json` via the owner's GitHub account is the current publishing mechanism. Do not publish a fake admin password or client-side-only authentication. A secure admin dashboard requires an authenticated backend and permissions.
- Favorite NFTs are saved only on the visitor's device/browser.
- Roadmap planned percentages are not OpenSea rarity ranks or minted percentages.

## Edit site-config.json
- `drop.enabled`: true to show official drop details. Set `date` in ISO format with timezone, e.g. `2027-01-15T18:00:00Z`.
- `announcements`: array of `{ "title": "...", "description": "...", "published": true }`.
- `promotions`: array of `{ "title": "...", "description": "...", "url": "https://...", "active": true, "endDate": "2027-01-01T00:00:00Z" }`.
- Only use promotions you have actually announced and can honor. The website cannot change OpenSea prices.

## Launch checklist
[ ] Confirm official collection slug and Polygon network
[ ] Confirm NFT rarity trait in metadata
[ ] Connect and test listing/auction API and correct prices
[ ] Build secure admin with authentication and database permissions
[ ] Connect background push notifications with opt-in and unsubscribe
[ ] Replace placeholder/unknown official social URLs only with verified URLs
[ ] Test on Android/iOS, desktop and slow connections
