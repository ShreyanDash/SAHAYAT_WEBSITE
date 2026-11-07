
- [x] Audit the SAHAYAT project for the 20 requested security areas and implement applicable protections without adding unused upload or payment surfaces.
- [x] Add secure response headers, HTTPS-aware HSTS, same-origin mutation checks, OAuth and registration rate limits, small request-body limits, and production environment validation.
- [x] Add a repeatable `pnpm security:audit` command to scan tracked text files for common credential literals.
- [x] Escape user-controlled email text in admin email HTML and verify the existing OAuth nonce and secure-cookie protections remain intact.
