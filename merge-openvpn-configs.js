import fs from "fs";
import path from "path";

// 配置参数
const INPUT_PATTERN = ".ovpn"; // 输入文件匹配模式
const OUTPUT_FILE_TCP = "openvpn-load-balance-tcp.ovpn"; // TCP 输出文件名
const OUTPUT_FILE_UDP = "openvpn-load-balance-udp.ovpn"; // UDP 输出文件名
const CURRENT_DIR = path.join(process.cwd(), "ovpn-files"); // 当前工作目录

/**
 * 读取所有匹配的OpenVPN配置文件
 * @returns {string[]} 文件路径数组
 */
function readOvpnFiles() {
  const files = fs.readdirSync(CURRENT_DIR);
  return files.filter((file) =>
    file.endsWith(INPUT_PATTERN) &&
    !file.startsWith("openvpn-load-balance-") // 排除生成的输出文件
  );
}

/**
 * 解析OpenVPN配置文件
 * @param {string} filePath 文件路径
 * @returns {Object} 解析后的配置对象
 */
function parseOvpnFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  const config = {
    remotes: [],
    otherConfig: [],
    protocol: null, // 'tcp' 或 'udp'
    protoLine: null, // 原始 proto 配置行
  };

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    // 跳过空行和注释
    if (
      !trimmedLine || trimmedLine.startsWith("#") || trimmedLine.startsWith(";")
    ) {
      return;
    }

    // 提取proto字段确定协议类型
    if (trimmedLine.startsWith("proto ")) {
      config.protoLine = trimmedLine;
      if (trimmedLine.includes("tcp")) {
        config.protocol = "tcp";
      } else if (trimmedLine.includes("udp")) {
        config.protocol = "udp";
      }
    } // 提取remote字段
    else if (trimmedLine.startsWith("remote ")) {
      config.remotes.push(trimmedLine);
    } else {
      // 其他配置字段
      config.otherConfig.push(trimmedLine);
    }
  });

  return config;
}

/**
 * 按协议类型分组配置
 * @param {Object[]} configs 配置对象数组
 * @returns {Object} { tcp: configs, udp: configs }
 */
function groupByProtocol(configs) {
  const grouped = { tcp: [], udp: [] };
  configs.forEach((config) => {
    const proto = config.protocol || "tcp"; // 默认 TCP
    if (grouped[proto]) {
      grouped[proto].push(config);
    }
  });
  return grouped;
}

/**
 * 合并多个配置文件（按协议）
 * @param {Object[]} configs 配置对象数组
 * @returns {Object} 合并后的配置对象
 */
function mergeConfigs(configs) {
  if (configs.length === 0) {
    throw new Error("没有找到任何配置文件");
  }

  const mergedConfig = {
    remotes: [],
    otherConfig: [],
    protocol: configs[0].protocol || "tcp",
    protoLine: configs[0].protoLine || "proto tcp",
  };

  // 收集所有remote字段（去重）
  const remoteSet = new Set();
  configs.forEach((config) => {
    config.remotes.forEach((remote) => {
      remoteSet.add(remote);
    });
  });

  mergedConfig.remotes = Array.from(remoteSet);

  // 使用第一个文件的其他配置作为基础
  mergedConfig.otherConfig = configs[0].otherConfig;

  return mergedConfig;
}

/**
 * 生成最终的配置文件内容
 * @param {Object} config 合并后的配置对象
 * @param {string} protocol 'tcp' 或 'udp'
 * @returns {string} 配置文件内容
 */
function generateConfigContent(config, protocol) {
  const lines = [];

  // 添加头部注释
  lines.push(`# 生成时间: ${new Date().toLocaleString()}`);
  lines.push(`# 协议: ${protocol.toUpperCase()}`);
  lines.push(`# 包含 ${config.remotes.length} 个服务器地址`);
  lines.push("");

  // 添加proto字段
  lines.push(`proto ${protocol}`);

  // 添加remote字段
  if (config.remotes.length > 0) {
    lines.push("");
    lines.push("# 服务器地址列表（负载均衡）");
    config.remotes.forEach((remote) => {
      lines.push(remote);
    });

    // 添加remote-random以启用随机选择
  }
  // 添加其他配置字段（排除原有的proto行）
  config.otherConfig.forEach((line) => {
    if (!line.startsWith("proto ")) {
      lines.push(line);
    }
  });
  if (config.remotes.length > 1 && !lines.includes("remote-random")) {
    lines.push("remote-random");
  }
  return lines.join("\n");
}

/**
 * 主函数
 */
function main() {
  console.log("开始处理OpenVPN配置文件...");
  console.log(`工作目录: ${CURRENT_DIR}`);

  try {
    // 读取所有匹配的文件
    const ovpnFiles = readOvpnFiles();

    if (ovpnFiles.length === 0) {
      console.log(`未找到匹配的文件: *${INPUT_PATTERN}`);
      return;
    }

    console.log(`找到 ${ovpnFiles.length} 个配置文件:`);
    ovpnFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });

    // 解析所有文件
    const configs = ovpnFiles.map((file) => {
      console.log(`正在解析: ${file}`);
      return parseOvpnFile(path.join(CURRENT_DIR, file));
    });

    // 按协议类型分组
    console.log("正在按协议分组...");
    const grouped = groupByProtocol(configs);

    const results = [];

    // 处理 TCP 协议
    if (grouped.tcp.length > 0) {
      console.log(`\n正在合并 TCP 配置 (${grouped.tcp.length} 个文件)...`);
      const mergedTcp = mergeConfigs(grouped.tcp);
      const configContent = generateConfigContent(mergedTcp, "tcp");

      const outputPath = path.join(CURRENT_DIR, OUTPUT_FILE_TCP);
      fs.writeFileSync(outputPath, configContent, "utf8");

      console.log(
        `  TCP: 生成 ${OUTPUT_FILE_TCP}, 包含 ${mergedTcp.remotes.length} 个服务器`,
      );
      results.push({
        protocol: "TCP",
        file: OUTPUT_FILE_TCP,
        count: mergedTcp.remotes.length,
      });
    }

    // 处理 UDP 协议
    if (grouped.udp.length > 0) {
      console.log(`\n正在合并 UDP 配置 (${grouped.udp.length} 个文件)...`);
      const mergedUdp = mergeConfigs(grouped.udp);
      const configContent = generateConfigContent(mergedUdp, "udp");

      const outputPath = path.join(CURRENT_DIR, OUTPUT_FILE_UDP);
      fs.writeFileSync(outputPath, configContent, "utf8");

      console.log(
        `  UDP: 生成 ${OUTPUT_FILE_UDP}, 包含 ${mergedUdp.remotes.length} 个服务器`,
      );
      results.push({
        protocol: "UDP",
        file: OUTPUT_FILE_UDP,
        count: mergedUdp.remotes.length,
      });
    }

    // 输出汇总
    console.log("\n========== 生成完成 ==========");
    results.forEach((r) => {
      console.log(`  ${r.protocol}: ${r.file} (${r.count} 个服务器)`);
    });
  } catch (error) {
    console.error("处理过程中发生错误:", error.message);
    process.exit(1);
  }
}

// 执行主函数
if (import.meta.main) {
  main();
}

export {
  generateConfigContent,
  groupByProtocol,
  mergeConfigs,
  parseOvpnFile,
  readOvpnFiles,
};
