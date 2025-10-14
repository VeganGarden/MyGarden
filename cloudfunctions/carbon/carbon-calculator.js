/**
 * 高级碳排放计算引擎
 * 实现多因子动态计算模型
 */

class CarbonCalculator {
  constructor() {
    // 烹饪方式系数
    this.cookingFactors = {
      '生食': 1.0,      // 无需加热
      '凉拌': 1.0,
      '蒸': 1.05,       // 低能耗
      '煮': 1.08,
      '炖': 1.12,
      '炒': 1.15,       // 中等能耗
      '煎': 1.18,
      '烤': 1.25,       // 高能耗
      '烘焙': 1.28,
      '炸': 1.35,       // 最高能耗
      '焖': 1.20,       // 长时间加热
      '直接食用': 1.0,
      '组装': 1.0,
      '卷制': 1.0,
      '腌制': 1.02,
      '搅拌': 1.0
    };

    // 运输距离系数
    this.transportFactors = {
      'local': 1.0,      // 本地食材（<100km）
      'domestic': 1.15,  // 国内运输（跨省）
      'import': 1.35     // 国际运输（进口）
    };

    // 季节系数配置
    this.seasonalVegetables = {
      'spring': ['春笋', '蚕豆', '韭菜', '芦笋', '豌豆', '香椿', '荠菜'],
      'summer': ['黄瓜', '番茄', '茄子', '苦瓜', '丝瓜', '冬瓜', '西瓜', '蓝莓'],
      'autumn': ['莲藕', '南瓜', '芋头', '山药', '栗子', '柿子', '梨'],
      'winter': ['白菜', '萝卜', '芹菜', '菠菜', '大葱', '红枣', '橙子']
    };

    // 保存方式系数
    this.preservationFactors = {
      'fresh': 1.0,      // 新鲜食材
      'refrigerated': 1.05, // 冷藏
      'frozen': 1.10,    // 冷冻
      'dried': 1.08,     // 干货
      'canned': 1.15     // 罐装
    };

    // 对比基准库（常见餐食平均碳足迹）
    this.mealBaselines = {
      '素食快餐': 0.75,
      '素食简餐': 1.0,
      '素食正餐': 1.5,
      '肉食快餐': 3.5,
      '肉食简餐': 5.0,
      '肉食正餐': 7.5,
      '牛排大餐': 20.0,
      '海鲜大餐': 8.0
    };
  }

  /**
   * 主计算函数 - 简单模式
   * @param {Array} ingredients 食材列表 [{name, amount, carbonFootprint}]
   * @param {String} cookingMethod 烹饪方式
   */
  calculateSimple(ingredients, cookingMethod = '炒') {
    let totalCarbon = 0;
    const details = [];

    for (const ing of ingredients) {
      const carbon = ing.carbonFootprint * (ing.amount / 1000);
      totalCarbon += carbon;
      details.push({
        name: ing.name,
        amount: ing.amount,
        carbonFootprint: ing.carbonFootprint,
        carbon: parseFloat(carbon.toFixed(3))
      });
    }

    // 应用烹饪系数
    const cookingFactor = this.cookingFactors[cookingMethod] || 1.0;
    totalCarbon *= cookingFactor;

    return {
      totalCarbon: parseFloat(totalCarbon.toFixed(2)),
      cookingFactor,
      details
    };
  }

