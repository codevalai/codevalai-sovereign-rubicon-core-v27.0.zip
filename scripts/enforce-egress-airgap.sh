#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-allowlist}" # "allowlist" (for npm ci) or "total-airgap" (for test execution)

if [[ "$MODE" == "allowlist" ]]; then
  echo "[SOVEREIGN-FIREWALL] Resolving authoritative IPv4 blocks for npm & GitHub..."
  ALLOWED_IPS=$(dig +short registry.npmjs.org github.com api.github.com | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | paste -sd "," -)

  sudo nft flush ruleset
  sudo nft -f - <<NFT_EOF
table inet sovereign_filter {
  set allowed_ipv4 {
    type ipv4_addr
    flags interval
    elements = { 127.0.0.1, ${ALLOWED_IPS} }
  }

  chain output {
    type filter hook output priority 0; policy drop;
    oifname "lo" accept
    ct state established,related accept
    udp dport 53 accept
    tcp dport 53 accept
    ip daddr @allowed_ipv4 tcp dport 443 accept
    counter log prefix "[SOVEREIGN-EGRESS-BLOCKED] " drop
  }
}
NFT_EOF
  echo "[SOVEREIGN-FIREWALL] Strict nftables egress whitelist active."

elif [[ "$MODE" == "total-airgap" ]]; then
  echo "[SOVEREIGN-FIREWALL] Engaging TOTAL KERNEL AIRGAP. Zero external packets permitted."
  sudo nft flush ruleset
  sudo nft -f - <<NFT_EOF
table inet sovereign_airgap {
  chain output {
    type filter hook output priority 0; policy drop;
    oifname "lo" accept
    counter drop
  }
}
NFT_EOF
  echo "[SOVEREIGN-FIREWALL] Airgap locked. Execution environment is 100% isolated."
fi
