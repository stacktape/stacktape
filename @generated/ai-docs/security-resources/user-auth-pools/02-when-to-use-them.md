# When to use them

User pools are a good choice whenever your application needs to authenticate and authorize users.

**Advantages**

- **Pay-per-MAU:** You pay for monthly active users.
- **Free tier:** The first 50,000 monthly active users are free (for users who sign in directly, not through SAML or OIDC federation).
- **Serverless:** Scales seamlessly to handle a large number of users.
- **Secure by default:** User data is stored securely by AWS.
- **Compliant:** User pools are HIPAA eligible and compliant with PCI DSS, SOC, ISO/IEC 27001, and other standards.

**Disadvantages**

- **Cost at scale:** Can become expensive for large user bases or heavy use of SAML or OIDC federation.
- **Complexity:** Authentication flows and standards like OAuth can be complex to understand and implement correctly.