  /**
   * 高级计算函数 - 多因子模型
   * @param {Object} meal 餐食对象
   */
  calculateAdvanced(meal) {
    const {
      ingredients,
      cookingMethod = '炒',
      mealDate = new Date(),
      userLocation = 'domestic',
      mealType = '素食简餐'
    } = meal;

    let totalCarbon = 0;
    const breakdown = {
      ingredientBase: 0,    // 食材基础碳
      cookingEnergy: 0,     // 烹饪能耗
      transportation: 0,    // 运输碳排
      preservation: 0,      // 保存碳排
      seasonal: 0           // 季节调整
    };

    const detailedIngredients = [];

    // 遍历每个食材进行多因子计算
    for (const ing of ingredients) {
      // 基础碳足迹
      const baseCarbon = ing.carbonFootprint * (ing.amount / 1000);
      
      // 因子1：烹饪方式系数
      const cookingFactor = this.getCookingFactor(cookingMethod);
      const cookingCarbon = baseCarbon * (cookingFactor - 1.0);
      
      // 因子2：季节系数
      const seasonFactor = this.getSeasonFactor(ing.name, mealDate);
      const seasonalCarbon = baseCarbon * (seasonFactor - 1.0);
      
      // 因子3：运输系数
      const transportFactor = this.getTransportFactor(ing, userLocation);
      const transportCarbon = baseCarbon * (transportFactor - 1.0);
      
      // 因子4：保存方式系数
      const preservationFactor = this.getPreservationFactor(ing);
      const preservationCarbon = baseCarbon * (preservationFactor - 1.0);

      // 总碳排 = 基础碳 + 各因子增加量
      const ingredientTotalCarbon = baseCarbon + cookingCarbon + seasonalCarbon + 
                                    transportCarbon + preservationCarbon;

      // 累计到各分类
      breakdown.ingredientBase += baseCarbon;
      breakdown.cookingEnergy += cookingCarbon;
      breakdown.seasonal += seasonalCarbon;
      breakdown.transportation += transportCarbon;
      breakdown.preservation += preservationCarbon;

      totalCarbon += ingredientTotalCarbon;

      detailedIngredients.push({
        name: ing.name,
        amount: ing.amount,
        baseCarbon: parseFloat(baseCarbon.toFixed(3)),
        factors: {
          cooking: parseFloat(cookingFactor.toFixed(2)),
          season: parseFloat(seasonFactor.toFixed(2)),
          transport: parseFloat(transportFactor.toFixed(2)),
          preservation: parseFloat(preservationFactor.toFixed(2))
        },
        totalCarbon: parseFloat(ingredientTotalCarbon.toFixed(3))
      });
    }

    // 计算各部分占比
    const breakdownPercent = {
      ingredientBase: parseFloat((breakdown.ingredientBase / totalCarbon * 100).toFixed(1)),
      cookingEnergy: parseFloat((breakdown.cookingEnergy / totalCarbon * 100).toFixed(1)),
      transportation: parseFloat((breakdown.transportation / totalCarbon * 100).toFixed(1)),
      preservation: parseFloat((breakdown.preservation / totalCarbon * 100).toFixed(1)),
      seasonal: parseFloat((breakdown.seasonal / totalCarbon * 100).toFixed(1))
    };

    // 生成优化建议
    const tips = this.generateTips(breakdown, cookingMethod, mealDate, ingredients);

    // 对比基准
    const baseline = this.mealBaselines[mealType] || 1.0;
    const vsBaseline = {
      baseline,
      mealType,
      reduction: parseFloat((baseline - totalCarbon).toFixed(2)),
      reductionPercent: parseFloat(((baseline - totalCarbon) / baseline * 100).toFixed(1))
    };

    return {
      totalCarbon: parseFloat(totalCarbon.toFixed(2)),
      breakdown: {
        values: breakdown,
        percent: breakdownPercent
      },
      ingredients: detailedIngredients,
      vsBaseline,
      tips,
      cookingMethod
    };
  }

  /**
   * 获取烹饪方式系数
   */
  getCookingFactor(method) {
    return this.cookingFactors[method] || 1.15; // 默认炒菜系数
  }

  /**
   * 获取季节系数（反季蔬果+20%）
   */
  getSeasonFactor(ingredientName, mealDate) {
    const month = mealDate.getMonth(); // 0-11
    let currentSeason;

    // 判断当前季节
    if (month >= 2 && month <= 4) currentSeason = 'spring';      // 3-5月
    else if (month >= 5 && month <= 7) currentSeason = 'summer'; // 6-8月
    else if (month >= 8 && month <= 10) currentSeason = 'autumn';// 9-11月
    else currentSeason = 'winter';                               // 12-2月

    // 检查是否是应季食材
    const seasonalItems = this.seasonalVegetables[currentSeason] || [];
    
    for (const item of seasonalItems) {
      if (ingredientName.includes(item) || item.includes(ingredientName)) {
        return 1.0; // 应季食材
      }
    }

    // 反季蔬果增加20%碳排
    return 1.2;
  }

