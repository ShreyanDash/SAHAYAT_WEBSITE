# SAHAYAT registration email flow

## Approved behavior

Visitors submit an email and explicit update consent through the existing early-access modal. The server saves the email in the managed MySQL database, sends a dark SAHAYAT confirmation email to the submitted address, and sends an admin notification to `sahayatcare@gmail.com`. The sender is `sahayatcare@gmail.com` over Gmail SMTP using the protected `GMAIL_APP_PASSWORD` secret. The email has no website CTA until a public URL is decided.

## Implementation

- Add an `interestRegistrations` Drizzle table with unique email, consent timestamp, creation timestamp, confirmation delivery timestamp, admin notification timestamp, and an email error field.
- Add server-side Gmail SMTP helpers that embed the transparent SAHAYAT band image as a CID attachment so recipients do not need a public image URL.
- Add a public tRPC mutation that validates the email and consent, saves the registration, sends the confirmation and admin notification, and records delivery status without exposing SMTP credentials.
- Connect the existing modal form to the mutation with pending, success, validation, consent, and error states.
- Enable the managed Server and Database resources, add the migration, and use the existing Dockerfile/server build for Preview and publication.
