#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成完整的数据库索引配置表
基于所有版本的集合和索引配置文档
"""

import csv

# 定义所有集合的索引配置
# 格式: (集合名, 索引名, 字段列表, 排序列表, 是否唯一, 优先级, 说明, 用途)
indexes = []

# ========== v1.0 基础集合 ==========
indexes.extend([
    # users
    ('users', 'openId_unique', 'openId', '1', '是', '最高', '用户登录唯一性索引', '用户登录查询'),
    ('users', 'level_points_ranking', 'level|-1|points|-1', '', '否', '高', '排行榜查询索引', '用户排行榜排序'),
    ('users', 'lastLoginAt_index', 'lastLoginAt', '-1', '否', '中', '最后登录时间索引', '活跃用户统计'),
    
    # user_sessions
    ('user_sessions', 'userId_expiresAt_index', 'userId|expiresAt', '1|1', '否', '高', '用户会话管理索引', '会话查询和过期清理'),
    ('user_sessions', 'accessToken_index', 'accessToken', '1', '否', '最高', 'Token验证索引', 'Token验证查询'),
    ('user_sessions', 'userId_index', 'userId', '1', '否', '中', '用户ID索引', '用户会话列表查询'),
    
    # meals
    ('meals', 'userId_mealDate_index', 'userId|mealDate', '1|-1', '否', '最高', '个人餐食记录查询索引', '个人餐食记录查询（最高频）'),
    ('meals', 'userId_createdAt_index', 'userId|createdAt', '1|-1', '否', '高', '最近记录查询索引', '最近记录查询'),
    ('meals', 'userId_source_orderId_unique', 'userId|source|sourceOrderId', '1|1|1', '是', '最高', '防重复同步索引', '防止第三方订单重复同步'),
    ('meals', 'isPublic_createdAt_index', 'isPublic|createdAt', '1|-1', '否', '中', '公开动态查询索引', '公开动态查询'),
    
    # daily_stats
    ('daily_stats', 'userId_date_index', 'userId|date', '1|-1', '否', '最高', '个人统计查询索引', '个人每日统计查询'),
    ('daily_stats', 'date_carbonReduction_ranking', 'date|totalCarbonReduction', '-1|-1', '否', '高', '每日排行榜索引', '每日排行榜查询'),
    ('daily_stats', 'userId_date_unique', 'userId|date', '1|1', '是', '最高', '数据唯一性索引', '保证每日统计数据唯一性'),
    
    # gardens
    ('gardens', 'userId_unique', 'userId', '1', '是', '最高', '个人花园唯一性索引', '个人花园查询'),
    
    # ingredients
    ('ingredients', 'name_index', 'name', '1', '否', '高', '食材名称查询索引', '食材名称搜索'),
    ('ingredients', 'category_index', 'category', '1', '否', '中', '分类查询索引', '按分类查询食材'),
    
    # recipes
    ('recipes', 'usageCount_index', 'usageCount', '-1', '否', '中', '热门食谱排序索引', '热门食谱排序'),
    
    # plant_templates
    ('plant_templates', 'plantId_index', 'plantId', '1', '否', '高', '植物模板ID索引', '植物模板查询'),
    ('plant_templates', 'category_index', 'category', '1', '否', '中', '植物分类索引', '按分类查询植物'),
    
    # meat_products
    ('meat_products', 'name_unique', 'name', '1', '是', '最高', '肉类产品名称唯一性索引', '产品名称唯一性'),
    ('meat_products', 'category_subcategory_index', 'category|subcategory', '1|1', '否', '高', '分类查询索引', '按分类查询产品'),
    ('meat_products', 'carbonFootprint_index', 'carbonFootprint', '-1', '否', '中', '碳足迹排序索引', '按碳足迹排序'),
    ('meat_products', 'status_index', 'status', '1', '否', '中', '状态查询索引', '按状态查询产品'),
    
    # sync_tasks
    ('sync_tasks', 'userId_platform_status_index', 'userId|platform|status', '1|1|1', '否', '高', '任务管理索引', '任务管理查询'),
    ('sync_tasks', 'status_nextRetry_index', 'status|nextRetry', '1|1', '否', '高', '重试队列索引', '重试队列查询'),
    ('sync_tasks', 'platform_orderId_unique', 'platform|orderId', '1|1', '是', '最高', '任务唯一性索引', '任务唯一性保证'),
    
    # platform_configs
    ('platform_configs', 'platform_unique', 'platform', '1', '是', '高', '平台配置唯一性索引', '平台配置唯一性'),
    
    # friends
    ('friends', 'userId_friendId_unique', 'userId|friendId', '1|1', '是', '高', '好友关系唯一性索引', '好友关系唯一性'),
    ('friends', 'userId_status_index', 'userId|status', '1|1', '否', '高', '好友列表查询索引', '好友列表查询'),
    
    # posts
    ('posts', 'userId_createdAt_index', 'userId|createdAt', '1|-1', '否', '中', '个人动态查询索引', '个人动态查询'),
    ('posts', 'visibility_createdAt_index', 'visibility|createdAt', '1|-1', '否', '中', '公开动态流索引', '公开动态流查询'),
    
    # orders
    ('orders', 'orderNo_unique', 'orderNo', '1', '是', '最高', '订单号唯一性索引', '订单号唯一性'),
    ('orders', 'userId_createdAt_index', 'userId|createdAt', '1|-1', '否', '高', '用户订单列表索引', '用户订单列表查询'),
])

# ========== v2.0 践行者域集合 ==========
indexes.extend([
    # practitioners
    ('practitioners', 'practitionerId_unique', 'practitionerId', '1', '是', '最高', '践行者ID唯一性索引', '践行者ID唯一性'),
    ('practitioners', 'veganYears_desc', 'veganJourney.veganYears', '-1', '否', '高', '素食年限排序索引', '按素食年限排序'),
    ('practitioners', 'certification_level', 'certification.level', '1', '否', '高', '认证等级索引', '按认证等级筛选'),
    ('practitioners', 'can_be_mentor', 'certification.canBeMentor', '1', '否', '中', '导师筛选索引', '筛选可做导师的践行者'),
    ('practitioners', 'status', 'status', '1', '否', '中', '状态查询索引', '过滤活跃状态'),
    
    # practitioner_certifications
    ('practitioner_certifications', 'target_lookup', 'targetType|targetId', '1|1', '否', '高', '目标查询索引', '查询某食材/食谱的所有认证'),
    ('practitioner_certifications', 'practitioner_lookup', 'practitionerId', '1', '否', '高', '践行者查询索引', '查询某践行者的所有认证'),
    ('practitioner_certifications', 'weight_desc', 'weight', '-1', '否', '中', '权重排序索引', '按权重排序（展示优先级）'),
    ('practitioner_certifications', 'status', 'status', '1', '否', '中', '状态查询索引', '过滤活跃状态'),
    
    # tcm_wisdom
    ('tcm_wisdom', 'wisdomId_unique', 'wisdomId', '1', '是', '最高', '智慧ID唯一性索引', '智慧ID唯一性'),
    ('tcm_wisdom', 'wisdom_type', 'wisdomType', '1', '否', '高', '类型查询索引', '按类型筛选'),
    ('tcm_wisdom', 'body_type', 'bodyType.type', '1', '否', '中', '体质查询索引', '查询体质相关智慧'),
    ('tcm_wisdom', 'solar_term', 'solarTerm.term', '1', '否', '中', '节气查询索引', '查询节气相关智慧'),
    ('tcm_wisdom', 'therapy_symptom', 'therapy.symptom', '1', '否', '中', '症状查询索引', '查询食疗方案'),
    ('tcm_wisdom', 'status', 'status', '1', '否', '中', '状态查询索引', '过滤活跃状态'),
    
    # wisdom_quotes
    ('wisdom_quotes', 'quoteId_unique', 'quoteId', '1', '是', '最高', '语录ID唯一性索引', '语录ID唯一性'),
    ('wisdom_quotes', 'category_featured', 'category|featured', '1|1', '否', '高', '分类精选索引', '按分类和精选筛选'),
    ('wisdom_quotes', 'practitioner_lookup', 'practitionerId', '1', '否', '中', '践行者查询索引', '查询某践行者的语录'),
    ('wisdom_quotes', 'likes_desc', 'likes', '-1', '否', '中', '点赞排序索引', '热门排序'),
    
    # mentorship
    ('mentorship', 'mentor_status', 'mentorId|status', '1|1', '否', '高', '导师状态索引', '查询导师的活跃陪伴关系'),
    ('mentorship', 'mentee_lookup', 'menteeId', '1', '否', '高', '学员查询索引', '查询学员的陪伴关系'),
    ('mentorship', 'active_plans', 'status|plan.currentDay', '1|1', '否', '中', '活跃计划索引', '查询活跃陪伴计划'),
    ('mentorship', 'successful_cases', 'outcome.success|outcome.canBeUsedAsCase', '1|1', '否', '中', '成功案例索引', '筛选成功案例'),
    
    # user_profiles_extended
    ('user_profiles_extended', 'userId_unique', 'userId', '1', '是', '最高', '用户ID唯一性索引', '用户扩展档案唯一性'),
    ('user_profiles_extended', 'bodyType', 'bodyType.type', '1', '否', '中', '体质查询索引', '按体质查询用户'),
    ('user_profiles_extended', 'healthGoals', 'healthGoals', '数组', '否', '中', '健康目标索引', '按健康目标查询'),
    
    # knowledge_graph
    ('knowledge_graph', 'source_lookup', 'sourceType|sourceId', '1|1', '否', '高', '源节点查询索引', '查询源节点关系'),
    ('knowledge_graph', 'target_lookup', 'targetType|targetId', '1|1', '否', '高', '目标节点查询索引', '查询目标节点关系'),
    ('knowledge_graph', 'relation_type', 'relationType', '1', '否', '中', '关系类型索引', '按关系类型查询'),
])

# ========== v3.0 电商域集合 ==========
indexes.extend([
    # products
    ('products', 'productId_unique', 'productId', '1', '是', '最高', '商品ID唯一性索引', '商品ID唯一性'),
    ('products', 'category_status', 'category|status', '1|1', '否', '最高', '分类状态索引', '按分类和状态查询'),
    ('products', 'linkedData_ingredientId', 'linkedData.ingredientId', '1', '否', '高', '关联食材索引', '按关联食材查询'),
    ('products', 'practitioner_cert', 'linkedData.certifiedByPractitioners.practitionerId', '1', '否', '中', '践行者认证索引', '按践行者认证查询'),
    ('products', 'bodyTypes', 'recommendTags.bodyTypes', '1', '否', '中', '体质推荐索引', '按体质推荐查询'),
    ('products', 'solarTerms', 'recommendTags.solarTerms', '1', '否', '中', '节气推荐索引', '按节气推荐查询'),
    ('products', 'totalSales', 'salesData.totalSales', '-1', '否', '中', '销量排序索引', '按销量排序'),
    ('products', 'rating', 'salesData.rating', '-1', '否', '中', '评分排序索引', '按评分排序'),
    ('products', 'status', 'status', '1', '否', '中', '状态查询索引', '按状态查询'),
    
    # shopping_cart
    ('shopping_cart', 'userId_unique', 'userId', '1', '是', '最高', '用户购物车唯一性索引', '用户购物车唯一性'),
    
    # product_reviews
    ('product_reviews', 'productId_rating', 'productId|rating', '1|-1', '否', '高', '商品评分索引', '按商品和评分查询'),
    ('product_reviews', 'userId', 'userId', '1', '否', '中', '用户查询索引', '查询用户评价'),
    ('product_reviews', 'practitioner_rating', 'isPractitioner|rating', '1|-1', '否', '中', '践行者评分索引', '践行者评价查询'),
    
    # inventory
    ('inventory', 'productId_specId_unique', 'productId|specId', '1|1', '是', '最高', '商品规格唯一性索引', '商品规格唯一性'),
    ('inventory', 'isLowStock', 'alert.isLowStock', '1', '否', '高', '低库存索引', '低库存预警查询'),
    ('inventory', 'isOutOfStock', 'alert.isOutOfStock', '1', '否', '高', '缺货索引', '缺货预警查询'),
    
    # promotions
    ('promotions', 'promotionId_unique', 'promotionId', '1', '是', '最高', '活动ID唯一性索引', '活动ID唯一性'),
    ('promotions', 'status_startTime', 'status|startTime', '1|1', '否', '高', '活动状态时间索引', '按状态和时间查询活动'),
    ('promotions', 'targetBodyTypes', 'gardenTargeting.targetBodyTypes', '1', '否', '中', '目标体质索引', '按目标体质查询'),
    
    # coupons
    ('coupons', 'couponId_unique', 'couponId', '1', '是', '最高', '优惠券ID唯一性索引', '优惠券ID唯一性'),
    ('coupons', 'status_endTime', 'status|endTime', '1|1', '否', '高', '优惠券状态时间索引', '按状态和时间查询'),
    
    # user_coupons
    ('user_coupons', 'code_unique', 'code', '1', '是', '最高', '优惠券码唯一性索引', '优惠券码唯一性'),
    ('user_coupons', 'userId_status', 'userId|status', '1|1', '否', '高', '用户优惠券状态索引', '按用户和状态查询'),
    
    # data_dashboard
    ('data_dashboard', 'date_type', 'date|type', '-1|1', '否', '高', '日期类型索引', '按日期和类型查询'),
    ('data_dashboard', 'insights_priority', 'insights.priority', '1', '否', '中', '洞察优先级索引', '按优先级查询洞察'),
    
    # business_rules
    ('business_rules', 'ruleId_unique', 'ruleId', '1', '是', '最高', '规则ID唯一性索引', '规则ID唯一性'),
    ('business_rules', 'status_priority', 'status|priority', '1|-1', '否', '高', '规则状态优先级索引', '按状态和优先级查询'),
])

# ========== v4.0 餐厅域集合 ==========
indexes.extend([
    # restaurants
    ('restaurants', 'restaurantId_unique', 'restaurantId', '1', '是', '最高', '餐厅ID唯一性索引', '餐厅ID唯一性'),
    ('restaurants', 'tenantId_restaurantId_index', 'tenantId|restaurantId', '1|1', '否', '最高', '租户餐厅关联索引', '按租户查询餐厅列表'),
    ('restaurants', 'city_status', 'location.city|status', '1|1', '否', '高', '城市状态索引', '按城市和状态查询'),
    ('restaurants', 'certified', 'climateCertification.isCertified', '1', '否', '高', '认证状态索引', '按认证状态查询'),
    ('restaurants', 'certificationLevel', 'climateCertification.certificationLevel', '1', '否', '中', '认证等级索引', '按认证等级查询'),
    ('restaurants', 'category', 'category', '1', '否', '中', '分类索引', '按分类查询'),
    ('restaurants', 'overallRating', 'ratings.overallRating', '-1', '否', '中', '评分排序索引', '按评分排序'),
    ('restaurants', 'carbonReduction', 'carbonImpact.totalCarbonReduction', '-1', '否', '中', '碳减排排序索引', '按碳减排排序'),
    ('restaurants', 'certificationStatus_index', 'certificationStatus', '1', '否', '高', '认证状态索引', '按认证状态查询餐厅'),
    ('restaurants', 'tenantId_certificationStatus_index', 'tenantId|certificationStatus', '1|1', '否', '高', '租户认证状态索引', '按租户和认证状态查询'),
    
    # restaurant_menus
    ('restaurant_menus', 'tenant_menuType_status', 'tenantId|menuType|status', '1|1|1', '否', '高', '租户菜单类型状态索引', '按租户菜单类型和状态查询'),
    ('restaurant_menus', 'restaurantId', 'restaurantId', '1', '否', '高', '餐厅ID索引', '按餐厅查询菜单'),
    
    # restaurant_menu_items
    ('restaurant_menu_items', 'menuItemId_unique', 'menuItemId', '1', '是', '最高', '菜品ID唯一性索引', '菜品ID唯一性'),
    ('restaurant_menu_items', 'menu_itemSku', 'menuId|skuCode', '1|1', '否', '高', '菜单SKU索引', '按菜单和SKU查询'),
    ('restaurant_menu_items', 'restaurant_status', 'restaurantId|status', '1|1', '否', '高', '餐厅状态索引', '按餐厅和状态查询'),
    ('restaurant_menu_items', 'carbonLabel', 'carbonData.carbonLabel', '1', '否', '中', '碳标签索引', '按碳标签查询'),
    ('restaurant_menu_items', 'carbonScore', 'carbonData.carbonScore', '-1', '否', '中', '碳评分排序索引', '按碳评分排序'),
    
    # restaurant_orders
    ('restaurant_orders', 'orderId_unique', 'orderId', '1', '是', '最高', '订单ID唯一性索引', '订单ID唯一性'),
    ('restaurant_orders', 'tenant_restaurant_time', 'tenantId|restaurantId|createdAt', '1|1|-1', '否', '最高', '租户餐厅时间索引', '按租户餐厅和时间查询'),
    ('restaurant_orders', 'userId_createdAt', 'userId|createdAt', '1|-1', '否', '高', '用户时间索引', '按用户和时间查询'),
    ('restaurant_orders', 'restaurant_status', 'restaurantId|status', '1|1', '否', '高', '餐厅状态索引', '按餐厅和状态查询'),
    
    # restaurant_reservations
    ('restaurant_reservations', 'reservationId_unique', 'reservationId', '1', '是', '最高', '预订ID唯一性索引', '预订ID唯一性'),
    ('restaurant_reservations', 'restaurant_time', 'restaurantId|reservationTime', '1|-1', '否', '高', '餐厅时间索引', '按餐厅和时间查询'),
    ('restaurant_reservations', 'userId', 'userId', '1', '否', '中', '用户索引', '按用户查询预订'),
    ('restaurant_reservations', 'status', 'status', '1', '否', '中', '状态索引', '按状态查询'),
    
    # restaurant_members
    ('restaurant_members', 'tenant_user', 'tenantId|userId', '1|1', '否', '高', '租户用户索引', '按租户和用户查询'),
    ('restaurant_members', 'restaurantId', 'restaurantId', '1', '否', '中', '餐厅ID索引', '按餐厅查询会员'),
    
    # restaurant_campaigns
    ('restaurant_campaigns', 'tenant_status', 'tenantId|status|startTime', '1|1|-1', '否', '高', '租户状态时间索引', '按租户状态和时间查询'),
    ('restaurant_campaigns', 'restaurantId', 'restaurantId', '1', '否', '中', '餐厅ID索引', '按餐厅查询活动'),
    
    # restaurant_reviews
    ('restaurant_reviews', 'tenant_restaurant_reviewId', 'tenantId|restaurantId|reviewId', '1|1|1', '否', '高', '租户餐厅评价索引', '按租户餐厅和评价查询'),
    ('restaurant_reviews', 'restaurantId_rating', 'restaurantId|rating', '1|-1', '否', '中', '餐厅评分索引', '按餐厅和评分查询'),
    
    # carbon_credits
    ('carbon_credits', 'tenant_user', 'tenantId|userId', '1|1', '否', '最高', '租户用户索引', '按租户和用户查询碳积分'),
    ('carbon_credits', 'level', 'level.currentLevel', '1', '否', '中', '等级索引', '按等级查询'),
    ('carbon_credits', 'totalCredits', 'account.totalCredits', '-1', '否', '中', '总积分排序索引', '按总积分排序'),
    
    # carbon_transactions
    ('carbon_transactions', 'tenant_transactionId', 'tenantId|transactionId', '1|1', '否', '最高', '租户交易ID索引', '按租户和交易ID查询'),
    ('carbon_transactions', 'userId_createdAt', 'userId|createdAt', '1|-1', '否', '高', '用户时间索引', '按用户和时间查询'),
    ('carbon_transactions', 'transactionType', 'transactionType', '1', '否', '中', '交易类型索引', '按交易类型查询'),
    
    # carbon_exchange_records
    ('carbon_exchange_records', 'exchangeId', 'exchangeId', '1', '否', '高', '交易所ID索引', '按交易所查询'),
    ('carbon_exchange_records', 'status', 'status', '1', '否', '中', '状态索引', '按状态查询'),
    
    # carbon_milestones
    ('carbon_milestones', 'tenant_milestoneId', 'tenantId|milestoneId', '1|1', '否', '高', '租户里程碑索引', '按租户和里程碑查询'),
    ('carbon_milestones', 'achievedAt', 'achievedAt', '-1', '否', '中', '达成时间索引', '按达成时间排序'),
    
    # government_programs
    ('government_programs', 'programId', 'programId', '1', '否', '高', '项目ID索引', '按项目ID查询'),
    ('government_programs', 'status', 'status', '1', '否', '中', '状态索引', '按状态查询'),
    
    # public_participation
    ('public_participation', 'tenant_activityId', 'tenantId|activityId', '1|1', '否', '高', '租户活动索引', '按租户和活动查询'),
    ('public_participation', 'activityType', 'activityType', '1', '否', '中', '活动类型索引', '按活动类型查询'),
    
    # esg_reports
    ('esg_reports', 'reportId', 'reportId', '1', '否', '高', '报告ID索引', '按报告ID查询'),
    ('esg_reports', 'reportType', 'reportType', '1', '否', '中', '报告类型索引', '按报告类型查询'),
])

# ========== v5.0 多域集合 ==========
indexes.extend([
    # tenants
    ('tenants', 'tenantId_unique', 'tenantId', '1', '是', '最高', '租户ID唯一性索引', '租户ID唯一性'),
    
    # staff_accounts
    ('staff_accounts', 'tenant_user_roles', 'tenantId|userId|roles', '1|1|1', '否', '高', '租户用户角色索引', '按租户用户和角色查询'),
    
    # restaurant_profiles
    ('restaurant_profiles', 'tenant_restaurant_version', 'tenantId|restaurantId|version', '1|1|-1', '否', '高', '租户餐厅版本索引', '按租户餐厅和版本查询'),
    
    # restaurant_operation_ledgers
    ('restaurant_operation_ledgers', 'restaurant_ledgerType_period', 'restaurantId|ledgerType|period', '1|1|-1', '否', '高', '餐厅台账类型周期索引', '按餐厅台账类型和周期查询'),
    
    # restaurant_behavior_metrics
    ('restaurant_behavior_metrics', 'restaurant_period', 'restaurantId|period', '1|-1', '否', '高', '餐厅周期索引', '按餐厅和周期查询'),
    
    # certification_applications
    ('certification_applications', 'tenant_restaurant_stage', 'tenantId|restaurantId|currentStage', '1|1|1', '否', '高', '租户餐厅阶段索引', '按租户餐厅和阶段查询'),
    ('certification_applications', 'status', 'status', '1', '否', '高', '状态索引', '按状态查询申请'),
    
    # certification_stages
    ('certification_stages', 'application_stageType', 'applicationId|stageType|updatedAt', '1|1|-1', '否', '高', '申请阶段类型索引', '按申请和阶段类型查询'),
    
    # assessment_items
    ('assessment_items', 'application_metric', 'applicationId|metricCode', '1|1', '否', '高', '申请指标索引', '按申请和指标查询'),
    
    # certification_badges
    ('certification_badges', 'restaurant_certLevel', 'restaurantId|certLevel|expiresAt', '1|1|-1', '否', '高', '餐厅认证等级索引', '按餐厅和认证等级查询'),
    
    # certification_documents
    ('certification_documents', 'application_fileType', 'applicationId|fileType', '1|1', '否', '高', '申请文件类型索引', '按申请和文件类型查询'),
    
    # recipe_versions
    ('recipe_versions', 'menuItem_version', 'menuItemId|version', '1|-1', '否', '高', '菜品版本索引', '按菜品和版本查询'),
    
    # carbon_factors
    ('carbon_factors', 'factorType_reference', 'factorType|reference', '1|1', '否', '高', '因子类型参考索引', '按因子类型和参考查询'),
    
    # carbon_assessments
    ('carbon_assessments', 'target_period', 'targetType|targetId|timeSpan.start', '1|1|-1', '否', '高', '目标周期索引', '按目标和周期查询'),
    
    # suppliers
    ('suppliers', 'supplier_type_region', 'supplierType|region', '1|1', '否', '高', '供应商类型地区索引', '按供应商类型和地区查询'),
    ('suppliers', 'tenant_supplierId', 'tenantId|supplierId', '1|1', '否', '高', '租户供应商索引', '按租户和供应商查询'),
    
    # ingredient_lots
    ('ingredient_lots', 'ingredient_batch', 'ingredientId|harvestDate', '1|-1', '否', '高', '食材批次索引', '按食材和收获日期查询'),
    ('ingredient_lots', 'supplier_harvestDate', 'supplierId|harvestDate', '1|-1', '否', '中', '供应商收获日期索引', '按供应商和收获日期查询'),
    
    # trace_chains
    ('trace_chains', 'menuItem_lot', 'menuItemId|lotId', '1|1', '否', '高', '菜品批次索引', '按菜品和批次查询'),
    
    # trace_nodes
    ('trace_nodes', 'trace_nodeType_time', 'traceId|nodeType|timestamp', '1|1|-1', '否', '高', '溯源节点类型时间索引', '按溯源节点类型和时间查询'),
    
    # points_accounts
    ('points_accounts', 'user_pointsType', 'userId|pointsType|tenantId', '1|1|1', '否', '高', '用户积分类型索引', '按用户积分类型和租户查询'),
    
    # behavior_records
    ('behavior_records', 'user_behaviorType_time', 'userId|behaviorType|timestamp', '1|1|-1', '否', '高', '用户行为类型时间索引', '按用户行为类型和时间查询'),
    
    # feedback_records
    ('feedback_records', 'owner_rating', 'ownerType|ownerId|rating', '1|1|-1', '否', '高', '所有者评分索引', '按所有者和评分查询'),
    
    # kpi_definitions
    ('kpi_definitions', 'domain_kpi', 'domain|kpiId', '1|1', '否', '高', '域指标索引', '按域和指标查询'),
    
    # data_snapshots
    ('data_snapshots', 'snapshotType_period', 'snapshotType|period|aggregationLevel', '1|-1|1', '否', '高', '快照类型周期索引', '按快照类型周期和聚合级别查询'),
    
    # report_templates
    ('report_templates', 'template_type', 'templateType|version', '1|-1', '否', '高', '模板类型版本索引', '按模板类型和版本查询'),
    
    # regulatory_exports
    ('regulatory_exports', 'agency_status', 'agency|status|submittedAt', '1|1|-1', '否', '高', '机构状态提交时间索引', '按机构状态和提交时间查询'),
    
    # dictionary_entries
    ('dictionary_entries', 'dictionaryCode_value', 'dictionaryCode|value', '1|1', '否', '高', '字典代码值索引', '按字典代码和值查询'),
    
    # strategy_rules
    ('strategy_rules', 'ruleType_version', 'ruleType|version', '1|-1', '否', '高', '规则类型版本索引', '按规则类型和版本查询'),
    
    # task_schedules
    ('task_schedules', 'jobType_status', 'jobType|status', '1|1', '否', '高', '任务类型状态索引', '按任务类型和状态查询'),
])

# ========== 管理后台集合 ==========
indexes.extend([
    # admin_users
    ('admin_users', 'username_unique', 'username', '1', '是', '最高', '管理员用户名唯一性索引', '管理员登录查询'),
    ('admin_users', 'role_index', 'role', '1', '否', '高', '角色查询索引', '按角色查询管理员'),
    ('admin_users', 'tenantId_index', 'tenantId', '1', '否', '高', '租户查询索引', '按租户查询管理员'),
    ('admin_users', 'status_index', 'status', '1', '否', '高', '状态查询索引', '按状态查询管理员'),
    ('admin_users', 'createdAt_index', 'createdAt', '-1', '否', '中', '创建时间索引', '按创建时间排序'),
    ('admin_users', 'lastLoginAt_index', 'lastLoginAt', '-1', '否', '中', '最后登录时间索引', '按最后登录时间排序'),
    ('admin_users', 'role_status_index', 'role|status', '1|1', '否', '高', '角色和状态组合索引', '按角色和状态查询'),
    
    # role_configs
    ('role_configs', 'roleCode_unique', 'roleCode', '1', '是', '最高', '角色代码唯一性索引', '角色代码唯一性'),
    ('role_configs', 'status_index', 'status', '1', '否', '高', '状态查询索引', '按状态查询角色'),
    ('role_configs', 'createdAt_index', 'createdAt', '-1', '否', '中', '创建时间索引', '按创建时间排序'),
    
    # permissions
    ('permissions', 'permissionCode_unique', 'permissionCode', '1', '是', '最高', '权限代码唯一性索引', '权限代码唯一性'),
    ('permissions', 'module_index', 'module', '1', '否', '高', '模块查询索引', '按模块查询权限'),
    ('permissions', 'category_index', 'category', '1', '否', '中', '类别查询索引', '按类别查询权限'),
    ('permissions', 'createdAt_index', 'createdAt', '-1', '否', '中', '创建时间索引', '按创建时间排序'),
    
    # audit_logs
    ('audit_logs', 'userId_createdAt_index', 'userId|createdAt', '1|-1', '否', '最高', '用户操作日志索引', '查询用户操作日志'),
    ('audit_logs', 'role_index', 'role', '1', '否', '高', '角色查询索引', '按角色查询日志'),
    ('audit_logs', 'action_index', 'action', '1', '否', '高', '操作类型索引', '按操作类型查询日志'),
    ('audit_logs', 'resource_index', 'resource', '1', '否', '高', '资源查询索引', '按资源查询日志'),
    ('audit_logs', 'tenant_resource_time', 'tenantId|resource|timestamp', '1|1|-1', '否', '最高', '租户资源操作日志索引', '查询租户资源操作日志'),
    ('audit_logs', 'status_index', 'status', '1', '否', '高', '状态查询索引', '按状态查询日志'),
    ('audit_logs', 'createdAt_index', 'createdAt', '-1', '否', '高', '创建时间索引', '按时间排序查询日志'),
])

# ========== 消息管理集合 ==========
indexes.extend([
    # messages
    ('messages', 'type_status_createdAt_index', 'type|status|createdAt', '1|1|-1', '否', '高', '消息类型状态时间索引', '按类型和状态查询消息'),
    ('messages', 'targetUsers_index', 'targetUsers', '数组', '否', '中', '目标用户数组索引', '按目标用户查询消息'),
    ('messages', 'targetRoles_index', 'targetRoles', '数组', '否', '中', '目标角色数组索引', '按目标角色查询消息'),
    ('messages', 'direction_type_createdAt_index', 'direction|type|createdAt', '1|1|-1', '否', '高', '消息方向类型时间索引', '按方向和类型查询消息'),
    ('messages', 'relatedEntityId_relatedEntityType_index', 'relatedEntityId|relatedEntityType', '1|1', '否', '中', '关联实体索引', '按关联实体查询消息'),
    ('messages', 'eventType_createdAt_index', 'eventType|createdAt', '1|-1', '否', '中', '事件类型时间索引', '按事件类型查询消息'),
    
    # user_messages
    ('user_messages', 'userId_status_createdAt_index', 'userId|status|createdAt', '1|1|-1', '否', '最高', '用户消息状态时间索引', '用户消息列表查询（最高频）'),
    ('user_messages', 'messageId_userId_index', 'messageId|userId', '1|1', '是', '最高', '消息用户关联唯一性索引', '防止重复关联'),
    
    # message_event_rules
    ('message_event_rules', 'eventType_enabled_index', 'eventType|enabled', '1|1', '否', '高', '事件类型启用状态索引', '按事件类型和启用状态查询规则'),
])

# ========== 租户申请集合 ==========
indexes.extend([
    # tenant_applications
    ('tenant_applications', 'status_createdAt_index', 'status|createdAt', '1|-1', '否', '高', '申请状态时间索引', '按状态查询申请列表'),
    ('tenant_applications', 'organizationName_index', 'organizationName', '1', '否', '中', '组织名称索引', '按组织名称搜索'),
])

# 写入CSV文件
output_file = 'Docs/索引配置表.csv'
with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['集合名称', '索引名称', '索引字段', '字段排序', '唯一索引', '优先级', '说明', '用途'])
    
    for idx in indexes:
        writer.writerow(idx)

print(f"✅ 索引配置表生成完成！")
print(f"📊 统计信息：")
print(f"   - 总索引数: {len(indexes)}")
print(f"   - 集合数: {len(set(idx[0] for idx in indexes))}")
print(f"   - 唯一索引数: {sum(1 for idx in indexes if idx[4] == '是')}")
print(f"\n📁 文件已保存至: {output_file}")

