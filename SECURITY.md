# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

To report a vulnerability privately:

1. Go to the [Security tab](../../security) of this repository
2. Click **"Report a vulnerability"** to open a private advisory
3. Describe the issue, steps to reproduce, and potential impact

Alternatively, you can email the maintainer directly. Check the repository's profile for contact information.

## What to Expect

- **Acknowledgement:** Within 7 days of your report
- **Assessment:** We will evaluate severity and determine a fix timeline
- **Disclosure:** We will coordinate a disclosure date with you after a fix is released

## Scope

**In scope:**
- Vulnerabilities in the extension source code (`src/`)
- Dependency vulnerabilities that affect the extension's behavior
- Path traversal or arbitrary file read issues in icon detection

**Out of scope:**
- Vulnerabilities in VS Code itself (report to [Microsoft](https://www.microsoft.com/en-us/msrc))
- Issues in the user's own project files
- Bugs that are not security-relevant (use the public issue tracker instead)

## Notes

This extension runs entirely offline — it makes no network requests. It reads local image files from the user's workspace to extract colors. Attack surface is limited to local file processing.
