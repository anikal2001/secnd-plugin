# Secnd plugin

Secnd is the inventory and cross-listing system for resellers. This repo packages the Secnd MCP server (`https://mcp.secnd.ca/`) as a plugin for ChatGPT, Claude, Claude Code and Codex, with skills for bulk listing from a photo folder or a spreadsheet and for bulk edits.

Every tool runs as the signed-in seller on that seller's own account. What an agent may do (draft, publish, edit, remove) and the daily limits are set by the seller at https://www.secnd.ca/agents. Publishing, price changes, delists and sold marks are dry runs by default and need the seller's confirmation.

## Install

**ChatGPT**: Plugins, then the plus button, then "Add custom MCP server". URL `https://mcp.secnd.ca/`, authentication OAuth. Accept the warning and choose "Create as a plugin". Sign in to Secnd when prompted.

**Claude (web and desktop)**: Customize, then Plugins, then "Add marketplace", paste `https://github.com/anikal2001/secnd-plugin`, install **Secnd**. Or add it as a plain connector: Customize, Connectors, Add, Custom, URL `https://mcp.secnd.ca/`.

**Claude Code**:

```bash
claude mcp add --transport http secnd https://mcp.secnd.ca/
# or, for the skills as well:
git clone https://github.com/anikal2001/secnd-plugin && claude --plugin-dir ./secnd-plugin
```

**Codex**:

```bash
codex plugin marketplace add anikal2001/secnd-plugin
```

## What runs where

| Surface | Connector tools | Bulk list from a photo folder | Bulk list from a spreadsheet | Bulk edit from a spreadsheet |
|---|---|---|---|---|
| ChatGPT web | yes | no (no file access) | rows with public image URLs | yes |
| Claude web | yes | no (no file access) | rows with public image URLs | yes |
| Claude Desktop / Cowork | yes | yes | yes | yes |
| Claude Code | yes | yes | yes | yes |
| Codex | yes | yes | yes | yes |

Local photos never pass through the chat. The agent asks Secnd for a 5-minute single-use upload slot per file, POSTs the file straight to storage, then asks Secnd to attach it. Slots are only issued for products the seller owns, and a key for a different product is refused.

## Layout

```
plugin.json                      portable manifest (ChatGPT / agent-plugins 1.0.0)
mcp.json                         ChatGPT MCP server entry (streamable-http + OAuth)
.mcp.json                        Claude / Codex MCP server entry
.claude-plugin/plugin.json       Claude plugin manifest
.claude-plugin/marketplace.json  Claude marketplace (install from this repo URL)
.codex-plugin/plugin.json        Codex plugin manifest
.agents/plugins/marketplace.json Codex marketplace
skills/                          secnd-connector, bulk-list-from-folder, bulk-list-from-spreadsheet, bulk-edit-from-spreadsheet
docs/submission-checklist.md     what is still needed to list in the ChatGPT and Claude directories
```

No secrets live in this repo. OAuth is handled by Secnd's login; the plugin files only carry the server URL.

## Support

https://www.secnd.ca/support
