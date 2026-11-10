# Security Policy — CodeVal AI (`codevalai/sovereign-rubicon-core`)

## Supported Versions
Only the current absolute master branch (`v32.0-AUTONOMOUS-EVOLUTION` and higher) is actively supported with security patches, post-quantum cryptographic enclaves, and zero-mock verification updates.

## Cryptographic Supply-Chain Guarantees
- **Zero Floating-Point & Mock-Free**: All arithmetic and binary-tower operations execute on deterministic bit-sliced primitives.
- **Dependency Pinning**: Every workspace package and npm module is strictly locked via SHA-56 integrity hashes inside `package-lock.json`.
- **Egress Lockdown**: Production runners operate under strict network egress firewalls, permitting connections exclusively to verified registry endpoints.

## Reporting a Vulnerability
If you discover a cryptographic vulnerability, side-channel leakage, or state corruption vector within the ML-DSA-65 enclaves or CXL memory slabs, please report it directly to the principal architect:

- **Primary Contact**: Nicholas Brian (`nicholasbrianbn@gmail.com`)
- **Organization**: CodeVal AI (`@codevalai`)
- **PGP / Post-Quantum Fingerprint**: Verified via v32.0 ML-DSA-65 detached release manifests.
