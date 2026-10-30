---
name: bulk-list-from-spreadsheet
description: Turn a CSV or spreadsheet of items into Secnd listing drafts, attach photos by URL or local path, confirm with the seller, then publish in batches. Use when the seller has a sheet of products to list.
---

# Bulk list from a spreadsheet

Works everywhere for rows with public `image_urls`. Rows with `photo_paths` need a client with file access (see `bulk-list-from-folder`).

Read `skills/secnd-connector/SKILL.md` first if you have not this session.

## 1. Read the sheet

Accepted columns, any order, case-insensitive. Only `title` is required.

| Column | Maps to |
|---|---|
| `title` | `create_listing_draft.title` (3 to 200 chars) |
| `description` | `description` |
| `price` | `price` (number, store currency) |
| `brand`, `size`, `sku` | same names |
| `condition` | one of Secnd's condition values; leave out if the sheet uses other words and tell the seller |
| `image_urls` | `imageUrls`, split on `;` or `,`, public URLs only, max 12 |
| `photo_paths` | local files, uploaded as in `bulk-list-from-folder` steps 3 |
| `marketplaces` | used in step 4, split on `;` or `,` |

Skip rows with an empty title and list them for the seller. Cap one run at 50 rows.

Before creating anything, check for duplicates: call `get_marketplace_listings` with the sheet's `skus` (one call, all SKUs). Any SKU that resolves already exists; do not create it again, list it as "already in Secnd".

## 2. Create drafts

One `run_batch` per 25 rows of `create_listing_draft` calls with `id` = row number. Pass `imageUrls` for rows that have them. Collect `productId` per row.

## 3. Local photos

For rows with `photo_paths`, follow `bulk-list-from-folder` step 3 (`request_photo_uploads`, multipart POST, `attach_uploaded_photos`).

## 4. Confirm, then publish

Show a table: row, title, price, photos, Secnd link. Ask for the marketplaces (use the sheet's `marketplaces` column as the proposal) and wait for an explicit yes. Then `submit_listing` in batches of at most 25 `productIds`, poll `get_listing_results` with `waitSeconds: 25` until no item is `pending`, and report per row and marketplace with `error.fix` on failures.
