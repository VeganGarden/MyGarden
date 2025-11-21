#!/bin/bash

# 平台级统计报表功能测试脚本

echo "=========================================="
echo "平台级统计报表功能 - API测试"
echo "=========================================="
echo ""

ENV_ID="my-garden-app-env-4e0h762923be2f"

echo "⚠️  注意：此脚本需要平台管理员Token"
echo "请在浏览器开发者工具中获取Token"
echo ""

echo "=========================================="
echo "测试用例1：获取平台统计数据（基础）"
echo "=========================================="
echo ""
echo "测试命令（在云函数控制台执行）："
echo ""
cat << 'EOF'
{
  "action": "getPlatformStatistics",
  "data": {
    "period": "30days"
  }
}
EOF
echo ""
echo "预期结果："
echo "- code: 0"
echo "- 返回统计数据（总餐厅数、订单数、收入等）"
echo ""

echo "=========================================="
echo "测试用例2：获取平台统计数据（包含趋势）"
echo "=========================================="
echo ""
echo "测试命令："
echo ""
cat << 'EOF'
{
  "action": "getPlatformStatistics",
  "data": {
    "period": "30days",
    "includeTrends": true
  }
}
EOF
echo ""
echo "预期结果："
echo "- code: 0"
echo "- 返回统计数据 + 趋势数据"
echo ""

echo "=========================================="
echo "测试用例3：获取平台统计数据（自定义时间）"
echo "=========================================="
echo ""
echo "测试命令："
echo ""
cat << 'EOF'
{
  "action": "getPlatformStatistics",
  "data": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-27",
    "includeTrends": true
  }
}
EOF
echo ""
echo "预期结果："
echo "- code: 0"
echo "- 返回指定时间范围的统计数据"
echo ""

echo "=========================================="
echo "测试用例4：获取餐厅排行榜（按订单数）"
echo "=========================================="
echo ""
echo "测试命令："
echo ""
cat << 'EOF'
{
  "action": "getTopRestaurants",
  "data": {
    "sortBy": "orders",
    "limit": 10
  }
}
EOF
echo ""
echo "预期结果："
echo "- code: 0"
echo "- 返回按订单数排序的前10名餐厅"
echo ""

echo "=========================================="
echo "测试用例5：获取餐厅排行榜（按收入）"
echo "=========================================="
echo ""
echo "测试命令："
echo ""
cat << 'EOF'
{
  "action": "getTopRestaurants",
  "data": {
    "sortBy": "revenue",
    "limit": 10
  }
}
EOF
echo ""
echo "预期结果："
echo "- code: 0"
echo "- 返回按收入排序的前10名餐厅"
echo ""

echo "=========================================="
echo "测试用例6：获取餐厅排行榜（按碳减排）"
echo "=========================================="
echo ""
echo "测试命令："
echo ""
cat << 'EOF'
{
  "action": "getTopRestaurants",
  "data": {
    "sortBy": "carbonReduction",
    "limit": 10
  }
}
EOF
echo ""
echo "预期结果："
echo "- code: 0"
echo "- 返回按碳减排排序的前10名餐厅"
echo ""

echo "=========================================="
echo "测试用例7：获取餐厅排行榜（时间范围）"
echo "=========================================="
echo ""
echo "测试命令："
echo ""
cat << 'EOF'
{
  "action": "getTopRestaurants",
  "data": {
    "sortBy": "orders",
    "limit": 10,
    "startDate": "2025-01-01",
    "endDate": "2025-01-27"
  }
}
EOF
echo ""
echo "预期结果："
echo "- code: 0"
echo "- 返回指定时间范围内的餐厅排行榜"
echo ""

echo "=========================================="
echo "测试用例8：权限验证（非平台管理员）"
echo "=========================================="
echo ""
echo "测试说明："
echo "使用非平台管理员Token测试，应该返回403错误"
echo ""

echo "=========================================="
echo "测试用例9：前端页面测试"
echo "=========================================="
echo ""
echo "测试步骤："
echo "1. 使用平台管理员账号登录管理后台"
echo "2. 访问「平台管理」->「平台级统计报表」"
echo "3. 验证以下功能："
echo "   - [ ] 页面正常加载"
echo "   - [ ] 统计卡片显示数据"
echo "   - [ ] 趋势图正常渲染"
echo "   - [ ] 对比图正常渲染"
echo "   - [ ] 分布图正常渲染"
echo "   - [ ] 时间范围筛选正常"
echo "   - [ ] 排序功能正常"
echo "   - [ ] 数据刷新正常"
echo "   - [ ] 导出功能正常"
echo ""

echo "=========================================="
echo "测试用例10：数据准确性验证"
echo "=========================================="
echo ""
echo "测试说明："
echo "1. 手动计算统计数据"
echo "2. 对比API返回的数据"
echo "3. 验证数据是否一致"
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""
echo "云函数控制台："
echo "https://console.cloud.tencent.com/tcb/scf?envId=${ENV_ID}&rid=4"
echo ""

