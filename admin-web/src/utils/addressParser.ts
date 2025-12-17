/**
 * 地址解析工具
 * 用于从地址文本中提取地区信息并匹配到系统region
 */

// 地区映射表：城市/省份 -> region代码
const CITY_TO_REGION_MAP: Record<string, string> = {
  // 华北区域 (north_china)
  '北京': 'north_china',
  '北京市': 'north_china',
  '天津': 'north_china',
  '天津市': 'north_china',
  '河北': 'north_china',
  '河北省': 'north_china',
  '石家庄': 'north_china',
  '唐山': 'north_china',
  '山西': 'north_china',
  '山西省': 'north_china',
  '太原': 'north_china',
  '内蒙古': 'north_china',
  '内蒙古自治区': 'north_china',
  '呼和浩特': 'north_china',
  
  // 东北区域 (northeast)
  '辽宁': 'northeast',
  '辽宁省': 'northeast',
  '沈阳': 'northeast',
  '大连': 'northeast',
  '吉林': 'northeast',
  '吉林省': 'northeast',
  '长春': 'northeast',
  '黑龙江': 'northeast',
  '黑龙江省': 'northeast',
  '哈尔滨': 'northeast',
  
  // 华东区域 (east_china)
  '上海': 'east_china',
  '上海市': 'east_china',
  '江苏': 'east_china',
  '江苏省': 'east_china',
  '南京': 'east_china',
  '苏州': 'east_china',
  '无锡': 'east_china',
  '杭州': 'east_china',
  '浙江': 'east_china',
  '浙江省': 'east_china',
  '宁波': 'east_china',
  '安徽': 'east_china',
  '安徽省': 'east_china',
  '合肥': 'east_china',
  '福建': 'east_china',
  '福建省': 'east_china',
  '福州': 'east_china',
  '厦门': 'east_china',
  '江西': 'east_china',
  '江西省': 'east_china',
  '南昌': 'east_china',
  '山东': 'east_china',
  '山东省': 'east_china',
  '济南': 'east_china',
  '青岛': 'east_china',
  
  // 华中区域 (central_china)
  '河南': 'central_china',
  '河南省': 'central_china',
  '郑州': 'central_china',
  '湖北': 'central_china',
  '湖北省': 'central_china',
  '武汉': 'central_china',
  '湖南': 'central_china',
  '湖南省': 'central_china',
  '长沙': 'central_china',
  
  // 华南区域 (south_china)
  '广东': 'south_china',
  '广东省': 'south_china',
  '广州': 'south_china',
  '深圳': 'south_china',
  '东莞': 'south_china',
  '佛山': 'south_china',
  '广西': 'south_china',
  '广西壮族自治区': 'south_china',
  '南宁': 'south_china',
  '海南': 'south_china',
  '海南省': 'south_china',
  '海口': 'south_china',
  '三亚': 'south_china',
  
  // 西南区域 (southwest)
  '重庆': 'southwest',
  '重庆市': 'southwest',
  '四川': 'southwest',
  '四川省': 'southwest',
  '成都': 'southwest',
  '贵州': 'southwest',
  '贵州省': 'southwest',
  '贵阳': 'southwest',
  '云南': 'southwest',
  '云南省': 'southwest',
  '昆明': 'southwest',
  '西藏': 'southwest',
  '西藏自治区': 'southwest',
  '拉萨': 'southwest',
  
  // 西北区域 (northwest)
  '陕西': 'northwest',
  '陕西省': 'northwest',
  '西安': 'northwest',
  '甘肃': 'northwest',
  '甘肃省': 'northwest',
  '兰州': 'northwest',
  '青海': 'northwest',
  '青海省': 'northwest',
  '西宁': 'northwest',
  '宁夏': 'northwest',
  '宁夏回族自治区': 'northwest',
  '银川': 'northwest',
  '新疆': 'northwest',
  '新疆维吾尔自治区': 'northwest',
  '乌鲁木齐': 'northwest',
}

// 地区选项配置
export const REGION_OPTIONS = [
  { value: 'north_china', label: '华北区域' },
  { value: 'northeast', label: '东北区域' },
  { value: 'east_china', label: '华东区域' },
  { value: 'central_china', label: '华中区域' },
  { value: 'south_china', label: '华南区域' },
  { value: 'northwest', label: '西北区域' },
  { value: 'southwest', label: '西南区域' },
  { value: 'national_average', label: '全国平均' },
]

/**
 * 从地址文本中解析并匹配region
 * @param address 地址文本
 * @returns region代码，如果无法匹配则返回null
 */
export function parseAddressToRegion(address: string): string | null {
  if (!address || !address.trim()) {
    return null
  }

  const addressText = address.trim()

  // 遍历映射表，查找匹配的城市或省份
  for (const [key, region] of Object.entries(CITY_TO_REGION_MAP)) {
    if (addressText.includes(key)) {
      return region
    }
  }

  // 如果无法匹配，返回null
  return null
}

/**
 * 获取地区显示名称
 * @param region region代码
 * @returns 地区显示名称
 */
export function getRegionLabel(region: string): string {
  const option = REGION_OPTIONS.find(opt => opt.value === region)
  return option ? option.label : region
}

/**
 * 常见地址示例（用于自动完成提示）
 */
export const ADDRESS_EXAMPLES = [
  '北京市朝阳区xxx街道xxx号',
  '上海市浦东新区xxx路xxx号',
  '广州市天河区xxx大道xxx号',
  '深圳市南山区xxx街xxx号',
  '杭州市西湖区xxx路xxx号',
  '成都市锦江区xxx街xxx号',
  '武汉市江汉区xxx路xxx号',
  '西安市雁塔区xxx街xxx号',
  '南京市鼓楼区xxx路xxx号',
  '苏州市工业园区xxx路xxx号',
]


