#!/bin/bash

# 餐厅列表管理功能测试脚本
# 用于快速测试云函数API

echo "=========================================="
echo "餐厅列表管理功能 - API测试脚本"
echo "=========================================="
echo ""

# 环境ID
ENV_ID="my-garden-app-env-4e0h762923be2f"

echo "环境ID: $ENV_ID"
echo ""
echo "注意：此脚本需要在云函数控制台手动测试"
echo "或使用 tcb fn invoke 命令（需要Token）"
echo ""
echo "=========================================="
echo "测试用例1：权限验证"
echo "=========================================="
echo "测试命令（在云函数控制台执行）："
echo '{'
echo '  "action": "listAllRestaurants",'
echo '  "data": {}'
echo '}'
echo ""
echo "预期结果：返回 403 错误（如果使用非平台管理员Token）"
echo ""
echo "=========================================="
echo "测试用例2：获取餐厅列表"
echo "=========================================="
echo "测试命令："
echo '{'
echo '  "action": "listAllRestaurants",'
echo '  "data": {'
echo '    "page": 1,'
echo '    "pageSize": 10'
echo '  }'
echo '}'
echo ""
echo "预期结果：返回餐厅列表和分页信息"
echo ""
echo "=========================================="
echo "测试用例3：关键词搜索"
echo "=========================================="
echo "测试命令："
echo '{'
echo '  "action": "listAllRestaurants",'
echo '  "data": {'
echo '    "keyword": "素",'
echo '    "page": 1,'
echo '    "pageSize": 10'
echo '  }'
echo '}'
echo ""
echo "预期结果：只返回名称包含'素'的餐厅"
echo ""
echo "=========================================="
echo "测试用例4：状态筛选"
echo "=========================================="
echo "测试命令："
echo '{'
echo '  "action": "listAllRestaurants",'
echo '  "data": {'
echo '    "status": "active",'
echo '    "page": 1,'
echo '    "pageSize": 10'
echo '  }'
echo '}'
echo ""
echo "预期结果：只返回状态为'active'的餐厅"
echo ""
echo "=========================================="
echo "测试用例5：更新餐厅状态"
echo "=========================================="
echo "测试命令："
echo '{'
echo '  "action": "updateRestaurantStatus",'
echo '  "data": {'
echo '    "restaurantId": "restaurant_xxx",'
echo '    "status": "suspended"'
echo '  }'
echo '}'
echo ""
echo "预期结果：状态更新成功，返回 code: 0"
echo ""
echo "=========================================="
echo "测试用例6：更新认证等级"
echo "=========================================="
echo "测试命令："
echo '{'
echo '  "action": "updateRestaurantCertification",'
echo '  "data": {'
echo '    "restaurantId": "restaurant_xxx",'
echo '    "certificationLevel": "gold"'
echo '  }'
echo '}'
echo ""
echo "预期结果：认证等级更新成功，返回 code: 0"
echo ""
echo "=========================================="
echo "测试说明"
echo "=========================================="
echo "1. 在腾讯云开发控制台执行测试："
echo "   https://console.cloud.tencent.com/tcb"
echo ""
echo "2. 进入「云函数」->「tenant」->「测试」"
echo ""
echo "3. 输入测试命令，点击「运行测试」"
echo ""
echo "4. 查看返回结果和日志"
echo ""
echo "5. 记录测试结果到："
echo "   Docs/项目策划方案/平台管理/部署和测试执行记录.md"
echo ""
echo "=========================================="

