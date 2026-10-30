---
name: bulk-edit-from-spreadsheet
description: Apply a CSV of price changes, delists or sold marks to existing Secnd stock. Always dry-runs first, shows the diff, and applies only after the seller confirms. Use when the seller has a sheet of SKUs or product ids with changes.
---

# Bulk edit from a spreadsheet

Read `skills/secnd-connector/SKILL.md` first if you have not this session.

## 1. Read the sheet

Columns, case-insensitive. One of `product_id` or `sku` is required per row.

| Column | Meaning |
|---|---|
| `product_id` | Secnd product id (UUID) |
| `sku` | resolved to a product id with `get_marketplace_listings` (`skus`, one call for the whole sheet) |
| `new_price` | number, store currency |
| `action` | `delist`, `sold`, or empty |
| `marketplaces` | for `delist`: only these marketplaces, split on `;` or `,` |
| `sale_source`, `sale_price` | for `sold`: where it sold and for how much |

Rows whose SKU does not resolve go in an "unmatched" list for the seller. Cap one run at 100 rows.

## 2. Dry run everything

Group rows by what they do and call each tool once with `dryRun` left at its default (true):

- Price rows: `update_prices` with `changes: [{ productId, price }]` (max 100).
- Delist rows: `delist_listings` with `productIds` and optional `marketplaces`.
- Sold rows: `mark_sold` with `productIds`, `saleSource` and `salePrices`.

Show the seller the plan the tools return: current vs new price and % change, which live listings would end, and every warning (a price drop over 50%, a product with no live listing, a marketplace that needs reconnecting). Rows refused with `AGENT_ACTION_NOT_ALLOWED` or `AGENT_DAILY_CAP_REACHED` are listed with `error.fix`; the seller changes that at https://www.secnd.ca/agents.

## 3. Apply only after an explicit yes

Repeat the same calls with `dryRun: false`. Do not change the row set between the dry run and the apply; if the seller removes rows, dry-run again. Then poll `get_listing_results` (price pushes) and `get_delist_results` (delists and sold marks) with `waitSeconds: 25` until nothing is `pending`.

## 4. Report

Per row: done, failed with `error.fix`, or skipped. A failure with `needsComputer` must be done by the seller on a computer; give the link. Never re-apply a failed row on your own.