  /**
   * 获取运输系数
   */
  getTransportFactor(ingredient, userLocation) {
    // 根据食材的origin属性判断
    const origin = ingredient.origin || 'domestic';
    
    if (origin === 'import' || origin === '进口') {
      return this.transportFactors.import; // 1.35
    } else if (origin === 'local' || origin === '本地') {
      return this.transportFactors.local; // 1.0
    } else {
      return this.transportFactors.domestic; // 1.15
    }
  }

  /**
   * 获取保存方式系数
   */
  getPreservationFactor(ingredient) {
    const preservation = ingredient.preservation || 'fresh';
    return this.preservationFactors[preservation] || 1.0;
  }

  /**
   * 生成优化建议
   */
  generateTips(breakdown, cookingMethod, mealDate, ingredients) {
    const tips = [];

    // 1. 烹饪方式建议
    if (breakdown.cookingEnergy > breakdown.ingredientBase * 0.3) {
      const cookingFactor = this.cookingFactors[cookingMethod];
      if (cookingFactor >= 1.25) {
        tips.push({
          type: 'cooking',
          icon: '🔥',
          message: `${cookingMethod}属于高能耗烹饪方式，建议改用蒸煮，可减少${((cookingFactor - 1.08) * 100).toFixed(0)}%烹饪碳排`,
          savings: parseFloat((breakdown.cookingEnergy * (cookingFactor - 1.08) / cookingFactor).toFixed(2))
        });
      }
    }

    // 2. 季节建议
    if (breakdown.seasonal > 0) {
      tips.push({
        type: 'seasonal',
        icon: '🌱',
        message: '检测到反季食材，选择应季蔬菜可减少20%碳排放',
        savings: parseFloat(breakdown.seasonal.toFixed(2))
      });
    }

    // 3. 运输建议
    if (breakdown.transportation > breakdown.ingredientBase * 0.15) {
      tips.push({
        type: 'transport',
        icon: '🚚',
        message: '本地食材运输碳排更低，优先选择本地应季蔬菜',
        savings: parseFloat(breakdown.transportation.toFixed(2))
      });
    }

    // 4. 保存方式建议
    if (breakdown.preservation > 0) {
      tips.push({
        type: 'preservation',
        icon: '❄️',
        message: '新鲜食材碳足迹更低，减少冷冻和罐装食品',
        savings: parseFloat(breakdown.preservation.toFixed(2))
      });
    }

    // 5. 总体建议
    if (tips.length === 0) {
      tips.push({
        type: 'praise',
        icon: '👍',
        message: '您的饮食选择已经很环保了！继续保持！',
        savings: 0
      });
    }

    return tips;
  }

  /**
   * 判断是否反季食材
   */
  isOffSeason(ingredientName, mealDate) {
    const month = mealDate.getMonth();
    let currentSeason;

    if (month >= 2 && month <= 4) currentSeason = 'spring';
    else if (month >= 5 && month <= 7) currentSeason = 'summer';
    else if (month >= 8 && month <= 10) currentSeason = 'autumn';
    else currentSeason = 'winter';

    const seasonalItems = this.seasonalVegetables[currentSeason] || [];
    
    for (const item of seasonalItems) {
      if (ingredientName.includes(item) || item.includes(ingredientName)) {
        return false; // 应季
      }
    }

    return true; // 反季
  }

  /**
   * 计算总节约潜力
   */
  calculateSavingsPotential(breakdown, cookingMethod) {
    let maxSavings = 0;
    const suggestions = [];

    // 1. 烹饪方式优化潜力
    const cookingFactor = this.cookingFactors[cookingMethod];
    if (cookingFactor > 1.08) {
      const savings = breakdown.cookingEnergy * (cookingFactor - 1.08) / cookingFactor;
      maxSavings += savings;
      suggestions.push({
        action: '改用蒸煮',
        savings: parseFloat(savings.toFixed(2)),
        percent: parseFloat(((savings / (breakdown.ingredientBase + breakdown.cookingEnergy)) * 100).toFixed(1))
      });
    }

    // 2. 季节优化潜力
    if (breakdown.seasonal > 0) {
      maxSavings += breakdown.seasonal;
      suggestions.push({
        action: '选择应季食材',
        savings: parseFloat(breakdown.seasonal.toFixed(2)),
        percent: parseFloat((breakdown.seasonal / breakdown.ingredientBase * 100).toFixed(1))
      });
    }

    // 3. 运输优化潜力
    if (breakdown.transportation > 0) {
      const savings = breakdown.transportation * 0.6; // 假设可优化60%
      maxSavings += savings;
      suggestions.push({
        action: '选择本地食材',
        savings: parseFloat(savings.toFixed(2)),
        percent: parseFloat((savings / breakdown.ingredientBase * 100).toFixed(1))
      });
    }

    return {
      maxSavings: parseFloat(maxSavings.toFixed(2)),
      suggestions
    };
  }

