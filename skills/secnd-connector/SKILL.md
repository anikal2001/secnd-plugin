---
name: secnd-connector
description: How to work with the Secnd MCP connector. Read this before the first Secnd tool call in a session, when a tool is refused, or when the seller asks what Secnd can do.
---

# Secnd connector

Secnd is a reseller's inventory and cross-listing system. Every tool runs as the signed-in seller, on that seller's own catalog and connected marketplaces. There is no way to read or touch another seller's data.

## Sign-in

The server is `https://mcp.secnd.ca/`. It uses OAuth through Secnd's login (Clerk). The first call prompts the seller to sign in; nothing else is needed. If a call returns an authentication error, tell the seller to reconnect the Secnd plugin in their client's settings.

## What agents may do

The seller decides at https://www.secnd.ca/agents which levels an agent may use (draft, publish, edit, remove) and the daily limit for each. A refused call returns `error.code` of `AGENT_ACTION_NOT_ALLOWED` or `AGENT_DAILY_CAP_REACHED` and an `error.fix` that says what to ask the seller. Relay that message. Do not retry a refused call.

## Rules that never bend

1. `delist_listings`, `mark_sold`, `update_prices` and `bulk_update_listings` are dry runs by default. Call them once, show the seller the plan the tool returns, and only after an explicit yes call again with `dryRun: false`.
2. `submit_listing` publishes live listings on external marketplaces. Before calling it, show the products and the marketplaces and wait for an explicit yes.
3. Never invent product ids. Get them from `query_data`, `get_marketplace_listings`, `search`, or the result of `create_listing_draft`.
4. Rate limit: 60 requests per minute per connection. For many items use `run_batch`.

## Which tool

| Need | Tool |
|---|---|
| Find products, orders, customers; counts and totals | `query_data` (entity, search, filters, mode list/count/summary) |
| Quick catalog or help search with links | `search` then `fetch` |
| Where is an item listed, is it still live | `get_marketplace_listings` (skus / titles / productIds, `verifyLive`) |
| Price an item | `suggest_pricing` |
| Create a draft | `create_listing_draft` (public image URLs in `imageUrls`) |
| Photos that are local files | `request_photo_uploads` then upload then `attach_uploaded_photos` |
| Publish | `submit_listing` then `get_listing_results` |
| Change prices | `update_prices` (dry run first) |
| End listings | `delist_listings` (dry run first) then `get_delist_results` |
| Sold elsewhere | `mark_sold` (dry run first) then `get_delist_results` |
| Several reads or draft steps at once | `run_batch` |
| Slow sellers, sell-through | `get_slow_movers`, `get_sell_through` |
| Secnd help | `lookup_help` or `search` |

## run_batch

`run_batch` takes an ordered list of up to 25 calls, each `{ tool, arguments, id? }`, and runs them in one round trip. Only reads and additive catalog writes are allowed: `create_listing_draft`, `request_photo_uploads`, `attach_uploaded_photos`, `query_data`, `suggest_pricing`, `find_duplicate_products`, `get_listing_results`, `get_delist_results`, `get_background_job`, `search`, `fetch`. Anything that publishes, edits or removes is rejected at validation. Each call is still checked against the seller's agent settings and logged on its own. Set `stopOnError: true` when later calls depend on earlier ones. The result has `results[]` in call order with `ok`, `result` and your `id`, plus `counts`.

## Reporting

After a job, report per product and marketplace what happened and quote `error.fix` for failures. A failure that says `needsComputer` must be done by the seller on a computer (reconnecting a browser-login marketplace); give them the link.
