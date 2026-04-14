#!/usr/bin/env node

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取目录中的所有ovpn文件
const ovpnDir = path.join(__dirname, "ovpn-files");
const files = fs.readdirSync(ovpnDir).filter((file) => file.endsWith(".ovpn"));

console.log(`找到 ${files.length} 个 OVPN 文件\n`);

// 存储所有证书的哈希值
const caCertificates = new Map();
const certCertificates = new Map();
const keyCertificates = new Map();

// 提取标签内容的函数
function extractTagContent(content, tagName) {
  const startTag = `<${tagName}>`;
  const endTag = `</${tagName}>`;

  const startIndex = content.indexOf(startTag);
  if (startIndex === -1) return null;

  const endIndex = content.indexOf(endTag, startIndex);
  if (endIndex === -1) return null;

  return content.substring(startIndex + startTag.length, endIndex).trim();
}

// 计算内容的哈希值
function calculateHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// 分析单个文件
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const fileName = path.basename(filePath);

  const caContent = extractTagContent(content, "ca");
  const certContent = extractTagContent(content, "cert");
  const keyContent = extractTagContent(content, "key");

  const result = {
    fileName,
    ca: caContent ? calculateHash(caContent) : null,
    cert: certContent ? calculateHash(certContent) : null,
    key: keyContent ? calculateHash(keyContent) : null,
    caContent,
    certContent,
    keyContent,
  };

  return result;
}

// 分析所有文件
const results = files.map((file) => {
  const filePath = path.join(ovpnDir, file);
  return analyzeFile(filePath);
});

// 统计CA证书
console.log("=== CA 证书分析 ===");
results.forEach((result) => {
  if (result.ca) {
    if (!caCertificates.has(result.ca)) {
      caCertificates.set(result.ca, []);
    }
    caCertificates.get(result.ca).push(result.fileName);
  }
});

console.log(`找到 ${caCertificates.size} 个不同的 CA 证书\n`);
if (caCertificates.size > 1) {
  console.log("⚠️  存在不同的 CA 证书！\n");
  caCertificates.forEach((files, hash) => {
    console.log(`CA 证书哈希: ${hash.substring(0, 16)}...`);
    console.log(`文件数量: ${files.length}`);
    console.log(
      `示例文件: ${files.slice(0, 3).join(", ")}${
        files.length > 3 ? "..." : ""
      }\n`,
    );
  });
} else {
  console.log("✅ 所有文件使用相同的 CA 证书\n");
}

// 统计客户端证书
console.log("=== 客户端证书 分析 ===");
results.forEach((result) => {
  if (result.cert) {
    if (!certCertificates.has(result.cert)) {
      certCertificates.set(result.cert, []);
    }
    certCertificates.get(result.cert).push(result.fileName);
  }
});

console.log(`找到 ${certCertificates.size} 个不同的客户端证书\n`);
if (certCertificates.size > 1) {
  console.log("⚠️  存在不同的客户端证书！\n");
  certCertificates.forEach((files, hash) => {
    console.log(`客户端证书哈希: ${hash.substring(0, 16)}...`);
    console.log(`文件数量: ${files.length}`);
    console.log(
      `示例文件: ${files.slice(0, 3).join(", ")}${
        files.length > 3 ? "..." : ""
      }\n`,
    );
  });
} else {
  console.log("✅ 所有文件使用相同的客户端证书\n");
}

// 统计私钥
console.log("=== 私钥 分析 ===");
results.forEach((result) => {
  if (result.key) {
    if (!keyCertificates.has(result.key)) {
      keyCertificates.set(result.key, []);
    }
    keyCertificates.get(result.key).push(result.fileName);
  }
});

console.log(`找到 ${keyCertificates.size} 个不同的私钥\n`);
if (keyCertificates.size > 1) {
  console.log("⚠️  存在不同的私钥！\n");
  keyCertificates.forEach((files, hash) => {
    console.log(`私钥哈希: ${hash.substring(0, 16)}...`);
    console.log(`文件数量: ${files.length}`);
    console.log(
      `示例文件: ${files.slice(0, 3).join(", ")}${
        files.length > 3 ? "..." : ""
      }\n`,
    );
  });
} else {
  console.log("✅ 所有文件使用相同的私钥\n");
}

// 总结
console.log("=== 总结 ===");
console.log(`CA 证书种类: ${caCertificates.size}`);
console.log(`客户端证书种类: ${certCertificates.size}`);
console.log(`私钥种类: ${keyCertificates.size}`);

if (
  caCertificates.size === 1 && certCertificates.size === 1 &&
  keyCertificates.size === 1
) {
  console.log("\n✅ 所有文件使用完全相同的证书组合");
} else {
  console.log("\n⚠️  存在证书差异，可能需要进一步调查");
}

// 生成详细报告文件
const report = {
  timestamp: new Date().toISOString(),
  totalFiles: files.length,
  summary: {
    uniqueCACertificates: caCertificates.size,
    uniqueClientCertificates: certCertificates.size,
    uniqueKeys: keyCertificates.size,
  },
  details: {
    caCertificates: Array.from(caCertificates.entries()).map((
      [hash, files],
    ) => ({
      hash,
      fileCount: files.length,
      files: files.slice(0, 100), // 只保存前10个文件名
    })),
    clientCertificates: Array.from(certCertificates.entries()).map((
      [hash, files],
    ) => ({
      hash,
      fileCount: files.length,
      files: files.slice(0, 100),
    })),
    keys: Array.from(keyCertificates.entries()).map(([hash, files]) => ({
      hash,
      fileCount: files.length,
      files: files.slice(0, 100),
    })),
  },
};

fs.writeFileSync(
  "certificate-analysis-report.json",
  JSON.stringify(report, null, 2),
);
console.log("\n📄 详细报告已保存到: certificate-analysis-report.json");
