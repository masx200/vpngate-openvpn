import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Function to parse CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quotes
        current += '"';
        i++;
      } else {
        // Toggle quotes
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const csvFile = "./www.vpngate.net.csv";
const outputDir = join(__dirname, "ovpn-files");

// Create output directory if it doesn't exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir);
}

// Read and parse CSV file
const content = readFileSync(csvFile, "utf-8");
const lines = content.split("\n");

// Find the header line with column names
let headerIndex = -1;
let headers = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("OpenVPN_ConfigData_Base64")) {
    headerIndex = i;
    headers = parseCSVLine(lines[i]);
    break;
  }
}

if (headerIndex === -1) {
  console.error("Could not find header with OpenVPN_ConfigData_Base64 column");
  process.exit(1);
}

// Trim whitespace from headers and remove # prefix
headers = headers.map((h) => h.trim().replace(/^#/, ""));
const base64ColIndex = headers.indexOf("OpenVPN_ConfigData_Base64");
const hostnameColIndex = headers.indexOf("HostName");
const countryColIndex = headers.indexOf("CountryShort");
const ipColIndex = headers.indexOf("IP");

console.log(
  `Processing ${lines.length - headerIndex - 1} VPN server configurations...\n`,
);

let successCount = 0;
let errorCount = 0;

// Process each data line
for (let i = headerIndex + 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line || line.startsWith("#")) continue;

  // Handle CSV parsing (some fields may contain commas inside quotes)
  const columns = parseCSVLine(line);

  if (columns.length <= base64ColIndex) continue;

  const base64Data = columns[base64ColIndex];
  const hostname = columns[hostnameColIndex]?.trim() || "unknown";
  const country = columns[countryColIndex] || "XX";
  const ip = columns[ipColIndex] || "0.0.0.0";

  if (!base64Data || base64Data.trim() === "") continue;

  try {
    // Decode base64
    const config = Buffer.from(base64Data, "base64").toString("utf-8");

    // Create filename: Country-Hostname-IP.ovpn
    const filename = `${country}-${hostname.replace(/[^a-zA-Z0-9-]/g, "_")}-${
      ip.replace(/\./g, "-")
    }.ovpn`;
    const filepath = join(outputDir, filename);

    // Write ovpn file
    writeFileSync(filepath, config);
    successCount++;
    console.log(`✓ ${filename}`);
  } catch (err) {
    errorCount++;
    console.error(`✗ Error processing ${hostname}: ${err.message}`);
  }
}

console.log(`\nDone! Generated ${successCount} .ovpn files in '${outputDir}'`);
if (errorCount > 0) {
  console.log(`Failed: ${errorCount} files`);
}
