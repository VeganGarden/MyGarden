#!/bin/bash

# 导入气候餐厅因子数据到数据库
# 使用方法: ./scripts/import-climate-factors.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FACTORS_FILE="$PROJECT_ROOT/cloudfunctions/database/climate-restaurant-factors.json"
TEMP_PARAMS="/tmp/factor-import-params.json"

echo "=========================================="
echo "导入气候餐厅因子数据"
echo "=========================================="
echo ""

# 检查文件是否存在
if [ ! -f "$FACTORS_FILE" ]; then
    echo "❌ 错误: 因子数据文件不存在: $FACTORS_FILE"
    exit 1
fi

echo "📄 读取因子数据文件: $FACTORS_FILE"
FACTOR_COUNT=$(cat "$FACTORS_FILE" | jq '. | length' 2>/dev/null || echo "未知")
echo "   因子数量: $FACTOR_COUNT"
echo ""

# 使用 Node.js 构造参数
echo "🔧 构造调用参数..."
node -e "
const fs = require('fs');
const factors = JSON.parse(fs.readFileSync('$FACTORS_FILE', 'utf8'));
const params = {
  action: 'initFactorDataFromJSON',
  factors: factors,
  skipDuplicates: true,
  dryRun: false
};
fs.writeFileSync('$TEMP_PARAMS', JSON.stringify(params));
console.log('✅ 参数文件已生成: $TEMP_PARAMS');
console.log('   参数大小:', fs.statSync('$TEMP_PARAMS').size, 'bytes');
"

if [ $? -ne 0 ]; then
    echo "❌ 构造参数失败"
    exit 1
fi

echo ""
echo "🚀 调用云函数导入数据..."
echo ""

# 调用云函数 - 使用 Node.js 直接读取并传递参数
node -e "
const fs = require('fs');
const { execSync } = require('child_process');
const params = JSON.parse(fs.readFileSync('$TEMP_PARAMS', 'utf8'));
const paramsStr = JSON.stringify(params).replace(/'/g, \"'\\\\''\");
try {
  const result = execSync(\"tcb fn invoke database --params '\" + paramsStr + \"'\", { 
    encoding: 'utf8',
    stdio: 'inherit'
  });
} catch (error) {
  process.exit(error.status || 1);
}
"

IMPORT_RESULT=$?

echo ""
if [ $IMPORT_RESULT -eq 0 ]; then
    echo "✅ 导入命令执行完成"
    echo ""
    echo "📊 请查看上面的输出结果确认导入状态"
else
    echo "❌ 导入失败，退出码: $IMPORT_RESULT"
    exit 1
fi

# 清理临时文件
rm -f "$TEMP_PARAMS"

echo ""
echo "=========================================="
echo "导入流程完成"
echo "=========================================="

