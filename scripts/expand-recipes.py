#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
食谱数据扩展脚本
从18道扩展到50道（新增32道）
"""

import json
import os

# 新增的32道食谱数据
new_recipes = [
    # 中式经典素食 +7道 (004-010)
    {
        "recipeId": "chinese_vegan_004",
        "name": "红烧狮子头（素）",
        "nameEn": "Vegan Braised Meatballs",
        "category": "chinese_vegan",
        "cuisine": "jiangsu",
        "difficulty": "hard",
        "cookingTime": 50,
        "servings": 3,
        "ingredients": [
            {"name": "豆腐", "amount": 300, "unit": "g"},
            {"name": "香菇", "amount": 150, "unit": "g"},
            {"name": "胡萝卜", "amount": 100, "unit": "g"},
            {"name": "马蹄", "amount": 80, "unit": "g"},
            {"name": "姜", "amount": 15, "unit": "g"},
            {"name": "大葱", "amount": 30, "unit": "g"},
            {"name": "酱油", "amount": 40, "unit": "ml"},
            {"name": "植物油", "amount": 30, "unit": "ml"}
        ],
        "cookingMethod": "炖",
        "cookingSteps": [
            "豆腐压碎，香菇、胡萝卜、马蹄切碎",
            "所有食材混合，加入调料拌匀",
            "揉成大丸子，表面煎至金黄",
            "加入酱汁，小火炖煮30分钟",
            "大火收汁，装盘"
        ],
        "tags": ["素食", "淮扬菜", "宴客", "传统", "节日"],
        "carbonComparison": {
            "meatVersion": "红烧狮子头",
            "meatCarbon": 12.5,
            "veganCarbon": 0.9,
            "savingsPercent": 92.8
        },
        "season": "autumn,winter",
        "nutritionHighlight": "高蛋白、低脂",
        "tips": "丸子要捏紧实，下锅煎定型后再翻面",
        "status": "active"
    },
    {
        "recipeId": "chinese_vegan_005",
        "name": "糖醋素排骨",
        "nameEn": "Sweet and Sour Vegan Ribs",
        "category": "chinese_vegan",
        "cuisine": "chinese",
        "difficulty": "medium",
        "cookingTime": 35,
        "servings": 2,
        "ingredients": [
            {"name": "藕", "amount": 400, "unit": "g"},
            {"name": "番茄酱", "amount": 50, "unit": "g"},
            {"name": "醋", "amount": 30, "unit": "ml"},
            {"name": "糖", "amount": 40, "unit": "g"},
            {"name": "姜", "amount": 10, "unit": "g"},
            {"name": "大葱", "amount": 20, "unit": "g"},
            {"name": "植物油", "amount": 30, "unit": "ml"}
        ],
        "cookingMethod": "炸",
        "cookingSteps": [
            "藕切成排骨状，焯水",
            "裹上淀粉，油炸至金黄",
            "调制糖醋汁：番茄酱、醋、糖混合",
            "热锅少油，炒香姜葱",
            "倒入糖醋汁和藕块，翻炒均匀",
            "撒上白芝麻"
        ],
        "tags": ["素食", "糖醋", "开胃", "家常", "下饭"],
        "carbonComparison": {
            "meatVersion": "糖醋排骨",
            "meatCarbon": 8.3,
            "veganCarbon": 0.6,
            "savingsPercent": 92.8
        },
        "season": "all",
        "nutritionHighlight": "富含膳食纤维",
        "tips": "藕要选粉藕，口感更糯",
        "status": "active"
    },
    {
        "recipeId": "chinese_vegan_006",
        "name": "佛跳墙（素）",
        "nameEn": "Vegan Buddha Jumps Over the Wall",
        "category": "chinese_vegan",
        "cuisine": "fujian",
        "difficulty": "hard",
        "cookingTime": 120,
        "servings": 4,
        "ingredients": [
            {"name": "香菇", "amount": 200, "unit": "g"},
            {"name": "竹笋", "amount": 150, "unit": "g"},
            {"name": "豆腐皮", "amount": 100, "unit": "g"},
            {"name": "莲子", "amount": 80, "unit": "g"},
            {"name": "银耳", "amount": 50, "unit": "g"},
            {"name": "红枣", "amount": 50, "unit": "g"},
            {"name": "姜", "amount": 20, "unit": "g"},
            {"name": "料酒", "amount": 30, "unit": "ml"}
        ],
        "cookingMethod": "炖",
        "cookingSteps": [
            "各种食材分别泡发处理",
            "香菇、竹笋切块",
            "豆腐皮打结",
            "所有食材分层放入砂锅",
            "加入调料和高汤",
            "小火慢炖2小时"
        ],
        "tags": ["素食", "闽菜", "养生", "宴客", "高档"],
        "carbonComparison": {
            "meatVersion": "佛跳墙",
            "meatCarbon": 18.5,
            "veganCarbon": 1.2,
            "savingsPercent": 93.5
        },
        "season": "winter",
        "nutritionHighlight": "滋补养生、多种营养",
        "tips": "要用砂锅小火慢炖，才能入味",
        "status": "active"
    },
    {
        "recipeId": "chinese_vegan_007",
        "name": "干锅素菜",
        "nameEn": "Dry Pot Vegetables",
        "category": "chinese_vegan",
        "cuisine": "sichuan",
        "difficulty": "easy",
        "cookingTime": 25,
        "servings": 3,
        "ingredients": [
            {"name": "土豆", "amount": 200, "unit": "g"},
            {"name": "莲藕", "amount": 150, "unit": "g"},
            {"name": "花菜", "amount": 200, "unit": "g"},
            {"name": "香菇", "amount": 100, "unit": "g"},
            {"name": "干辣椒", "amount": 20, "unit": "g"},
            {"name": "花椒", "amount": 5, "unit": "g"},
            {"name": "姜", "amount": 15, "unit": "g"},
            {"name": "植物油", "amount": 40, "unit": "ml"}
        ],
        "cookingMethod": "炒",
        "cookingSteps": [
            "所有蔬菜切块，焯水",
            "热锅多油，煸炒干辣椒和花椒",
            "加入姜蒜爆香",
            "下入所有蔬菜大火翻炒",
            "加入调料，炒至入味",
            "转入干锅，撒上香菜"
        ],
        "tags": ["素食", "川菜", "麻辣", "下饭", "聚餐"],
        "carbonComparison": {
            "meatVersion": "干锅鸡",
            "meatCarbon": 5.2,
            "veganCarbon": 0.7,
            "savingsPercent": 86.5
        },
        "season": "all",
        "nutritionHighlight": "多种蔬菜、营养丰富",
        "tips": "蔬菜要炒干一点，口感更好",
        "status": "active"
    },
    {
        "recipeId": "chinese_vegan_008",
        "name": "素食八宝饭",
        "nameEn": "Eight Treasure Rice",
        "category": "chinese_vegan",
        "cuisine": "chinese",
        "difficulty": "medium",
        "cookingTime": 60,
        "servings": 4,
        "ingredients": [
            {"name": "糯米", "amount": 400, "unit": "g"},
            {"name": "红豆", "amount": 80, "unit": "g"},
            {"name": "莲子", "amount": 50, "unit": "g"},
            {"name": "红枣", "amount": 60, "unit": "g"},
            {"name": "桂圆", "amount": 40, "unit": "g"},
            {"name": "葡萄干", "amount": 40, "unit": "g"},
            {"name": "核桃", "amount": 30, "unit": "g"},
            {"name": "糖", "amount": 60, "unit": "g"}
        ],
        "cookingMethod": "蒸",
        "cookingSteps": [
            "糯米提前浸泡4小时",
            "红豆、莲子煮至半熟",
            "碗底抹油，摆放各种果料",
            "糯米蒸熟，加糖拌匀",
            "将糯米饭压入碗中",
            "上锅蒸30分钟，倒扣装盘"
        ],
        "tags": ["素食", "甜品", "节日", "传统", "喜庆"],
        "carbonComparison": {
            "meatVersion": "八宝饭（含猪油）",
            "meatCarbon": 2.8,
            "veganCarbon": 0.5,
            "savingsPercent": 82.1
        },
        "season": "winter",
        "nutritionHighlight": "多种谷物和坚果",
        "tips": "糯米要蒸透，才容易成型",
        "status": "active"
    },
    {
        "recipeId": "chinese_vegan_009",
        "name": "素炒三鲜",
        "nameEn": "Stir-Fried Three Delicacies",
        "category": "chinese_vegan",
        "cuisine": "chinese",
        "difficulty": "easy",
        "cookingTime": 15,
        "servings": 2,
        "ingredients": [
            {"name": "木耳", "amount": 80, "unit": "g"},
            {"name": "黄瓜", "amount": 150, "unit": "g"},
            {"name": "胡萝卜", "amount": 100, "unit": "g"},
            {"name": "姜", "amount": 10, "unit": "g"},
            {"name": "蒜", "amount": 10, "unit": "g"},
            {"name": "植物油", "amount": 20, "unit": "ml"}
        ],
        "cookingMethod": "炒",
        "cookingSteps": [
            "木耳泡发，黄瓜、胡萝卜切片",
            "热锅凉油，炒香姜蒜",
            "下入胡萝卜翻炒",
            "加入木耳和黄瓜",
            "快速翻炒，调味出锅"
        ],
        "tags": ["素食", "清淡", "快手", "家常", "健康"],
        "carbonComparison": {
            "meatVersion": "肉炒三鲜",
            "meatCarbon": 3.5,
            "veganCarbon": 0.3,
            "savingsPercent": 91.4
        },
        "season": "all",
        "nutritionHighlight": "低卡、富含膳食纤维",
        "tips": "黄瓜最后下锅，保持脆嫩",
        "status": "active"
    },
    {
        "recipeId": "chinese_vegan_010",
        "name": "素食烧卖",
        "nameEn": "Vegan Shumai",
        "category": "chinese_vegan",
        "cuisine": "cantonese",
        "difficulty": "hard",
        "cookingTime": 45,
        "servings": 20,
        "ingredients": [
            {"name": "糯米", "amount": 200, "unit": "g"},
            {"name": "香菇", "amount": 100, "unit": "g"},
            {"name": "竹笋", "amount": 80, "unit": "g"},
            {"name": "胡萝卜", "amount": 60, "unit": "g"},
            {"name": "豌豆", "amount": 50, "unit": "g"},
            {"name": "烧卖皮", "amount": 20, "unit": "张"},
            {"name": "姜", "amount": 10, "unit": "g"},
            {"name": "酱油", "amount": 20, "unit": "ml"}
        ],
        "cookingMethod": "蒸",
        "cookingSteps": [
            "糯米提前蒸熟",
            "香菇、竹笋、胡萝卜切丁",
            "炒香所有食材，加入糯米饭拌匀",
            "烧卖皮包入馅料",
            "捏成花边形状",
            "上锅蒸15分钟"
        ],
        "tags": ["素食", "点心", "粤菜", "早茶", "传统"],
        "carbonComparison": {
            "meatVersion": "猪肉烧卖",
            "meatCarbon": 4.2,
            "veganCarbon": 0.6,
            "savingsPercent": 85.7
        },
        "season": "all",
        "nutritionHighlight": "糯米养胃、营养均衡",
        "tips": "包的时候底部要留空隙，蒸的时候才不会粘",
        "status": "active"
    },

    # 快手简餐 +5道 (004-008)
    {
        "recipeId": "quick_meal_004",
        "name": "西红柿鸡蛋面",
        "nameEn": "Tomato Noodle Soup",
        "category": "quick_meal",
        "cuisine": "chinese",
        "difficulty": "easy",
        "cookingTime": 12,
        "servings": 1,
        "ingredients": [
            {"name": "面条", "amount": 150, "unit": "g"},
            {"name": "番茄", "amount": 200, "unit": "g"},
            {"name": "豆腐", "amount": 100, "unit": "g"},
            {"name": "大葱", "amount": 15, "unit": "g"},
            {"name": "酱油", "amount": 10, "unit": "ml"},
            {"name": "植物油", "amount": 15, "unit": "ml"}
        ],
        "cookingMethod": "煮",
        "cookingSteps": [
            "番茄切块，豆腐切片",
            "热锅炒香葱段",
            "加入番茄炒出汁",
            "加水煮沸，放入豆腐",
            "下入面条煮熟",
            "调味出锅"
        ],
        "tags": ["素食", "快手", "面食", "汤面", "简单"],
        "carbonComparison": {
            "meatVersion": "鸡蛋西红柿面",
            "meatCarbon": 1.8,
            "veganCarbon": 0.4,
            "savingsPercent": 77.8
        },
        "season": "all",
        "nutritionHighlight": "番茄红素丰富",
        "tips": "番茄要炒出沙感，汤汁更浓",
        "status": "active"
    },
    {
        "recipeId": "quick_meal_005",
        "name": "五彩炒饭",
        "nameEn": "Colorful Fried Rice",
        "category": "quick_meal",
        "cuisine": "chinese",
        "difficulty": "easy",
        "cookingTime": 10,
        "servings": 1,
        "ingredients": [
            {"name": "米饭", "amount": 200, "unit": "g"},
            {"name": "玉米粒", "amount": 50, "unit": "g"},
            {"name": "豌豆", "amount": 40, "unit": "g"},
            {"name": "胡萝卜", "amount": 40, "unit": "g"},
            {"name": "黄瓜", "amount": 40, "unit": "g"},
            {"name": "大葱", "amount": 15, "unit": "g"},
            {"name": "酱油", "amount": 10, "unit": "ml"},
            {"name": "植物油", "amount": 15, "unit": "ml"}
        ],
        "cookingMethod": "炒",
        "cookingSteps": [
            "所有蔬菜切丁",
            "热锅加油，炒香葱花",
            "加入蔬菜粒炒熟",
            "倒入米饭炒散",
            "加入酱油翻炒均匀"
        ],
        "tags": ["素食", "快手", "炒饭", "五彩", "营养"],
        "carbonComparison": {
            "meatVersion": "扬州炒饭",
            "meatCarbon": 2.5,
            "veganCarbon": 0.4,
            "savingsPercent": 84.0
        },
        "season": "all",
        "nutritionHighlight": "多种蔬菜、色彩丰富",
        "tips": "米饭要用隔夜饭，炒出来粒粒分明",
        "status": "active"
    },
    {
        "recipeId": "quick_meal_006",
        "name": "豆腐脑",
        "nameEn": "Tofu Pudding",
        "category": "quick_meal",
        "cuisine": "chinese",
        "difficulty": "easy",
        "cookingTime": 8,
        "servings": 1,
        "ingredients": [
            {"name": "嫩豆腐", "amount": 300, "unit": "g"},
            {"name": "香菜", "amount": 10, "unit": "g"},
            {"name": "榨菜", "amount": 20, "unit": "g"},
            {"name": "辣椒油", "amount": 5, "unit": "ml"},
            {"name": "酱油", "amount": 10, "unit": "ml"},
            {"name": "醋", "amount": 5, "unit": "ml"}
        ],
        "cookingMethod": "直接食用",
        "cookingSteps": [
            "嫩豆腐加热至温热",
            "盛入碗中",
            "加入酱油、醋、辣椒油",
            "撒上香菜和榨菜碎",
            "拌匀即可食用"
        ],
        "tags": ["素食", "快手", "早餐", "传统", "豆制品"],
        "carbonComparison": {
            "meatVersion": "羊杂豆腐脑",
            "meatCarbon": 3.8,
            "veganCarbon": 0.3,
            "savingsPercent": 92.1
        },
        "season": "all",
        "nutritionHighlight": "高蛋白、易消化",
        "tips": "豆腐要嫩豆腐，口感更滑",
        "status": "active"
    },
    {
        "recipeId": "quick_meal_007",
        "name": "蔬菜卷饼",
        "nameEn": "Vegetable Wrap",
        "category": "quick_meal",
        "cuisine": "fusion",
        "difficulty": "easy",
        "cookingTime": 15,
        "servings": 2,
        "ingredients": [
            {"name": "面粉", "amount": 150, "unit": "g"},
            {"name": "生菜", "amount": 80, "unit": "g"},
            {"name": "番茄", "amount": 100, "unit": "g"},
            {"name": "黄瓜", "amount": 80, "unit": "g"},
            {"name": "豆腐", "amount": 100, "unit": "g"},
            {"name": "甜面酱", "amount": 20, "unit": "g"}
        ],
        "cookingMethod": "烙",
        "cookingSteps": [
            "面粉加水和成软面团",
            "擀成薄饼，烙熟",
            "豆腐切条煎香",
            "生菜、番茄、黄瓜切丝",
            "饼上抹甜面酱",
            "包入蔬菜和豆腐卷起"
        ],
        "tags": ["素食", "快手", "卷饼", "便携", "午餐"],
        "carbonComparison": {
            "meatVersion": "烤鸭卷饼",
            "meatCarbon": 5.5,
            "veganCarbon": 0.4,
            "savingsPercent": 92.7
        },
        "season": "all",
        "nutritionHighlight": "营养均衡、方便携带",
        "tips": "饼要烙薄一点，卷起来更好吃",
        "status": "active"
    },
    {
        "recipeId": "quick_meal_008",
        "name": "素食三明治",
        "nameEn": "Vegan Sandwich",
        "category": "quick_meal",
        "cuisine": "western",
        "difficulty": "easy",
        "cookingTime": 10,
        "servings": 1,
        "ingredients": [
            {"name": "全麦面包", "amount": 4, "unit": "片"},
            {"name": "生菜", "amount": 50, "unit": "g"},
            {"name": "番茄", "amount": 80, "unit": "g"},
            {"name": "黄瓜", "amount": 60, "unit": "g"},
            {"name": "豆腐", "amount": 100, "unit": "g"},
            {"name": "花生酱", "amount": 20, "unit": "g"}
        ],
        "cookingMethod": "组装",
        "cookingSteps": [
            "豆腐切片煎至金黄",
            "番茄、黄瓜切片",
            "面包片烤香",
            "抹上花生酱",
            "依次叠放蔬菜和豆腐",
            "盖上另一片面包，切半"
        ],
        "tags": ["素食", "快手", "早餐", "西式", "便携"],
        "carbonComparison": {
            "meatVersion": "火腿三明治",
            "meatCarbon": 2.8,
            "veganCarbon": 0.5,
            "savingsPercent": 82.1
        },
        "season": "all",
        "nutritionHighlight": "全麦高纤、营养丰富",
        "tips": "可以提前做好，用保鲜膜包好带走",
        "status": "active"
    },

    # 高蛋白食谱 +5道 (004-008)
    {
        "recipeId": "high_protein_004",
        "name": "素食健身碗",
        "nameEn": "Vegan Power Bowl",
        "category": "high_protein",
        "cuisine": "fusion",
        "difficulty": "easy",
        "cookingTime": 20,
        "servings": 1,
        "ingredients": [
            {"name": "藜麦", "amount": 80, "unit": "g"},
            {"name": "豆腐", "amount": 150, "unit": "g"},
            {"name": "西兰花", "amount": 100, "unit": "g"},
            {"name": "鹰嘴豆", "amount": 80, "unit": "g"},
            {"name": "紫甘蓝", "amount": 50, "unit": "g"},
            {"name": "牛油果", "amount": 80, "unit": "g"},
            {"name": "橄榄油", "amount": 15, "unit": "ml"}
        ],
        "cookingMethod": "蒸煮",
        "cookingSteps": [
            "藜麦煮熟晾凉",
            "豆腐切块煎香",
            "西兰花焯水",
            "鹰嘴豆煮熟",
            "所有食材分区摆放",
            "淋上橄榄油和柠檬汁"
        ],
        "tags": ["素食", "高蛋白", "健身", "低碳", "营养碗"],
        "carbonComparison": {
            "meatVersion": "鸡胸肉健身碗",
            "meatCarbon": 2.5,
            "veganCarbon": 0.6,
            "savingsPercent": 76.0
        },
        "season": "all",
        "nutritionHighlight": "蛋白质30g+、完全营养",
        "tips": "豆腐煎香后蛋白质更易吸收",
        "status": "active"
    },
    {
        "recipeId": "high_protein_005",
        "name": "豆浆燕麦粥",
        "nameEn": "Soy Milk Oatmeal",
        "category": "high_protein",
        "cuisine": "fusion",
        "difficulty": "easy",
        "cookingTime": 10,
        "servings": 1,
        "ingredients": [
            {"name": "燕麦", "amount": 60, "unit": "g"},
            {"name": "豆浆", "amount": 300, "unit": "ml"},
            {"name": "香蕉", "amount": 100, "unit": "g"},
            {"name": "核桃", "amount": 20, "unit": "g"},
            {"name": "亚麻籽", "amount": 10, "unit": "g"},
            {"name": "蓝莓", "amount": 50, "unit": "g"}
        ],
        "cookingMethod": "煮",
        "cookingSteps": [
            "豆浆加热",
            "加入燕麦煮5分钟",
            "香蕉切片",
            "盛入碗中",
            "放上香蕉、核桃、蓝莓",
            "撒上亚麻籽"
        ],
        "tags": ["素食", "高蛋白", "早餐", "健康", "简单"],
        "carbonComparison": {
            "meatVersion": "牛奶燕麦粥",
            "meatCarbon": 1.5,
            "veganCarbon": 0.4,
            "savingsPercent": 73.3
        },
        "season": "all",
        "nutritionHighlight": "蛋白质18g+、Omega-3丰富",
        "tips": "用豆浆代替水煮，蛋白质更高",
        "status": "active"
    },
    {
        "recipeId": "high_protein_006",
        "name": "素食肌肉餐",
        "nameEn": "Vegan Muscle Meal",
        "category": "high_protein",
        "cuisine": "fusion",
        "difficulty": "medium",
        "cookingTime": 30,
        "servings": 1,
        "ingredients": [
            {"name": "豆腐干", "amount": 150, "unit": "g"},
            {"name": "西兰花", "amount": 150, "unit": "g"},
            {"name": "糙米", "amount": 100, "unit": "g"},
            {"name": "鹰嘴豆", "amount": 100, "unit": "g"},
            {"name": "胡萝卜", "amount": 80, "unit": "g"},
            {"name": "橄榄油", "amount": 15, "unit": "ml"}
        ],
        "cookingMethod": "蒸煮",
        "cookingSteps": [
            "糙米蒸熟",
            "豆腐干切条煎香",
            "西兰花焯水",
            "鹰嘴豆煮熟",
            "胡萝卜切片蒸熟",
            "分区装盘，淋上橄榄油"
        ],
        "tags": ["素食", "高蛋白", "健身", "增肌", "营养"],
        "carbonComparison": {
            "meatVersion": "牛肉增肌餐",
            "meatCarbon": 7.5,
            "veganCarbon": 0.7,
            "savingsPercent": 90.7
        },
        "season": "all",
        "nutritionHighlight": "蛋白质35g+、低脂高纤",
        "tips": "训练后1小时内食用效果最佳",
        "status": "active"
    },
    {
        "recipeId": "high_protein_007",
        "name": "扁豆汤",
        "nameEn": "Lentil Soup",
        "category": "high_protein",
        "cuisine": "middle_eastern",
        "difficulty": "easy",
        "cookingTime": 35,
        "servings": 3,
        "ingredients": [
            {"name": "红扁豆", "amount": 200, "unit": "g"},
            {"name": "番茄", "amount": 150, "unit": "g"},
            {"name": "洋葱", "amount": 100, "unit": "g"},
            {"name": "胡萝卜", "amount": 100, "unit": "g"},
            {"name": "姜", "amount": 15, "unit": "g"},
            {"name": "孜然", "amount": 5, "unit": "g"},
            {"name": "橄榄油", "amount": 20, "unit": "ml"}
        ],
        "cookingMethod": "炖",
        "cookingSteps": [
            "洋葱、番茄、胡萝卜切碎",
            "热锅炒香洋葱和姜",
            "加入番茄炒出汁",
            "放入扁豆和孜然",
            "加水煮30分钟至软烂",
            "可用搅拌机打成泥状"
        ],
        "tags": ["素食", "高蛋白", "汤品", "中东", "养生"],
        "carbonComparison": {
            "meatVersion": "牛肉汤",
            "meatCarbon": 8.2,
            "veganCarbon": 0.5,
            "savingsPercent": 93.9
        },
        "season": "autumn,winter",
        "nutritionHighlight": "蛋白质丰富、易消化",
        "tips": "扁豆不需提前浸泡，直接煮即可",
        "status": "active"
    },
    {
        "recipeId": "high_protein_008",
        "name": "豆腐蔬菜炒饭",
        "nameEn": "Tofu Veggie Fried Rice",
        "category": "high_protein",
        "cuisine": "chinese",
        "difficulty": "easy",
        "cookingTime": 15,
        "servings": 2,
        "ingredients": [
            {"name": "米饭", "amount": 300, "unit": "g"},
            {"name": "老豆腐", "amount": 200, "unit": "g"},
            {"name": "西兰花", "amount": 100, "unit": "g"},
            {"name": "胡萝卜", "amount": 80, "unit": "g"},
            {"name": "毛豆", "amount": 80, "unit": "g"},
            {"name": "酱油", "amount": 20, "unit": "ml"},
            {"name": "植物油", "amount": 20, "unit": "ml"}
        ],
        "cookingMethod": "炒",
        "cookingSteps": [
            "豆腐压碎成颗粒",
            "热锅炒香豆腐至金黄",
            "加入蔬菜炒熟",
            "倒入米饭炒散",
            "加酱油翻炒均匀"
        ],
        "tags": ["素食", "高蛋白", "炒饭", "健身", "营养"],
        "carbonComparison": {
            "meatVersion": "虾仁炒饭",
            "meatCarbon": 3.5,
            "veganCarbon": 0.5,
            "savingsPercent": 85.7
        },
        "season": "all",
        "nutritionHighlight": "蛋白质25g+、饱腹感强",
        "tips": "豆腐要炒干炒香，口感更好",
        "status": "active"
    },

    # 节气食谱 +5道 (004-008)
    {
        "recipeId": "seasonal_004",
        "name": "春分春笋炒蘑菇",
        "nameEn": "Spring Equinox Bamboo Shoots",
        "category": "seasonal",
        "cuisine": "chinese",
        "difficulty": "easy",
        "cookingTime": 20,
        "servings": 2,
        "ingredients": [
            {"name": "春笋", "amount": 200, "unit": "g"},
            {"name": "香菇", "amount": 150, "unit": "g"},
            {"name": "木耳", "amount": 50, "unit": "g"},
            {"name": "姜", "amount": 10, "unit": "g"},
            {"name": "大葱", "amount": 20, "unit": "g"},
            {"name": "酱油", "amount": 15, "unit": "ml"},
            {"name": "植物油", "amount": 20, "unit": "ml"}
        ],
        "cookingMethod": "炒",
        "cookingSteps": [
            "春笋切片焯水",
            "香菇、木耳泡发切片",
            "热锅炒香姜葱",
            "加入春笋炒香",
            "放入香菇和木耳",
            "调味翻炒均匀"
        ],
        "tags": ["素食", "节气", "春分", "时令", "鲜美"],
        "carbonComparison": {
            "meatVersion": "春笋炒肉",
            "meatCarbon": 4.5,
            "veganCarbon": 0.4,
            "savingsPercent": 91.1
        },
        "season": "spring",
        "nutritionHighlight": "春笋清火、富含纤维",
        "tips": "春笋要选嫩的，口感更好",
        "status": "active"
    },
    {
        "recipeId": "seasonal_005",
        "name": "立夏蚕豆饭",
        "nameEn": "Start of Summer Fava Bean Rice",
        "category": "seasonal",
        "cuisine": "chinese",
        "difficulty": "easy",
        "cookingTime": 40,
        "servings": 3,
        "ingredients": [
            {"name": "大米", "amount": 300, "unit": "g"},
            {"name": "嫩蚕豆", "amount": 200, "unit": "g"},
            {"name": "笋丁", "amount": 100, "unit": "g"},
            {"name": "香菇", "amount": 80, "unit": "g"},
            {"name": "豆腐干", "amount": 100, "unit": "g"},
            {"name": "酱油", "amount": 20, "unit": "ml"},
            {"name": "植物油", "amount": 15, "unit": "ml"}
        ],
        "cookingMethod": "蒸",
        "cookingSteps": [
            "蚕豆剥壳",
            "香菇、豆腐干切丁",
            "所有配料炒香",
            "大米洗净加水",
            "放入炒好的配料",
            "蒸熟即可"
        ],
        "tags": ["素食", "节气", "立夏", "时令", "营养"],
        "carbonComparison": {
            "meatVersion": "腊肉蚕豆饭",
            "meatCarbon": 5.2,
            "veganCarbon": 0.6,
            "savingsPercent": 88.5
        },
        "season": "spring",
        "nutritionHighlight": "蚕豆高蛋白、应季营养",
        "tips": "要用新鲜嫩蚕豆，老蚕豆口感差",
        "status": "active"
    },
    {
        "recipeId": "seasonal_006",
        "name": "夏至素食凉面",
        "nameEn": "Summer Solstice Cold Noodles",
        "category": "seasonal",
        "cuisine": "chinese",
        "difficulty": "easy",
        "cookingTime": 20,
        "servings": 2,
        "ingredients": [
            {"name": "面条", "amount": 300, "unit": "g"},
            {"name": "黄瓜", "amount": 150, "unit": "g"},
            {"name": "胡萝卜", "amount": 100, "unit": "g"},
            {"name": "豆芽", "amount": 100, "unit": "g"},
            {"name": "花生", "amount": 50, "unit": "g"},
            {"name": "芝麻酱", "amount": 40, "unit": "g"},
            {"name": "醋", "amount": 20, "unit": "ml"}
        ],
        "cookingMethod": "凉拌",
        "cookingSteps": [
            "面条煮熟过凉水",
            "黄瓜、胡萝卜切丝",
            "豆芽焯水",
            "芝麻酱调开",
            "所有食材混合",
            "淋上酱汁拌匀"
        ],
        "tags": ["素食", "节气", "夏至", "凉菜", "消暑"],
        "carbonComparison": {
            "meatVersion": "鸡丝凉面",
            "meatCarbon": 2.8,
            "veganCarbon": 0.5,
            "savingsPercent": 82.1
        },
        "season": "summer",
        "nutritionHighlight": "清凉解暑、开胃",
        "tips": "面条要过凉水，口感更筋道",
        "status": "active"
    },
    {
        "recipeId": "seasonal_007",
        "name": "秋分莲藕炖汤",
        "nameEn": "Autumn Equinox Lotus Root Soup",
        "category": "seasonal",
        "cuisine": "chinese",
        "difficulty": "easy",
        "cookingTime": 60,
        "servings": 4,
        "ingredients": [
            {"name": "莲藕", "amount": 400, "unit": "g"},
            {"name": "红豆", "amount": 100, "unit": "g"},
            {"name": "花生", "amount": 80, "unit": "g"},
            {"name": "红枣", "amount": 60, "unit": "g"},
            {"name": "枸杞", "amount": 20, "unit": "g"},
            {"name": "冰糖", "amount": 40, "unit": "g"}
        ],
        "cookingMethod": "炖",
        "cookingSteps": [
            "莲藕切块",
            "红豆、花生提前浸泡",
            "所有食材放入砂锅",
            "加水大火烧开",
            "转小火炖50分钟",
            "加冰糖调味"
        ],
        "tags": ["素食", "节气", "秋分", "汤品", "滋补"],
        "carbonComparison": {
            "meatVersion": "排骨莲藕汤",
            "meatCarbon": 8.5,
            "veganCarbon": 0.5,
            "savingsPercent": 94.1
        },
        "season": "autumn",
        "nutritionHighlight": "莲藕养阴润燥",
        "tips": "秋藕最补人，要选粉藕",
        "status": "active"
    },
    {
        "recipeId": "seasonal_008",
        "name": "小雪腌菜",
        "nameEn": "Light Snow Pickled Vegetables",
        "category": "seasonal",
        "cuisine": "chinese",
        "difficulty": "easy",
        "cookingTime": 30,
        "servings": 8,
        "ingredients": [
            {"name": "大白菜", "amount": 1000, "unit": "g"},
            {"name": "盐", "amount": 50, "unit": "g"},
            {"name": "辣椒", "amount": 30, "unit": "g"},
            {"name": "姜", "amount": 30, "unit": "g"},
            {"name": "蒜", "amount": 50, "unit": "g"},
            {"name": "白糖", "amount": 30, "unit": "g"}
        ],
        "cookingMethod": "腌制",
        "cookingSteps": [
            "大白菜切块晾干",
            "姜蒜切片，辣椒切段",
            "白菜抹盐腌制2小时",
            "挤出水分",
            "拌入调料",
            "密封腌制3-5天"
        ],
        "tags": ["素食", "节气", "小雪", "腌菜", "冬季"],
        "carbonComparison": {
            "meatVersion": "腌肉",
            "meatCarbon": 12.5,
            "veganCarbon": 0.3,
            "savingsPercent": 97.6
        },
        "season": "winter",
        "nutritionHighlight": "益生菌、助消化",
        "tips": "小雪腌菜，大雪腌肉，传统习俗",
        "status": "active"
    },

    # 西式素食 +5道 (004-008)
    {
        "recipeId": "western_004",
        "name": "素食汉堡",
        "nameEn": "Vegan Burger",
        "category": "western",
        "cuisine": "american",
        "difficulty": "medium",
        "cookingTime": 30,
        "servings": 2,
        "ingredients": [
            {"name": "汉堡胚", "amount": 2, "unit": "个"},
            {"name": "黑豆", "amount": 200, "unit": "g"},
            {"name": "燕麦", "amount": 50, "unit": "g"},
            {"name": "生菜", "amount": 50, "unit": "g"},
            {"name": "番茄", "amount": 100, "unit": "g"},
            {"name": "洋葱", "amount": 50, "unit": "g"},
            {"name": "植物油", "amount": 20, "unit": "ml"}
        ],
        "cookingMethod": "煎",
        "cookingSteps": [
            "黑豆煮熟压成泥",
            "加入燕麦拌匀",
            "做成肉饼形状",
            "煎至两面金黄",
            "汉堡胚烤香",
            "夹入肉饼和蔬菜"
        ],
        "tags": ["素食", "西餐", "汉堡", "美式", "快餐"],
        "carbonComparison": {
            "meatVersion": "牛肉汉堡",
            "meatCarbon": 9.5,
            "veganCarbon": 0.8,
            "savingsPercent": 91.6
        },
        "season": "all",
        "nutritionHighlight": "高蛋白、饱腹感强",
        "tips": "黑豆饼要煎定型后再翻面",
        "status": "active"
    },
    {
        "recipeId": "western_005",
        "name": "奶油蘑菇汤",
        "nameEn": "Cream of Mushroom Soup",
        "category": "western",
        "cuisine": "french",
        "difficulty": "medium",
        "cookingTime": 35,
        "servings": 3,
        "ingredients": [
            {"name": "蘑菇", "amount": 300, "unit": "g"},
            {"name": "土豆", "amount": 200, "unit": "g"},
            {"name": "洋葱", "amount": 100, "unit": "g"},
            {"name": "椰浆", "amount": 200, "unit": "ml"},
            {"name": "大蒜", "amount": 15, "unit": "g"},
            {"name": "植物油", "amount": 20, "unit": "ml"}
        ],
        "cookingMethod": "炖",
        "cookingSteps": [
            "蘑菇、土豆切片",
            "洋葱切碎炒香",
            "加入蘑菇炒出水",
            "放入土豆和水煮软",
            "用搅拌机打成泥",
            "加入椰浆调味"
        ],
        "tags": ["素食", "西餐", "汤品", "法式", "奶油"],
        "carbonComparison": {
            "meatVersion": "奶油蘑菇汤（牛奶）",
            "meatCarbon": 2.5,
            "veganCarbon": 0.6,
            "savingsPercent": 76.0
        },
        "season": "autumn,winter",
        "nutritionHighlight": "浓郁顺滑、营养丰富",
        "tips": "用椰浆代替牛奶，同样香浓",
        "status": "active"
    },
    {
        "recipeId": "western_006",
        "name": "素食千层面",
        "nameEn": "Vegan Lasagna",
        "category": "western",
        "cuisine": "italian",
        "difficulty": "hard",
        "cookingTime": 60,
        "servings": 4,
        "ingredients": [
            {"name": "千层面皮", "amount": 300, "unit": "g"},
            {"name": "番茄", "amount": 400, "unit": "g"},
            {"name": "菠菜", "amount": 200, "unit": "g"},
            {"name": "豆腐", "amount": 300, "unit": "g"},
            {"name": "蘑菇", "amount": 150, "unit": "g"},
            {"name": "洋葱", "amount": 100, "unit": "g"},
            {"name": "橄榄油", "amount": 30, "unit": "ml"}
        ],
        "cookingMethod": "烤",
        "cookingSteps": [
            "制作番茄酱：番茄炒成酱",
            "菠菜焯水切碎",
            "豆腐打成泥",
            "蘑菇切片炒香",
            "分层铺：面皮、酱料、豆腐泥",
            "烤箱180度烤40分钟"
        ],
        "tags": ["素食", "西餐", "意大利", "烘焙", "宴客"],
        "carbonComparison": {
            "meatVersion": "肉酱千层面",
            "meatCarbon": 6.8,
            "veganCarbon": 0.9,
            "savingsPercent": 86.8
        },
        "season": "all",
        "nutritionHighlight": "层次丰富、营养全面",
        "tips": "每一层都要铺均匀，烤出来才好看",
        "status": "active"
    },
    {
        "recipeId": "western_007",
        "name": "素食炖饭",
        "nameEn": "Vegan Risotto",
        "category": "western",
        "cuisine": "italian",
        "difficulty": "medium",
        "cookingTime": 40,
        "servings": 2,
        "ingredients": [
            {"name": "意大利米", "amount": 200, "unit": "g"},
            {"name": "蘑菇", "amount": 150, "unit": "g"},
            {"name": "芦笋", "amount": 100, "unit": "g"},
            {"name": "洋葱", "amount": 80, "unit": "g"},
            {"name": "白葡萄酒", "amount": 50, "unit": "ml"},
            {"name": "橄榄油", "amount": 30, "unit": "ml"}
        ],
        "cookingMethod": "炖",
        "cookingSteps": [
            "洋葱切碎炒香",
            "加入米粒炒至透明",
            "倒入白葡萄酒收汁",
            "分次加入高汤边煮边搅",
            "加入蘑菇和芦笋",
            "煮至米粒奶油状"
        ],
        "tags": ["素食", "西餐", "意大利", "炖饭", "精致"],
        "carbonComparison": {
            "meatVersion": "海鲜炖饭",
            "meatCarbon": 4.5,
            "veganCarbon": 0.7,
            "savingsPercent": 84.4
        },
        "season": "all",
        "nutritionHighlight": "米粒软糯、鲜味浓郁",
        "tips": "要不停搅拌，让米粒释放淀粉",
        "status": "active"
    },
    {
        "recipeId": "western_008",
        "name": "素食塔可",
        "nameEn": "Vegan Tacos",
        "category": "western",
        "cuisine": "mexican",
        "difficulty": "easy",
        "cookingTime": 25,
        "servings": 4,
        "ingredients": [
            {"name": "玉米饼", "amount": 8, "unit": "张"},
            {"name": "黑豆", "amount": 200, "unit": "g"},
            {"name": "番茄", "amount": 150, "unit": "g"},
            {"name": "生菜", "amount": 100, "unit": "g"},
            {"name": "牛油果", "amount": 150, "unit": "g"},
            {"name": "洋葱", "amount": 80, "unit": "g"},
            {"name": "辣椒", "amount": 20, "unit": "g"}
        ],
        "cookingMethod": "组装",
        "cookingSteps": [
            "黑豆煮熟炒香",
            "番茄、洋葱切丁",
            "牛油果做成酱",
            "生菜切丝",
            "玉米饼加热",
            "包入所有食材"
        ],
        "tags": ["素食", "西餐", "墨西哥", "塔可", "快手"],
        "carbonComparison": {
            "meatVersion": "牛肉塔可",
            "meatCarbon": 8.2,
            "veganCarbon": 0.6,
            "savingsPercent": 92.7
        },
        "season": "all",
        "nutritionHighlight": "高蛋白、色彩丰富",
        "tips": "可以提前准备好食材，吃的时候现包",
        "status": "active"
    },

    # 亚洲融合 +5道 (004-008)
    {
        "recipeId": "asian_fusion_004",
        "name": "日式素食乌冬面",
        "nameEn": "Vegan Udon Noodles",
        "category": "asian_fusion",
        "cuisine": "japanese",
        "difficulty": "easy",
        "cookingTime": 20,
        "servings": 2,
        "ingredients": [
            {"name": "乌冬面", "amount": 300, "unit": "g"},
            {"name": "海带", "amount": 20, "unit": "g"},
            {"name": "豆腐", "amount": 150, "unit": "g"},
            {"name": "香菇", "amount": 100, "unit": "g"},
            {"name": "大葱", "amount": 30, "unit": "g"},
            {"name": "酱油", "amount": 30, "unit": "ml"}
        ],
        "cookingMethod": "煮",
        "cookingSteps": [
            "海带泡发做高汤",
            "豆腐切块，香菇切片",
            "乌冬面煮熟",
            "高汤中加入豆腐和香菇",
            "放入乌冬面",
            "撒上葱花"
        ],
        "tags": ["素食", "日料", "乌冬面", "汤面", "清淡"],
        "carbonComparison": {
            "meatVersion": "天妇罗乌冬面",
            "meatCarbon": 3.5,
            "veganCarbon": 0.5,
            "savingsPercent": 85.7
        },
        "season": "all",
        "nutritionHighlight": "低卡、清爽",
        "tips": "海带高汤鲜美，不用加其他调料",
        "status": "active"
    },
    {
        "recipeId": "asian_fusion_005",
        "name": "越南素食春卷",
        "nameEn": "Vietnamese Spring Rolls",
        "category": "asian_fusion",
        "cuisine": "vietnamese",
        "difficulty": "easy",
        "cookingTime": 30,
        "servings": 10,
        "ingredients": [
            {"name": "春卷皮", "amount": 10, "unit": "张"},
            {"name": "生菜", "amount": 100, "unit": "g"},
            {"name": "米粉", "amount": 150, "unit": "g"},
            {"name": "胡萝卜", "amount": 80, "unit": "g"},
            {"name": "黄瓜", "amount": 80, "unit": "g"},
            {"name": "薄荷叶", "amount": 20, "unit": "g"},
            {"name": "花生酱", "amount": 50, "unit": "g"}
        ],
        "cookingMethod": "卷制",
        "cookingSteps": [
            "米粉煮熟",
            "胡萝卜、黄瓜切丝",
            "春卷皮用水泡软",
            "铺上生菜、米粉、蔬菜",
            "放上薄荷叶",
            "卷紧，蘸花生酱食用"
        ],
        "tags": ["素食", "越南", "春卷", "轻食", "健康"],
        "carbonComparison": {
            "meatVersion": "虾肉春卷",
            "meatCarbon": 4.2,
            "veganCarbon": 0.4,
            "savingsPercent": 90.5
        },
        "season": "summer",
        "nutritionHighlight": "清爽低卡、开胃",
        "tips": "春卷皮不要泡太久，软了就可以用",
        "status": "active"
    },
    {
        "recipeId": "asian_fusion_006",
        "name": "印度素食咖喱",
        "nameEn": "Indian Vegetable Curry",
        "category": "asian_fusion",
        "cuisine": "indian",
        "difficulty": "medium",
        "cookingTime": 35,
        "servings": 3,
        "ingredients": [
            {"name": "椰浆", "amount": 300, "unit": "ml"},
            {"name": "土豆", "amount": 200, "unit": "g"},
            {"name": "茄子", "amount": 150, "unit": "g"},
            {"name": "花菜", "amount": 150, "unit": "g"},
            {"name": "番茄", "amount": 150, "unit": "g"},
            {"name": "咖喱粉", "amount": 30, "unit": "g"},
            {"name": "姜", "amount": 15, "unit": "g"}
        ],
        "cookingMethod": "炖",
        "cookingSteps": [
            "所有蔬菜切块",
            "炒香咖喱粉和姜",
            "加入番茄炒出汁",
            "放入其他蔬菜",
            "倒入椰浆炖煮20分钟",
            "配米饭或馕食用"
        ],
        "tags": ["素食", "印度", "咖喱", "浓郁", "异域"],
        "carbonComparison": {
            "meatVersion": "印度羊肉咖喱",
            "meatCarbon": 12.5,
            "veganCarbon": 0.8,
            "savingsPercent": 93.6
        },
        "season": "all",
        "nutritionHighlight": "香料丰富、暖胃",
        "tips": "咖喱粉要炒香，才能释放香味",
        "status": "active"
    },
    {
        "recipeId": "asian_fusion_007",
        "name": "新加坡素食炒粿条",
        "nameEn": "Singapore Fried Kway Teow",
        "category": "asian_fusion",
        "cuisine": "singaporean",
        "difficulty": "medium",
        "cookingTime": 20,
        "servings": 2,
        "ingredients": [
            {"name": "河粉", "amount": 300, "unit": "g"},
            {"name": "豆芽", "amount": 100, "unit": "g"},
            {"name": "韭菜", "amount": 80, "unit": "g"},
            {"name": "豆腐", "amount": 150, "unit": "g"},
            {"name": "酱油", "amount": 30, "unit": "ml"},
            {"name": "辣椒酱", "amount": 20, "unit": "g"},
            {"name": "植物油", "amount": 30, "unit": "ml"}
        ],
        "cookingMethod": "炒",
        "cookingSteps": [
            "豆腐切片煎香",
            "韭菜切段",
            "热锅大火，炒香辣椒酱",
            "加入河粉翻炒",
            "放入豆芽和韭菜",
            "加酱油快速炒匀"
        ],
        "tags": ["素食", "新加坡", "炒粿条", "街头", "香辣"],
        "carbonComparison": {
            "meatVersion": "海鲜炒粿条",
            "meatCarbon": 5.5,
            "veganCarbon": 0.6,
            "savingsPercent": 89.1
        },
        "season": "all",
        "nutritionHighlight": "火候十足、香味浓郁",
        "tips": "要用大火快炒，保持锅气",
        "status": "active"
    },
    {
        "recipeId": "asian_fusion_008",
        "name": "台式素食卤味",
        "nameEn": "Taiwanese Braised Snacks",
        "category": "asian_fusion",
        "cuisine": "taiwanese",
        "difficulty": "medium",
        "cookingTime": 50,
        "servings": 4,
        "ingredients": [
            {"name": "豆干", "amount": 300, "unit": "g"},
            {"name": "海带", "amount": 150, "unit": "g"},
            {"name": "香菇", "amount": 200, "unit": "g"},
            {"name": "卤蛋", "amount": 200, "unit": "g"},
            {"name": "八角", "amount": 5, "unit": "g"},
            {"name": "桂皮", "amount": 5, "unit": "g"},
            {"name": "酱油", "amount": 60, "unit": "ml"}
        ],
        "cookingMethod": "炖",
        "cookingSteps": [
            "所有食材切块",
            "锅中加水和香料",
            "加入酱油和冰糖",
            "放入所有食材",
            "小火炖40分钟",
            "浸泡1小时更入味"
        ],
        "tags": ["素食", "台湾", "卤味", "小吃", "传统"],
        "carbonComparison": {
            "meatVersion": "台式卤肉卤味",
            "meatCarbon": 8.5,
            "veganCarbon": 0.7,
            "savingsPercent": 91.8
        },
        "season": "all",
        "nutritionHighlight": "香料入味、下饭小菜",
        "tips": "卤好后浸泡更入味，可以卤一大锅",
        "status": "active"
    }
]

def main():
    # 读取原始数据
    current_file = os.path.join(os.path.dirname(__file__), '../cloudfunctions/recipe-data-import/recipe-data.json')
    
    with open(current_file, 'r', encoding='utf-8') as f:
        original_recipes = json.load(f)
    
    print(f"原始食谱数量: {len(original_recipes)}")
    print(f"新增食谱数量: {len(new_recipes)}")
    
    # 合并数据
    all_recipes = original_recipes + new_recipes
    
    print(f"合并后总数: {len(all_recipes)}")
    
    # 统计各分类数量
    category_count = {}
    for recipe in all_recipes:
        cat = recipe['category']
        category_count[cat] = category_count.get(cat, 0) + 1
    
    print("\n各分类数量:")
    for cat, count in sorted(category_count.items()):
        print(f"  {cat}: {count}道")
    
    # 写入新文件
    output_file = os.path.join(os.path.dirname(__file__), '../cloudfunctions/recipe-data-import/recipe-data.json')
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_recipes, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 成功生成50道食谱数据文件!")
    print(f"文件路径: {output_file}")

if __name__ == '__main__':
    main()

