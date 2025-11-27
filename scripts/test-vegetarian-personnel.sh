#!/bin/bash

# 素食人员管理模块功能测试脚本
# 
# 使用方法：
# chmod +x scripts/test-vegetarian-personnel.sh
# ./scripts/test-vegetarian-personnel.sh

set -e

echo "=========================================="
echo "素食人员管理模块 - 功能测试"
echo "=========================================="
echo ""

# 环境ID
ENV_ID="my-garden-app-env-4e0h762923be2f"

# 测试用的租户ID和餐厅ID（需要根据实际情况修改）
TENANT_ID="${TENANT_ID:-test-tenant-001}"
RESTAURANT_ID="${RESTAURANT_ID:-test-restaurant-001}"

echo "📋 测试配置："
echo "   - 环境ID: $ENV_ID"
echo "   - 租户ID: $TENANT_ID"
echo "   - 餐厅ID: $RESTAURANT_ID"
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
    
    if tcb fn invoke vegetarian-personnel \
        --params "{\"action\":\"$action\",\"data\":$params}" \
        --envId "$ENV_ID" &> /dev/null; then
        echo "  ✅ 通过"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo "  ❌ 失败"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# 1. 测试员工管理接口
echo "=========================================="
echo "1. 测试员工管理接口"
echo "=========================================="
echo ""

# 1.1 创建非素食员工
test_function "创建非素食员工" "createStaff" "{
  \"restaurantId\":\"$RESTAURANT_ID\",
  \"tenantId\":\"$TENANT_ID\",
  \"basicInfo\":{
    \"name\":\"测试员工1\",
    \"position\":\"服务员\",
    \"joinDate\":\"2024-01-01\"
  },
  \"vegetarianInfo\":{
    \"isVegetarian\":false
  }
}"

# 1.2 创建素食员工（纯素）
test_function "创建素食员工（纯素）" "createStaff" "{
  \"restaurantId\":\"$RESTAURANT_ID\",
  \"tenantId\":\"$TENANT_ID\",
  \"basicInfo\":{
    \"name\":\"测试员工2\",
    \"position\":\"厨师\",
    \"joinDate\":\"2024-01-01\"
  },
  \"vegetarianInfo\":{
    \"isVegetarian\":true,
    \"vegetarianType\":\"pure\",
    \"vegetarianStartYear\":2020
  }
}"

# 1.3 查询员工列表
test_function "查询员工列表" "listStaff" "{
  \"restaurantId\":\"$RESTAURANT_ID\",
  \"tenantId\":\"$TENANT_ID\",
  \"page\":1,
  \"pageSize\":10
}"

# 1.4 获取员工统计
test_function "获取员工统计" "getStaffStats" "{
  \"restaurantId\":\"$RESTAURANT_ID\",
  \"tenantId\":\"$TENANT_ID\"
}"

# 2. 测试客户管理接口
echo ""
echo "=========================================="
echo "2. 测试客户管理接口"
echo "=========================================="
echo ""

# 2.1 创建/更新客户
test_function "创建/更新客户" "createOrUpdateCustomer" "{
  \"restaurantId\":\"$RESTAURANT_ID\",
  \"tenantId\":\"$TENANT_ID\",
  \"customerId\":\"test-customer-001\",
  \"basicInfo\":{
    \"nickname\":\"测试客户\",
    \"phone\":\"13800138000\"
  },
  \"vegetarianInfo\":{
    \"isVegetarian\":true,
    \"vegetarianType\":\"regular\",
    \"vegetarianYears\":\"3_5\",
    \"vegetarianStartYear\":2020
  }
}"

# 2.2 查询客户列表
test_function "查询客户列表" "listCustomers" "{
  \"restaurantId\":\"$RESTAURANT_ID\",
  \"tenantId\":\"$TENANT_ID\",
  \"page\":1,
  \"pageSize\":10
}"

# 2.3 获取客户统计
test_function "获取客户统计" "getCustomerStats" "{
  \"restaurantId\":\"$RESTAURANT_ID\",
  \"tenantId\":\"$TENANT_ID\"
}"

# 测试结果汇总
echo ""
echo "=========================================="
echo "测试结果汇总"
echo "=========================================="
echo "  总测试数: $TOTAL"
echo "  通过: $PASSED"
echo "  失败: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✅ 所有测试通过！"
    exit 0
else
    echo "⚠️  有 $FAILED 个测试失败，请检查云函数日志"
    exit 1
fi

