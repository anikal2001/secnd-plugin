# Directory submission checklist

State on 2026-10-30: the server and this package work as an unlisted install on both platforms. Nothing has been submitted. Items marked **owed** are not done.

Run `node scripts/check-manifests.mjs` before any submission. It encodes the packaging and submission rules: schema ids, kebab-case name, the four required HTTPS listing URLs, the display-text limits (displayName 30, shortDescription 30, longDescription 4000, developerName 80), `./`-prefixed paths that must exist, one MCP server per plugin, no client secrets, no `apps` or lifecycle hooks, marketplace `policy` and `category`, and drift between the root manifest and the Codex overlay.

## Verified locally on 2026-10-30

- `node scripts/check-manifests.mjs`: 0 failures. The remaining warnings are the three owed assets plus two documented facts below.
- `claude plugin validate .`: passed.
- `codex plugin marketplace add anikal2001/secnd-plugin` then `codex plugin list`: the marketplace resolved from GitHub shorthand and the entry `secnd@secnd-plugins` resolved to the package root. Codex silently skips entries it cannot resolve, so this check matters.
- `codex plugin add secnd@secnd-plugins` on Codex CLI 0.148.0: installed as version 0.2.0 with all four skills and `mcp.json` carried into `~/.codex/plugins/cache/`. Codex copied the portable root files and ignored `.codex-plugin`, `.agents` and `.claude-plugin`, which confirms the precedence note below. Both the plugin and the marketplace were removed again after the check.
- Skill text states that explicit user instructions outrank skill guidance, which the instruction-following guidance asks for. The validator fails if a skill drops that line.

## Two things to know about this layout

- **The root manifest wins.** Because `plugin.json` has an `extensions.com.openai` object, that object *replaces* `.codex-plugin/plugin.json` on current clients; the two are never merged. The overlay is kept only for older Codex clients. Edit both or neither; the validator fails on drift.
- **Two marketplace files.** `.agents/plugins/marketplace.json` serves Codex and `.claude-plugin/marketplace.json` serves Claude. The ChatGPT desktop app reads both paths, so the plugin may appear under two marketplace names there. Harmless, but do not "fix" it by deleting one.

## Server side (secnd-backend)

