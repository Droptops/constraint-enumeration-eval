# Security Policy

This repository includes evaluation harnesses that may use external model APIs. Credentials must remain local and outside version control.

## Reporting

Do not place API keys, private URLs, private transcripts, proprietary data, or exploit details in a public issue. Use GitHub private vulnerability reporting when available. If it is unavailable, open a minimal issue without sensitive details and request a private channel.

## Sensitive material

Do not commit populated environment files, API keys, private keys, model-provider session links, customer data, or internal-only research artifacts. A fixture used in a public benchmark should be synthetic, public, or explicitly redistributable.

If sensitive material is accidentally committed, treat deletion from the working tree as insufficient: rotate/revoke the credential or link where possible and evaluate whether Git history and merged pull-request refs also require remediation.

## Node.js runtime requirement

For CVE-2026-111497, use Node 22.23.4 or later within 22.x, 24.22.1 or later within 24.x, or 26.12.1 or later within 26.x. Other major versions and prereleases are not accepted by the runtime check. The default development/CI pin is 22.23.4. See the [official Node.js security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).

Both package manifests and lockfiles use branch-specific version ranges, and `.npmrc` enables engine enforcement. Next.js startup and the outbound HTTP clients also check the actual Node version, including when npm hooks are bypassed. Run `npm run check:node` from `eval/` or `agentic-eval/` in the actual service/container environment.

Updating source or npm packages does not replace a deployed Node executable. Install the patched runtime, rebuild/recreate containers where applicable, restart services, and verify the active executable/version in each deployment. A version string alone does not attest to a custom vendor build.

The API route compressed-body check is defense in depth only: framework/proxy parsing may happen before the handler, and outgoing `fetch()` calls can decode Brotli responses. It does not replace the runtime update.
