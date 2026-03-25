# CODEBUDDY.md

This file provides guidance to CodeBuddy Code when working with code in this
repository.

## Project Overview

A Node.js tool that converts VPN Gate CSV server lists into individual OpenVPN
configuration files (`.ovpn`). The project uses ES modules (`"type": "module"`
in package.json) and has no external dependencies.

## Common Commands

```bash
# Convert VPN Gate CSV to .ovpn files
node convert.js

# Update .ovpn files with auth-user-pass and http-proxy settings
node update-config.js

# Merge all .ovpn files into a load-balanced config
node merge-openvpn-configs.js

# Or use npm scripts
npm run convert
npm run update
npm run merge
```

**Prerequisites**: Download `www.vpngate.net.csv` from
https://www.vpngate.net/en/ and place it in the project root before running
`convert.js`.

## Code Architecture

### Main Scripts

- **`convert.js`** - Main CSV-to-OVPN converter. Parses VPN Gate CSV, extracts
  base64-encoded OpenVPN configs, and writes `.ovpn` files to `ovpn-files/`.
  Uses a custom CSV parser that handles quoted fields and escaped quotes.

- **`update-config.js`** - Post-processor that modifies existing `.ovpn` files
  to add:
  - `auth-user-pass ./login.conf` (for VPN Gate authentication)
  - `http-proxy 127.0.0.1 33678 ./proxy.conf basic` (for HTTP proxy relay)

- **`merge-openvpn-configs.js`** - Combines all `.ovpn` files from `ovpn-files/`
  into a single `openvpn-load-balance.ovpn` file with `remote-random` for load
  balancing across multiple servers.

### Data Flow

```
www.vpngate.net.csv → convert.js → ovpn-files/*.ovpn
                                          ↓
                                    update-config.js (adds auth/proxy)
                                          ↓
                                    merge-openvpn-configs.js (load balance)
```

### Output Directory

Generated `.ovpn` files are saved to `ovpn-files/` with naming convention:
`{CountryCode}-{Hostname}-{IPAddress}.ovpn` (e.g.,
`JP-public-vpn-255-219-100-37-224.ovpn`).

## Configuration Files

- **`login.conf`** - VPN Gate credentials (vpn/vpn)
- **`proxy.conf`** - HTTP proxy configuration for VPN Gate relay
- **`.gitignore`** - Ignores `.claude/settings.local.json` and `server.log`