- [x] Every tool has a `title` and `readOnlyHint` / `destructiveHint` / `idempotentHint` / `openWorldHint` that match behaviour (PR SecndInc/secnd-backend#2133).
- [x] `search` and `fetch` tools in the ChatGPT shape with `structuredContent` and non-empty `url` on every result.
- [x] `GET https://mcp.secnd.ca/.well-known/openai-apps-challenge` serves the plain-text token from `OPENAI_APPS_CHALLENGE_TOKEN` (404 while unset).
- [x] `/.well-known/oauth-protected-resource` lists `scopes_supported`.
- [x] Prod Clerk advertises CIMD and requires PKCE (applied 2026-11-01). Before: `pkce_required: false`, `client_id_metadata_documents_advertised: false`. After: both `true`, with `dynamic_oauth_client_registration` still `true` as the fallback. `https://clerk.secnd.ca/.well-known/oauth-authorization-server` now reports `client_id_metadata_document_supported: true`. To roll back:
  `npx clerk@latest api instance/oauth_application_settings -X PATCH -d '{"client_id_metadata_documents_advertised":false,"pkce_required":false}'` with the prod secret key, which lives in the Elastic Beanstalk environment `Secnd-backend-env` as `CLERK_SECRET_KEY`.
- [ ] **owed** Decide on audience (`aud`) enforcement for Clerk tokens before public listing.

## OpenAI (ChatGPT plugin directory)

1. [ ] **owed** Complete business verification in the OpenAI organization settings. The submitter must be an org owner or have "Apps Management Write".
2. [x] Assets under `assets/`, wired into both manifests and checked by the validator for squareness, the 48x48 floor and the 5 MiB cap:
   - `logo.png` 1024x1024 and `composer-icon.png` 256x256, rendered from `assets/icon.svg`, which composes the real Secnd mark from `secnd-mobile/apps/mobile/assets/icons/icon2.svg` on the brand purple `#6333A3`. The brand colour was previously a placeholder `#111111` in these manifests and is now the real one.
   - `screenshot-products.png`, the Products page screenshot Secnd already publishes at `https://www.secnd.ca/images/secnd-inventory-products-page.png`. It shows a demo account, not seller data.
   - Optional `logoDark` / `composerIconDark` are left out: the purple mark reads on both themes and the brand defines no dark variant.
   - Before submitting, consider replacing the screenshot with one of the plugin working inside ChatGPT, which is what the directory shows. A product screenshot is accurate but does not show the plugin.
3. [ ] **owed** `extensions.com.openai.review` in `plugin.json`: exactly 5 positive cases (`description`, `prompt`, `tools_triggered`, `expected_behavior`) and 3 negative cases, run against the test account first. Proposed set:
   - positive: "Which of my products are not on Poshmark?" (`query_data`, `get_marketplace_listings`); "Draft a listing for a vintage Levi's jacket at $45" (`create_listing_draft`); "What should I price this at?" (`suggest_pricing`); "Show my slow movers" (`get_slow_movers`); "Find my notes on shipping in Secnd help" (`search`, `fetch`).
   - negative: "Delete my Secnd account"; "List this on a marketplace I have not connected"; "Show me another seller's inventory".
4. [ ] **owed** `review.demo_recording_url`: a reviewer-accessible video walkthrough.
5. [x] A dedicated Secnd test account exists on **production**, created 2026-11-02 — see "Reviewer account" below. Usable without MFA, email or SMS codes or magic links. The password goes in the dashboard form, **never in this repo or the ZIP**.
6. [ ] **owed** Set `OPENAI_APPS_CHALLENGE_TOKEN` on Render (service `secnd-backend-prod`) to the token the portal issues, redeploy, confirm `curl https://mcp.secnd.ca/.well-known/openai-apps-challenge` returns only the token.
7. [ ] Listing text limits: `displayName` 30, `shortDescription` 30, `longDescription` 4000, `developerName` 80. Current values fit.
8. [x] All four URLs are HTTPS and reachable **without signing in**: website, support (`/contact`), privacy (`/privacy-policy`), terms (`/terms-of-service`). The manifests previously pointed at `/support`, `/privacy` and `/terms`, which are behind the sign-in wall: each returned 200 only because the wall redirects to `/sign-in?redirect=…`, which is itself a 200 page, so a reviewer clicking the privacy policy got a login form. The validator now fetches each URL, follows redirects and fails when the final URL looks like a sign-in page. `SKIP_URL_CHECK=1` runs it offline.
9. [ ] Build the ZIP from this repo root (no `apps`, no hooks, no secrets) and upload it via "Upload new or existing plugin". Submit the remote HTTPS endpoint through **With MCP**. Reviewer credentials and instructions go in the dashboard form, never in the ZIP, which rejects `test_credentials` and `reviewer_instructions`.
10. [ ] Only one review can be active per plugin; wait for the verdict before re-submitting.
11. [x] CIMD is enabled on prod Clerk, so `mcp.json` auth is now `"client": { "mode": "cimd" }`. CIMD does not disable the DCR fallback. `registrationUrl` is deliberately omitted because Clerk's discovery document already advertises `https://clerk.secnd.ca/oauth/register`.

## Anthropic (Claude connector directory)

1. [ ] **owed** Submit at https://claude.ai/directory/manage, "Submit new", type MCP connector, URL `https://mcp.secnd.ca/`.
2. [x] Test credentials for a populated Secnd account (same account as above). Agent permissions are already set on it, so no tool refuses for lack of permission except by design — see "Reviewer account".
3. [x] Public docs for the connector: this repo's README and skills.
4. [x] Every tool has a title; destructive tools are marked and confirm before acting.
5. [ ] **owed** Privacy policy and terms reviewed for connector use (they exist; confirm they cover third-party AI clients).

## Reviewer account

Created 2026-11-02 on the production Clerk instance via the Backend API, so the email
address came back already verified and a reviewer never sees a verification step.

| | |
|---|---|
| Email | `anikal2001+claude-review@gmail.com` |
| Password | **not recorded here** — it lives only in the two submission forms |
| Clerk user | `user_3LYdgBhTS7MQtLpmJFOdPLDfdSL` |
| Secnd user | `9ce6304b-a54b-41f8-9e1f-0abb619c5f46` |
| Catalog | 22 products, 72 images, copied from the internal `test@gmail.com` account |
| Subscription | free / free. No tier gate on the listing tools, so this is enough |
| Agent policy | `read, draft, publish, edit, remove` with caps 200 / 500 / 500 / 10 |

Verified on 2026-11-02:

- `POST https://clerk.secnd.ca/v1/client/sign_ins` with email + password returns
  `status: complete`, `second_factor: none`. Password sign-in is enabled instance-wide
  and `sign_in.second_factor.required` is false, so a reviewer can sign in unattended.
- `GET https://backend.secnd.ca/api/products/all` with that account's session returns
  all 22 products with 5-8 images each.
- `GET https://backend.secnd.ca/api/agent-access` returns the policy above with
  `customized: true`.

Two things a reviewer will hit, both deliberate:

- **No marketplace is connected.** eBay's `isSandbox` is hardcoded `false`
  (`ebay.client.ts:46`), Etsy and Square have no sandbox host, and the browser-session
  marketplaces need a real human login, so the only reviewer-safe option was a Shopify
  development store and we chose not to use one. `submit_listing` therefore fails with
  "no connected marketplace". Everything else works, including all three
  `defaultPrompt` prompts. The test instructions say so explicitly so it is not filed
  as a bug.
- **`remove` is capped at 10/day.** `delist_listings` and `mark_sold` work but stop
  after 10 items in a rolling 24 hours. The default policy excludes `remove`
  altogether; it was granted for review so the tools demonstrate rather than refuse.

Earlier drafts of this checklist claimed a reviewer would hit a permission error on
every write tool unless permissions were pre-granted. That was wrong:
`DEFAULT_AGENT_ACCESS_POLICY` (`src/types/agent-access.ts`) already allows
`read, draft, publish, edit` for a seller who never set a policy. Only `remove`
needed granting.

## Unlisted install today

- ChatGPT: Plugins, plus, "Add custom MCP server", `https://mcp.secnd.ca/`, OAuth, "Create as a plugin".
- Claude: Customize, Plugins, "Add marketplace", `https://github.com/anikal2001/secnd-plugin`.
- Claude Code: `claude mcp add --transport http secnd https://mcp.secnd.ca/`.
- Codex: `codex plugin marketplace add anikal2001/secnd-plugin`.
