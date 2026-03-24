import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置常量
const AUTH_USER_PASS_LINE = "auth-user-pass ./login.conf";
const HTTP_PROXY_LINE = "http-proxy 127.0.0.1 33678 ./proxy.conf basic";

/**
 * 处理单个 OVPN 文件
 * @param {string} filePath - 文件路径
 */
function processOvpnFile(filePath) {
  try {
    // 读取文件内容
    let content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    let modified = false;
    const newLines = [];

    let hasAuthUserPass = false;
    let authUserPassIndex = -1;

    // 遍历所有行
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trimStart(); // 保留行尾空白，只去除开头空白

      // 处理 auth-user-pass 行
      if (trimmedLine.startsWith("auth-user-pass")) {
        hasAuthUserPass = true;
        authUserPassIndex = newLines.length;
        // 检查是否已经是目标配置
        if (trimmedLine !== AUTH_USER_PASS_LINE) {
          newLines.push(AUTH_USER_PASS_LINE);
          modified = true;
        } else {
          newLines.push(line);
        }
      }
      // 跳过原有的 http-proxy 行（后面统一添加）
      else if (trimmedLine.startsWith("http-proxy")) {
        modified = true; // 删除旧行也算修改
      }
      // 其他行保持不变
      else {
        newLines.push(line);
      }
    }

    // 如果没有 auth-user-pass，添加它
    if (!hasAuthUserPass) {
      // 在文件开头添加
      newLines.unshift(AUTH_USER_PASS_LINE);
      authUserPassIndex = 0;
      modified = true;
    }

    // 在 auth-user-pass 后添加 http-proxy
    newLines.splice(authUserPassIndex + 1, 0, HTTP_PROXY_LINE);
    modified = true;

    // 如果有修改，写回文件
    if (modified) {
      fs.writeFileSync(filePath, newLines.join("\n"), "utf8");
      console.log(`[已修改] ${path.basename(filePath)}`);
      return true;
    } else {
      console.log(`[跳过] ${path.basename(filePath)} (无需修改)`);
      return false;
    }
  } catch (error) {
    console.error(
      `[错误] 处理 ${path.basename(filePath)} 时出错:`,
      error.message,
    );
    return false;
  }
}

/**
 * 主函数：查找并处理所有 .ovpn 文件
 */
function main() {
  const currentDir = __dirname;
  const subDir = path.join(currentDir, "ovpn-files");

  // 分别读取两个目录的文件，记录来源
  const fileEntries = [];

  // 读取当前目录
  if (fs.existsSync(currentDir)) {
    const files = fs.readdirSync(currentDir);
    files.forEach((file) => {
      if (file.endsWith(".ovpn")) {
        fileEntries.push({ name: file, dir: currentDir });
      }
    });
  }

  // 读取 ovpn-files 子目录
  if (fs.existsSync(subDir)) {
    const files = fs.readdirSync(subDir);
    files.forEach((file) => {
      if (file.endsWith(".ovpn")) {
        fileEntries.push({ name: file, dir: subDir });
      }
    });
  }

  if (fileEntries.length === 0) {
    console.log("未找到任何 .ovpn 文件");
    return;
  }

  console.log(`找到 ${fileEntries.length} 个 OVPN 文件\n`);

  let modifiedCount = 0;

  // 处理每个文件
  for (const entry of fileEntries) {
    const filePath = path.join(entry.dir, entry.name);
    if (processOvpnFile(filePath)) {
      modifiedCount++;
    }
  }

  console.log(`\n完成！共修改了 ${modifiedCount} 个文件`);
}
if (import.meta.main) {
  // 运行主函数
  main();
}
