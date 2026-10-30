---
name: bulk-list-from-folder
description: Desktop only. Turn a folder of product photos (optionally with a notes.csv) into Secnd listing drafts, upload the photos, confirm a table with the seller, then publish in batches. Use when the seller points at a local folder of photos and wants them listed.
---

# Bulk list from a photo folder

Needs a client that can read local files and make HTTPS requests (Claude Code, Codex, Cowork, Claude Desktop with file access). ChatGPT web and claude.ai web cannot run this; there, ask the seller to add photos on the product page or give public URLs.

Read `skills/secnd-connector/SKILL.md` first if you have not this session.

## 1. Read the folder

- List image files: `.jpg .jpeg .png .webp .heic .heif`. Ignore everything else.
- Group photos into items. One item per subfolder if there are subfolders. Otherwise group by filename prefix before the last `-` or `_` (`jacket-1.jpg`, `jacket-2.jpg` is one item). If no pattern exists, each photo is its own item. Show the grouping to the seller before creating anything.
- If `notes.csv` (or any single `.csv`) is present, join it by `folder` or `filename_prefix` column to get `title, price, brand, size, condition, sku, description`. Missing columns are fine.
- Cap one run at 50 items. For more, run again on the remainder.

## 2. Create drafts (additive, no confirmation needed)

Use one `run_batch` per 25 items with `create_listing_draft` calls. Give each call `id` = the item key. Fill `title` from the CSV, else from the folder or file name made readable. Do not pass `imageUrls`. Collect `productId` per item from `results[].result.productId`.

If a call fails with `AGENT_ACTION_NOT_ALLOWED`, stop and relay `error.fix`: the seller has to allow drafts at https://www.secnd.ca/agents.

## 3. Upload photos

For each item, in a `run_batch` of up to 25 `request_photo_uploads` calls:

```json
{ "tool": "request_photo_uploads", "id": "<item>", "arguments": { "productId": "<productId>", "files": [ { "filename": "IMG_1.jpg", "contentType": "image/jpeg", "size": 183422 } ] } }
```

`contentType` must be the real type (`image/jpeg`, `image/png`, `image/webp`, `image/heic`), `size` the exact byte count, at most 12 files per product and 20 MB each. Each slot expires in 5 minutes, so request slots for a batch and upload them right away.

Upload every slot with a multipart POST, all `fields` first, then the file as the last part named `file`:

```bash
curl -sS -o /dev/null -w "%{http_code}" "<slot.url>" \
  -F "Content-Type=image/jpeg" -F "acl=<fields.acl>" -F "tagging=<fields.tagging>" -F "bucket=<fields.bucket>" \
  -F "X-Amz-Algorithm=<...>" -F "X-Amz-Credential=<...>" -F "X-Amz-Date=<...>" -F "key=<fields.key>" \
  -F "Policy=<fields.Policy>" -F "X-Amz-Signature=<...>" \
  -F "file=@/path/IMG_1.jpg;type=image/jpeg"
```

Send every key in `fields` exactly as given. Success is HTTP `204`. On any other status request a fresh slot for that file and try once more; after that, mark the photo failed and continue.

Then attach, in a `run_batch` of `attach_uploaded_photos` calls with the `uploadKeys` that returned 204, cover photo first. Read `attached` and `failed` per key. `UPLOAD_NOT_FOUND` means the upload did not land: request a new slot and repeat. Calling attach again with the same keys is safe.

## 4. Confirm before publishing

Show a table: item, title, price, photos attached, Secnd link (`secndUrl`). Ask which marketplaces to publish to and wait for an explicit yes. Items with no photos or no price stay drafts; say so.

## 5. Publish

Call `submit_listing` with at most 25 `productIds` per call and the confirmed `marketplaces`. Then poll `get_listing_results` with the `jobId` and `waitSeconds: 25` until nothing is `pending`. Report listed items with their URLs and failed items with `error.fix`. Do not re-submit a failed item without the seller's say-so.
