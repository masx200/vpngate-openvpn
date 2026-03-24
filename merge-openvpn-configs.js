import fs from "fs";
import path from "path";

// 配置参数
const INPUT_PATTERN = ".ovpn"; // 输入文件匹配模式
const OUTPUT_FILE = "openvpn-load-balance.ovpn"; // 输出文件名
const CURRENT_DIR = path.join(process.cwd(), "ovpn-files"); // 当前工作目录

/**
 * 读取所有匹配的OpenVPN配置文件
 * @returns {string[]} 文件路径数组
 */
function readOvpnFiles() {
  const files = fs.readdirSync(CURRENT_DIR);
  return files.filter((file) => file.endsWith(INPUT_PATTERN));
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
  };

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    // 跳过空行和注释
    if (
      !trimmedLine || trimmedLine.startsWith("#") || trimmedLine.startsWith(";")
    ) {
      return;
    }

    // 提取remote字段
    if (trimmedLine.startsWith("remote ")) {
      config.remotes.push(trimmedLine);
    } else {
      // 其他配置字段
      config.otherConfig.push(trimmedLine);
    }
  });

  return config;
}

/**
 * 合并多个配置文件
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
  // 可以根据需要调整这个逻辑，比如检查某些关键字段是否存在
  mergedConfig.otherConfig = configs[0].otherConfig;

  return mergedConfig;
}

/**
 * 生成最终的配置文件内容
 * @param {Object} config 合并后的配置对象
 * @returns {string} 配置文件内容
 */
function generateConfigContent(config) {
  const lines = [];

  // 添加头部注释
  //   lines.push("# 自动生成的负载均衡OpenVPN配置文件");
  lines.push(`# 生成时间: ${new Date().toLocaleString()}`);
  lines.push(`# 包含 ${config.remotes.length} 个服务器地址`);
  lines.push("");

  // 添加remote字段
  if (config.remotes.length > 0) {
    lines.push("");
    lines.push("# 服务器地址列表（负载均衡）");
    config.remotes.forEach((remote) => {
      lines.push(remote);
    });

    // 添加remote-random以启用随机选择
  }
  // 添加其他配置字段
  config.otherConfig.forEach((line) => {
    lines.push(line);
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

    // 合并配置
    console.log("正在合并配置...");
    const mergedConfig = mergeConfigs(configs);

    console.log(`合并结果:`);
    console.log(`  - 服务器地址: ${mergedConfig.remotes.length} 个`);
    console.log(`  - 其他配置: ${mergedConfig.otherConfig.length} 行`);

    // 生成配置内容
    const configContent = generateConfigContent(mergedConfig).replaceAll(
      "proto udp",
      "proto tcp",
    );

    // 写入输出文件
    const outputPath = path.join(CURRENT_DIR, OUTPUT_FILE);
    fs.writeFileSync(outputPath, configContent, "utf8");

    console.log(`\n配置文件已生成: ${OUTPUT_FILE}`);
    console.log(`文件大小: ${configContent.length} 字节`);

    // 显示一些统计信息
    console.log("\n服务器地址列表:");
    mergedConfig.remotes.forEach((remote, index) => {
      console.log(`  ${index + 1}. ${remote.replace("remote ", "")}`);
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

export { generateConfigContent, mergeConfigs, parseOvpnFile, readOvpnFiles };
