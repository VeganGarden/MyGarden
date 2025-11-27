#!/bin/bash

# Phase 2 统计与报表功能测试脚本
# 
# 使用方法：
# chmod +x scripts/test-vegetarian-personnel-phase2.sh
# ./scripts/test-vegetarian-personnel-phase2.sh [tenantId] [restaurantId]

set -e

echo "=========================================="
echo "Phase 2 统计与报表功能测试"
echo "=========================================="
echo ""

# 环境ID
ENV_ID="my-garden-app-env-4e0h762923be2f"

# 测试用的租户ID和餐厅ID
TENANT_ID="${1:-}"
RESTAURANT_ID="${2:-}"

echo "📋 测试配置："
echo "   - 环境ID: $ENV_ID"
if [ -n "$TENANT_ID" ]; then
    echo "   - 租户ID: $TENANT_ID"
fi
if [ -n "$RESTAURANT_ID" ]; then
    echo "   - 餐厅ID: $RESTAURANT_ID"
fi
echo ""

# 测试结果统计
PASSED=0
FAILED=0
TOTAL=0

# 测试函数
test_function() {
    local test_name="$1"
    local action="$2"
    local params="$3"
    
    TOTAL=$((TOTAL + 1))
    echo "[$TOTAL] 测试: $test_name"
    echo "  Action: $action"
    
    # 构建完整的参数
    local full_params="{\"action\":\"$action\",\"data\":$params}"
    
    # 调用云函数并捕获输出
    local result=$(tcb fn invoke vegetarian-personnel \
        --params "$full_params" \
        --envId "$ENV_ID" 2>&1)
    
    # 检查结果
    if echo "$result" | grep -q '"code":0' || echo "$result" | grep -q '"success":true'; then
        echo "  ✅ 通过"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo "  ❌ 失败"
        echo "  错误信息: $result" | head -5
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "=========================================="
echo "开始 Phase 2 功能测试"
echo "=========================================="
echo ""

# 构建基础参数
BASE_PARAMS="{}"
if [ -n "$TENANT_ID" ]; then
    BASE_PARAMS="{\"tenantId\":\"$TENANT_ID\"}"
fi
if [ -n "$RESTAURANT_ID" ]; then
    BASE_PARAMS="${BASE_PARAMS%}}"
    BASE_PARAMS="$BASE_PARAMS,\"restaurantId\":\"$RESTAURANT_ID\"}"
fi

# 1. 测试统计数据快照生成
echo "1. 统计数据快照生成功能测试"
echo "----------------------------------------"

test_function "生成每日统计数据快照" "generateStatsSnapshot" "${BASE_PARAMS%}}},\"snapshotType\":\"daily\"}"

test_function "生成月度统计数据快照" "generateStatsSnapshot" "${BASE_PARAMS%}}},\"snapshotType\":\"monthly\"}"

echo ""

# 2. 测试减碳效应分析
echo "2. 减碳效应分析功能测试"
echo "----------------------------------------"

test_function "获取减碳效应分析" "getCarbonEffectAnalysis" "$BASE_PARAMS"

echo ""

# 3. 测试报表导出功能（Excel）
echo "3. 报表导出功能测试（Excel）"
echo "----------------------------------------"

test_function "导出员工数据（Excel）" "exportStaffData" "${BASE_PARAMS%}}},\"format\":\"excel\"}"

test_function "导出客户数据（Excel）" "exportCustomerData" "${BASE_PARAMS%}}},\"format\":\"excel\"}"

test_function "导出 ESG 报告（Excel）" "exportESGReport" "${BASE_PARAMS%}}},\"format\":\"excel\"}"

echo ""

# 4. 测试报表导出功能（PDF）
echo "4. 报表导出功能测试（PDF）"
echo "----------------------------------------"

test_function "导出员工数据（PDF）" "exportStaffData" "${BASE_PARAMS%}}},\"format\":\"pdf\"}"

test_function "导出客户数据（PDF）" "exportCustomerData" "${BASE_PARAMS%}}},\"format\":\"pdf\"}"

test_function "导出 ESG 报告（PDF）" "exportESGReport" "${BASE_PARAMS%}}},\"format\":\"pdf\"}"

echo ""

# 测试结果汇总
echo "=========================================="
echo "测试结果汇总"
echo "=========================================="
echo "总测试数: $TOTAL"
echo "通过: $PASSED"
echo "失败: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✅ 所有测试通过！"
    exit 0
else
    echo "❌ 有 $FAILED 个测试失败"
    exit 1
fi