  /**
   * 生成详细分解报告
   */
  generateReport(calculationResult) {
    const { totalCarbon, breakdown, vsBaseline, tips } = calculationResult;

    return {
      summary: `本餐碳足迹：${totalCarbon} kg CO₂`,
      breakdown: {
        ingredientBase: {
          value: parseFloat(breakdown.values.ingredientBase.toFixed(2)),
          percent: breakdown.percent.ingredientBase,
          description: '食材本身碳排放'
        },
        cookingEnergy: {
          value: parseFloat(breakdown.values.cookingEnergy.toFixed(2)),
          percent: breakdown.percent.cookingEnergy,
          description: '烹饪能耗'
        },
        transportation: {
          value: parseFloat(breakdown.values.transportation.toFixed(2)),
          percent: breakdown.percent.transportation,
          description: '运输碳排放'
        },
        preservation: {
          value: parseFloat(breakdown.values.preservation.toFixed(2)),
          percent: breakdown.percent.preservation,
          description: '保存碳排放'
        },
        seasonal: {
          value: parseFloat(breakdown.values.seasonal.toFixed(2)),
          percent: breakdown.percent.seasonal,
          description: '季节调整'
        }
      },
      vsBaseline: {
        comparison: `vs ${vsBaseline.mealType}`,
        baseline: vsBaseline.baseline,
        yourMeal: totalCarbon,
        reduction: vsBaseline.reduction,
        reductionPercent: vsBaseline.reductionPercent,
        message: vsBaseline.reduction > 0 
          ? `比${vsBaseline.mealType}少${vsBaseline.reduction}kg，减排${vsBaseline.reductionPercent}%` 
          : '已达到理想水平'
      },
      tips,
      savingsPotential: this.calculateSavingsPotential(breakdown.values, calculationResult.cookingMethod)
    };
  }

  /**
   * 计算等效说明（种树、开车、用电）
   */
  calculateEquivalents(carbonKg) {
    return {
      trees: {
        value: parseFloat((carbonKg / 21).toFixed(2)),
        description: `种植${(carbonKg / 21).toFixed(1)}棵树一年的吸碳量`
      },
      driving: {
        value: parseFloat((carbonKg * 4.2).toFixed(1)),
        unit: '公里',
        description: `少开车${(carbonKg * 4.2).toFixed(0)}公里`
      },
      electricity: {
        value: parseFloat((carbonKg / 0.785).toFixed(0)),
        unit: '度',
        description: `节约${(carbonKg / 0.785).toFixed(0)}度电`
      },
      plastic: {
        value: parseFloat((carbonKg / 6).toFixed(1)),
        unit: 'kg',
        description: `少用${(carbonKg / 6).toFixed(1)}kg塑料`
      },
      waterBottles: {
        value: parseFloat((carbonKg / 0.082).toFixed(0)),
        unit: '瓶',
        description: `减少${(carbonKg / 0.082).toFixed(0)}个塑料瓶`
      }
    };
  }

  /**
   * 对比肉食餐的碳足迹
   */
  compareToMeat(veganCarbon, meatCarbon) {
    const reduction = meatCarbon - veganCarbon;
    const reductionPercent = meatCarbon > 0 ? (reduction / meatCarbon * 100) : 0;

    return {
      veganCarbon: parseFloat(veganCarbon.toFixed(2)),
      meatCarbon: parseFloat(meatCarbon.toFixed(2)),
      reduction: parseFloat(reduction.toFixed(2)),
      reductionPercent: parseFloat(reductionPercent.toFixed(1)),
      equivalents: this.calculateEquivalents(reduction)
    };
  }
}

module.exports = CarbonCalculator;

