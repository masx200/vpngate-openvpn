# VPN Gate OpenVPN Configuration Converter

A Node.js tool that converts VPN Gate CSV server lists into individual OpenVPN
configuration files (`.ovpn`).

## Overview

This tool parses the VPN Gate server list CSV file and extracts base64-encoded
OpenVPN configuration data, generating organized `.ovpn` files for each VPN
server. The generated files can be used directly with OpenVPN clients to connect
to VPN Gate servers.

## Features

- 🔄 **CSV Parsing**: Robust CSV parser that handles quoted fields and escaped
  quotes
- 📦 **Base64 Decoding**: Automatically decodes base64-encoded OpenVPN
  configurations
- 🗂️ **Organized Naming**: Files are named using the pattern
  `{Country}-{Hostname}-{IP}.ovpn`
- ✅ **Error Handling**: Gracefully handles parsing errors and provides detailed
  feedback
- 📊 **Progress Reporting**: Shows real-time progress and success/failure
  statistics

## Prerequisites

- Node.js (with ES module support)
- VPN Gate CSV file (`www.vpngate.net.csv`)

## Installation

1. Clone or download this repository:

```bash
git clone <repository-url>
cd vpngate-openvpn
```

2. No additional dependencies required - uses built-in Node.js modules only!

## Usage

1. **Download VPN Gate CSV**:
   - Visit [vpngate.net](https://www.vpngate.net/en/) and download the CSV file
   - Save it as `www.vpngate.net.csv` in the project root

2. **Run the converter**:

```bash
node convert.js
```

3. **Find your configs**:
   - Generated `.ovpn` files will be saved in the `ovpn-files/` directory

## Output Structure

The tool generates `.ovpn` files with the following naming convention:

```
{CountryCode}-{Hostname}-{IPAddress}.ovpn
```

Examples:

- `JP-public-vpn-255-219-100-37-224.ovpn` (Japan server)
- `US-vpn635802823-73-252-176-134.ovpn` (United States server)
- `KR-vpn993543561-59-29-9-22.ovpn` (Korea server)

## CSV Format

The tool expects the VPN Gate CSV format with the following columns:

- `HostName`: Server hostname
- `IP`: Server IP address
- `CountryShort`: Two-letter country code (JP, US, KR, etc.)
- `OpenVPN_ConfigData_Base64`: Base64-encoded OpenVPN configuration

## Using Generated Configs

### OpenVPN CLI

```bash
sudo openvpn --config ovpn-files/JP-public-vpn-255-219-100-37-224.ovpn
```

### OpenVPN GUI (Windows)

1. Open OpenVPN GUI
2. Place `.ovpn` file in `C:\Users\<Username>\OpenVPN\config\`
3. Right-click the OpenVPN GUI icon and connect

### NetworkManager (Linux)

```bash
sudo nmcli connection import type openvpn file ovpn-files/JP-public-vpn-255-219-100-37-224.ovpn
```

## Example Output

```
Processing 152 VPN server configurations...

✓ JP-public-vpn-255-219-100-37-224.ovpn
✓ JP-public-vpn-165-219-100-37-127.ovpn
✓ US-vpn635802823-73-252-176-134.ovpn
✓ KR-vpn993543561-59-29-9-22.ovpn
...

Done! Generated 150 .ovpn files in 'ovpn-files'
Failed: 2 files
```

## Project Structure

```
vpngate-openvpn/
├── convert.js              # Main converter script
├── package.json            # Project metadata
├── www.vpngate.net.csv     # VPN Gate server list (input)
├── ovpn-files/            # Generated .ovpn files (output)
└── README.md              # This file
```

## About VPN Gate

[VPN Gate](https://www.vpngate.net/) is an academic project from Japan that
provides free VPN servers. The project is operated by the University of Tsukuba
and offers VPN servers hosted by volunteers worldwide.

**Important Notes:**

- VPN Gate servers are provided for academic purposes
- Always review the configuration files before use
- Server availability and performance may vary
- Some servers may have usage restrictions

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Disclaimer

This tool is provided as-is for educational and personal use. The authors are
not affiliated with VPN Gate or the University of Tsukuba. Users are responsible
for complying with their local laws and regulations when using VPN services.
