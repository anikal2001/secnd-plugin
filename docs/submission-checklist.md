# Directory submission checklist

State on 2026-10-30: the server and this package work as an unlisted install on both platforms. Nothing has been submitted. Items marked **owed** are not done.

## Server side (secnd-backend)

- [x] Every tool has a `title` and `readOnlyHint` / `destructiveHint` / `idempotentHint` / `openWorldHint` that match behaviour (PR SecndInc/secnd-backend#2133).
- [x] `search` and `fetch` tools in the ChatGPT shape with `structuredContent` and non-empty `url` on every result.
- [x] `GET https://mcp.secnd.ca/.well-known/openai-apps-challenge` serves the plain-text token from `OPENAI_APPS_CHALLENGE_TOKEN` (404 while unset).
- [x] `/.well-known/oauth-protected-resource` lists `scopes_supported`.
- [ ] **owed** Prod Clerk: advertise CIMD and require PKCE, so ChatGPT and Claude use their published client ids instead of a DCR client per seller:
  `npx clerk@latest api instance/oauth_application_settings -X PATCH -d '{"client_id_metadata_documents_advertised":true,"pkce_required":true}'` with the prod secret key.
- [ ] **owed** Decide on audience (`aud`) enforcement for Clerk tokens before public listing.

## OpenAI (ChatGPT plugin directory)

1. [ ] **owed** Complete business verification in the OpenAI organization settings. The submitter must be an org owner or have "Apps Management Write".
2. [ ] **owed** Assets under `assets/`: `logo`, `composerIcon` (square, at least 48x48, PNG/JPEG/WebP/SVG, under 5 MiB) and at least one screenshot. Add them to `extensions.com.openai.interface` in `plugin.json` and to `.codex-plugin/plugin.json`.
3. [ ] **owed** `extensions.com.openai.review` in `plugin.json`: exactly 5 positive cases (`description`, `prompt`, `tools_triggered`, `expected_behavior`) and 3 negative cases, run against the test account first. Proposed set:
   - positive: "Which of my products are not on Poshmark?" (`query_data`, `get_marketplace_listings`); "Draft a listing for a vintage Levi's jacket at $45" (`create_listing_draft`); "What should I price this at?" (`suggest_pricing`); "Show my slow movers" (`get_slow_movers`); "Find my notes on shipping in Secnd help" (`search`, `fetch`).
   - negative: "Delete my Secnd account"; "List this on a marketplace I have not connected"; "Show me another seller's inventory".
4. [ ] **owed** `review.demo_recording_url`: a reviewer-accessible video walkthrough.
5. [ ] **owed** A dedicated Secnd test account with a populated catalog and at least one connected sandbox marketplace, usable without MFA, email or SMS codes or magic links. Enter it in the dashboard form, never in the ZIP.
6. [ ] **owed** Set `OPENAI_APPS_CHALLENGE_TOKEN` on Render (service `secnd-backend-prod`) to the token the portal issues, redeploy, confirm `curl https://mcp.secnd.ca/.well-known/openai-apps-challenge` returns only the token.
7. [ ] Listing text limits: `displayName` 30, `shortDescription` 30, `longDescription` 4000, `developerName` 80. Current values fit.
8. [ ] All four URLs are HTTPS and live: website, support, privacy, terms (all return 200 today).
9. [ ] Build the ZIP from this repo root (no `apps`, no hooks, no secrets) and upload it via "Upload new or existing plugin".
10. [ ] Only one review can be active per plugin; wait for the verdict before re-submitting.

## Anthropic (Claude connector directory)

1. [ ] **owed** Submit at https://claude.ai/directory/manage, "Submit new", type MCP connector, URL `https://mcp.secnd.ca/`.
2. [ ] **owed** Test credentials for a populated Secnd account (same account as above), with notes on which tools need which agent permissions at secnd.ca/agents.
3. [x] Public docs for the connector: this repo's README and skills.
4. [x] Every tool has a title; destructive tools are marked and confirm before acting.
5. [ ] **owed** Privacy policy and terms reviewed for connector use (they exist; confirm they cover third-party AI clients).

## Unlisted install today

- ChatGPT: Plugins, plus, "Add custom MCP server", `https://mcp.secnd.ca/`, OAuth, "Create as a plugin".
- Claude: Customize, Plugins, "Add marketplace", `https://github.com/anikal2001/secnd-plugin`.
- Claude Code: `claude mcp add --transport http secnd https://mcp.secnd.ca/`.
- Codex: `codex plugin marketplace add anikal2001/secnd-plugin`.
