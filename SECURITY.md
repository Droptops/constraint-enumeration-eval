# Security Policy

This repository includes evaluation harnesses that may use external model APIs. Credentials must remain local and outside version control.

## Reporting

Do not place API keys, private URLs, private transcripts, proprietary data, or exploit details in a public issue. Use GitHub private vulnerability reporting when available. If it is unavailable, open a minimal issue without sensitive details and request a private channel.

## Sensitive material

Do not commit populated environment files, API keys, private keys, model-provider session links, customer data, or internal-only research artifacts. A fixture used in a public benchmark should be synthetic, public, or explicitly redistributable.

If sensitive material is accidentally committed, treat deletion from the working tree as insufficient: rotate/revoke the credential or link where possible and evaluate whether Git history and merged pull-request refs also require remediation.
