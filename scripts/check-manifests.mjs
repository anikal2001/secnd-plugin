#!/usr/bin/env node
// Checks this package against the rules in
// https://developers.openai.com/plugins/build/plugins and
// https://developers.openai.com/plugins/deploy/submission
// Run: node scripts/check-manifests.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const fails = [];
const warns = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);
const ok = [];
const pass = (m) => ok.push(m);

const plugin = read('plugin.json');
const mcp = read('mcp.json');
const openai = plugin.extensions?.['com.openai'];

// --- portable identity -------------------------------------------------
if (plugin.$schema !== 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json') fail('plugin.json $schema is not the Agent Plugins 1.0.0 plugin schema');
else pass('plugin.json declares the Agent Plugins 1.0.0 schema');
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(plugin.name) || plugin.name.length > 64) fail(`plugin name "${plugin.name}" must be kebab-case and at most 64 characters`);
else pass(`plugin name "${plugin.name}" is kebab-case`);
for (const f of ['version', 'description', 'author', 'license']) {
  if (!plugin[f]) fail(`plugin.json is missing ${f}`);
}
if (plugin.version && plugin.license) pass('plugin.json carries version, description, author and license');

// --- fixed package paths ----------------------------------------------
if (!existsSync(join(root, 'skills'))) fail('skills/ must be at the plugin root');
else {
  const skills = readdirSync(join(root, 'skills'), { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const s of skills) {
    if (!existsSync(join(root, 'skills', s.name, 'SKILL.md'))) fail(`skills/${s.name} has no SKILL.md`);
  }
  pass(`skills/ holds ${skills.length} skills, each with a SKILL.md`);
}
if (plugin.skills) warn('plugin.json sets "skills"; portable packages discover skills from skills/ and do not need it');

// --- OpenAI interface -------------------------------------------------
const LIMITS = { displayName: 30, shortDescription: 30, longDescription: 4000, developerName: 80 };
const REQUIRED_URLS = ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL'];
if (!openai || typeof openai !== 'object') fail('plugin.json has no extensions["com.openai"] object');
else {
  const i = openai.interface ?? {};
  for (const [field, max] of Object.entries(LIMITS)) {
    const v = i[field];
    if (!v) fail(`interface.${field} is required for submission`);
    else if (v.length > max) fail(`interface.${field} is ${v.length} characters, over the ${max} limit`);
  }
  if (Object.entries(LIMITS).every(([f, m]) => i[f] && i[f].length <= m)) pass('interface display text is within every documented length limit');

  for (const u of REQUIRED_URLS) {
    const v = i[u];
    if (!v) fail(`interface.${u} is required for MCP review`);
    else if (!/^https:\/\//.test(v) || /@/.test(v)) fail(`interface.${u} must be an HTTPS URL without embedded credentials`);
  }
  if (REQUIRED_URLS.every((u) => i[u])) pass('all four listing URLs are present and HTTPS');
  if (!plugin.homepage && !plugin.author?.url) warn('neither homepage nor author.url is set');

  if (!Array.isArray(i.capabilities) || i.capabilities.length === 0) fail('interface.capabilities should list what the plugin does');
  else pass(`interface.capabilities lists ${i.capabilities.length} entries`);
  if (!Array.isArray(i.defaultPrompt) || i.defaultPrompt.length === 0) fail('interface.defaultPrompt should offer starter prompts');
  else pass(`interface.defaultPrompt offers ${i.defaultPrompt.length} prompts`);
  if (!i.brandColorDark) warn('interface.brandColorDark is unset; a dark-mode accent is worth adding');

  // Assets are required for submission but not for an unlisted install.
  for (const a of ['logo', 'composerIcon']) {
    if (!i[a]) warn(`interface.${a} is unset — required before submission (square, at least 48x48, under 5 MiB, in ./assets/)`);
  }
  if (!i.screenshots) warn('interface.screenshots is unset — at least one is required before submission');

  // Every relative path must start with ./ and resolve inside the package.
  const paths = [openai.onboardingSkill, i.logo, i.composerIcon, i.logoDark, i.composerIconDark, ...(i.screenshots ?? [])].filter(Boolean);
  for (const p of paths) {
    if (!p.startsWith('./')) fail(`path "${p}" must start with ./`);
    else if (!existsSync(join(root, p))) fail(`path "${p}" does not exist in the package`);
  }
  if (openai.onboardingSkill && existsSync(join(root, openai.onboardingSkill))) pass(`onboardingSkill points at a packaged skill (${openai.onboardingSkill})`);

  // Public-directory eligibility.
  if (openai.apps) fail('extensions["com.openai"].apps is set; a ZIP with app references cannot be submitted');
  if (openai.hooks) fail('extensions["com.openai"].hooks is set; plugins with lifecycle hooks are not eligible for the public directory');
  if (existsSync(join(root, 'hooks'))) fail('hooks/ exists; plugins with lifecycle hooks are not eligible for the public directory');
  if (existsSync(join(root, '.app.json'))) fail('.app.json exists; a ZIP with app references cannot be submitted');
  if (!openai.apps && !openai.hooks && !existsSync(join(root, 'hooks'))) pass('no apps and no lifecycle hooks, so the package stays directory-eligible');

  if (openai.publication?.translations) {
    for (const [loc, t] of Object.entries(openai.publication.translations)) {
      if (t.subtitle && t.subtitle.length > 30) fail(`publication.translations.${loc}.subtitle is over 30 characters`);
      if (t.description && t.description.length > 4000) fail(`publication.translations.${loc}.description is over 4000 characters`);
    }
  }
}

// --- portable mcp.json ------------------------------------------------
if (mcp.$schema !== 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json') fail('mcp.json $schema is not the Agent Plugins 1.0.0 mcp schema');
const servers = Object.entries(mcp.mcpServers ?? {});
if (servers.length !== 1) fail(`mcp.json declares ${servers.length} servers; only one MCP server can be connected per plugin`);
for (const [name, s] of servers) {
  if (!s.type) fail(`mcp.json server "${name}" needs a transport type; the portable format requires it`);
  if (s.type !== 'streamable-http') warn(`mcp.json server "${name}" type is "${s.type}"; public submission needs a remote HTTPS endpoint`);
  if (!/^https:\/\//.test(s.url ?? '')) fail(`mcp.json server "${name}" must use an HTTPS url`);
  const auth = s.extensions?.['com.openai']?.auth;
  if (!auth) warn(`mcp.json server "${name}" declares no auth object`);
  else {
    const MODES = ['provided', 'dcr', 'cimd'];
    if (auth.client && !MODES.includes(auth.client.mode)) fail(`auth.client.mode must be one of ${MODES.join(', ')}`);
    if (['dcr', 'cimd'].includes(auth.client?.mode) && (auth.client.clientId || auth.client.clientSecret)) fail('a dcr or cimd client object must not carry a clientId or client credentials');
    if (auth.clientSecret || auth.client?.clientSecret) fail('client secrets must never appear in the package');
    if (auth.type === 'api_key') warn('api_key auth is not supported by the submission portal connection form');
    for (const u of ['authorizationUrl', 'tokenUrl', 'registrationUrl', 'authorizationServerBase', 'oidcConfigurationUrl']) {
      if (auth[u] && (!/^https?:\/\//.test(auth[u]) || /@/.test(auth[u]) || /[?#]/.test(auth[u]))) fail(`auth.${u} must be an absolute URL without credentials, query or fragment`);
    }
    pass(`mcp.json server "${name}" declares ${auth.type} auth with client mode ${auth.client?.mode ?? 'discovery'}`);
  }
}

// --- Codex compatibility overlay --------------------------------------
if (existsSync(join(root, '.codex-plugin/plugin.json'))) {
  const codex = read('.codex-plugin/plugin.json');
  if (openai && typeof openai === 'object') {
    warn('both extensions["com.openai"] and .codex-plugin/plugin.json exist; the inline object REPLACES the overlay on current clients, so keep them in step or drop the overlay');
  }
  if (!codex.interface) fail('.codex-plugin/plugin.json needs an interface object');
  if (codex.mcpServers && !existsSync(join(root, codex.mcpServers.replace(/^\.\//, '')))) fail(`.codex-plugin mcpServers points at ${codex.mcpServers}, which is missing`);
  if (codex.skills && !existsSync(join(root, codex.skills.replace(/^\.\//, '')))) fail(`.codex-plugin skills points at ${codex.skills}, which is missing`);
  // Drift check on the fields a reviewer reads.
  const i = openai?.interface ?? {};
  const drift = Object.keys(LIMITS).concat(REQUIRED_URLS, 'category').filter((f) => JSON.stringify(codex.interface?.[f]) !== JSON.stringify(i[f]));
  if (drift.length) fail(`.codex-plugin/plugin.json interface has drifted from the root manifest: ${drift.join(', ')}`);
  else pass('.codex-plugin/plugin.json interface matches the root manifest');
  for (const f of ['name', 'version', 'description', 'license']) {
    if (JSON.stringify(codex[f]) !== JSON.stringify(plugin[f])) fail(`.codex-plugin/plugin.json ${f} does not match the root manifest`);
  }
}

// --- marketplaces -----------------------------------------------------
const marketplaces = [
  ['.agents/plugins/marketplace.json', 'codex'],
  ['.claude-plugin/marketplace.json', 'claude'],
].filter(([p]) => existsSync(join(root, p)));
for (const [path, kind] of marketplaces) {
  const m = read(path);
  if (!m.name) fail(`${path} needs a top-level name`);
  if (!Array.isArray(m.plugins) || m.plugins.length === 0) fail(`${path} lists no plugins`);
  for (const entry of m.plugins ?? []) {
    const src = entry.source;
    const srcPath = typeof src === 'string' ? src : src?.path;
    if (typeof src === 'object' && src.source === 'local' && !srcPath?.startsWith('./')) fail(`${path}: local source.path must start with ./`);
    if (srcPath && srcPath !== './' && !existsSync(join(root, srcPath))) fail(`${path}: source path ${srcPath} does not exist`);
    if (kind === 'codex') {
      for (const f of ['policy', 'category']) if (!entry[f]) fail(`${path}: entry "${entry.name}" must always include ${f}`);
      const INSTALL = ['AVAILABLE', 'INSTALLED_BY_DEFAULT', 'NOT_AVAILABLE'];
      if (entry.policy && !INSTALL.includes(entry.policy.installation)) fail(`${path}: policy.installation must be one of ${INSTALL.join(', ')}`);
      if (entry.policy && !entry.policy.authentication) fail(`${path}: entry "${entry.name}" needs policy.authentication`);
    }
  }
  pass(`${path} is a valid ${kind} marketplace with ${m.plugins?.length ?? 0} entry(ies)`);
}
if (marketplaces.length === 2) warn('this repo holds both a .agents and a .claude-plugin marketplace; the ChatGPT desktop app reads both, so the plugin can appear twice under different marketplace names');

// --- secrets ----------------------------------------------------------
const SECRET = /(sk_live|sk_test|clientSecret|client_secret|-----BEGIN|AKIA[0-9A-Z]{16})/;
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  if (d.name === '.git' || d.name === 'node_modules') return [];
  const p = join(dir, d.name);
  return d.isDirectory() ? walk(p) : [p];
});
const leaked = walk(root).filter((f) => /\.(json|md|mjs|js|txt|ya?ml)$/.test(f) && SECRET.test(readFileSync(f, 'utf8')) && !f.endsWith('check-manifests.mjs'));
if (leaked.length) fail(`possible secret material in: ${leaked.join(', ')}`);
else pass('no credential-shaped strings in the package');

// --- report -----------------------------------------------------------
for (const m of ok) console.log(`  ok    ${m}`);
for (const m of warns) console.log(`  warn  ${m}`);
for (const m of fails) console.log(`  FAIL  ${m}`);
console.log(`\n${fails.length ? 'FAILED' : 'PASSED'}: ${ok.length} ok, ${warns.length} warnings, ${fails.length} failures`);
process.exit(fails.length ? 1 : 0);
