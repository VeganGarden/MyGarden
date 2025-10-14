#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
植物模板数据生成脚本
生成60种植物的完整数据
"""

import json
import os

# 青铜级植物（15种）
bronze_plants = [
    # 仙人掌系列（5种）
    {
        "plantId": "cactus_001",
        "name": "金琥仙人掌",
        "nameEn": "Golden Barrel Cactus",
        "scientificName": "Echinocactus grusonii",
        "category": "cactus",
        "rarity": "common",
        "unlockRequirements": {
            "userLevel": "bronze",
            "totalPoints": 0,
            "totalCarbon": 0,
            "prerequisitePlants": []
        },
        "growthStages": [
            {"stage": 1, "name": "种子", "duration": 2, "requiredWater": 2, "requiredCarbon": 2, "visual": "seed_cactus.png"},
            {"stage": 2, "name": "发芽", "duration": 3, "requiredWater": 3, "requiredCarbon": 5, "visual": "sprout_cactus.png"},
            {"stage": 3, "name": "成熟", "duration": 2, "requiredWater": 2, "requiredCarbon": 3, "visual": "mature_cactus.png"}
        ],
        "symbolism": {
            "meaning": "在干旱中扎根，象征坚持的力量",
            "story": "仙人掌能在沙漠中生存，就像素食者在肉食文化中坚守信念",
            "culturalSignificance": "沙漠之花，生命力顽强"
        },
        "interactions": {
            "clickEffect": "刺球闪光",
            "waterEffect": "缓慢生长",
            "combos": []
        },
        "carbonAbsorption": 0.01,
        "pointsPerDay": 2,
        "status": "active"
    }
]

print("植物数据生成脚本创建成功")
print("由于数据量较大，将分批创建...")
