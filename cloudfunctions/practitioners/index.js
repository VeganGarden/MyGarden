const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 践行者相关云函数
 * 
 * Actions:
 * - getList: 获取践行者列表
 * - getDetail: 获取践行者详情
 * - getCertifications: 获取践行者的认证列表
 * - getMentorList: 获取可用导师列表
 * - applyMentor: 申请导师陪伴
 */

exports.main = async (event, context) => {
  const { action, ...params } = event;
  
  // 获取用户OpenID
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  
  try {
    switch (action) {
      case 'getList':
        return await getPractitionersList(params);
      
      case 'getDetail':
        return await getPractitionerDetail(params);
      
      case 'getCertifications':
        return await getPractitionerCertifications(params);
      
      case 'getMentorList':
        return await getMentorList(params);
      
      case 'applyMentor':
        return await applyMentor(params, openId);
      
      case 'search':
        return await searchPractitioners(params);
      
      default:
        return {
          code: 400,
          message: '无效的action参数'
        };
    }
  } catch (error) {
    console.error('践行者云函数错误:', error);
    return {
      code: 500,
      message: '服务器错误',
      error: error.message
    };
  }
};

/**
 * 获取践行者列表
 */
async function getPractitionersList(params) {
  const {
    level = null,        // 等级筛选
    canBeMentor = null,  // 是否可做导师
    page = 1,
    pageSize = 20
  } = params;
  
  try {
    let query = db.collection('practitioners')
      .where({ status: 'active' });
    
    // 等级筛选
    if (level) {
      query = query.where({ 'certification.level': level });
    }
    
    // 导师筛选
    if (canBeMentor !== null) {
      query = query.where({ 'certification.canBeMentor': canBeMentor });
    }
    
    // 按素食年限倒序
    query = query.orderBy('veganJourney.veganYears', 'desc');
    
    // 分页
    const skip = (page - 1) * pageSize;
    const result = await query
      .skip(skip)
      .limit(pageSize)
      .field({
        practitionerId: true,
        'profile.realName': true,
        'profile.avatar': true,
        'profile.location': true,
        'veganJourney.veganYears': true,
        'veganJourney.veganType': true,
        'certification.level': true,
        'certification.canBeMentor': true,
        'certification.specialties': true,
        'uniqueWisdom.corePhilosophy': true
      })
      .get();
    
    // 获取总数
    const countResult = await query.count();
    
    return {
      code: 0,
      data: {
        list: result.data,
        total: countResult.total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.total / pageSize)
      }
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * 获取践行者详情
 */
async function getPractitionerDetail(params) {
  const { practitionerId } = params;
  
  if (!practitionerId) {
    return { code: 400, message: '缺少practitionerId参数' };
  }
  
  try {
    const result = await db.collection('practitioners')
      .where({ practitionerId })
      .get();
    
    if (result.data.length === 0) {
      return { code: 404, message: '践行者不存在' };
    }
    
    const practitioner = result.data[0];
    
    // 获取此践行者的认证数量
    const certCount = await db.collection('practitioner_certifications')
      .where({ practitionerId: practitioner._id })
      .count();
    
    // 获取精选智慧语录
    const quotes = await db.collection('wisdom_quotes')
      .where({ practitionerId: practitioner._id })
      .orderBy('likes', 'desc')
      .limit(5)
      .get();
    
    return {
      code: 0,
      data: {
        ...practitioner,
        stats: {
          certificationCount: certCount.total,
          quotesCount: quotes.data.length
        },
        featuredQuotes: quotes.data
      }
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * 获取践行者的认证列表
 */
async function getPractitionerCertifications(params) {
  const { practitionerId } = params;
  
  if (!practitionerId) {
    return { code: 400, message: '缺少practitionerId参数' };
  }
  
  try {
    // 先获取践行者ID
    const practitioner = await db.collection('practitioners')
      .where({ practitionerId })
      .field({ _id: true })
      .get();
    
    if (practitioner.data.length === 0) {
      return { code: 404, message: '践行者不存在' };
    }
    
    const practitionerObjectId = practitioner.data[0]._id;
    
    // 获取认证列表
    const certifications = await db.collection('practitioner_certifications')
      .where({ practitionerId: practitionerObjectId })
      .orderBy('weight', 'desc')
      .get();
    
    // 补充目标对象信息
    for (let cert of certifications.data) {
      if (cert.targetType === 'ingredient') {
        const ingredient = await db.collection('ingredients')
          .doc(cert.targetId)
          .field({ name: true, nameEn: true, carbonFootprint: true })
          .get();
        cert.targetInfo = ingredient.data;
      } else if (cert.targetType === 'recipe') {
        const recipe = await db.collection('recipes')
          .doc(cert.targetId)
          .field({ name: true, nameEn: true })
          .get();
        cert.targetInfo = recipe.data;
      }
    }
    
    return {
      code: 0,
      data: {
        total: certifications.data.length,
        list: certifications.data
      }
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * 获取可用导师列表
 */
async function getMentorList(params) {
  const {
    specialty = null,    // 专长筛选
    minYears = 0,        // 最少素食年限
    page = 1,
    pageSize = 20
  } = params;
  
  try {
    let query = db.collection('practitioners')
      .where({
        status: 'active',
        'certification.canBeMentor': true
      });
    
    // 素食年限筛选
    if (minYears > 0) {
      query = query.where({
        'veganJourney.veganYears': _.gte(minYears)
      });
    }
    
    // 专长筛选
    if (specialty) {
      query = query.where({
        'certification.specialties': specialty
      });
    }
    
    // 按素食年限倒序
    query = query.orderBy('veganJourney.veganYears', 'desc');
    
    const skip = (page - 1) * pageSize;
    const result = await query
      .skip(skip)
      .limit(pageSize)
      .field({
        practitionerId: true,
        'profile.realName': true,
        'profile.avatar': true,
        'veganJourney.veganYears': true,
        'certification.level': true,
        'certification.specialties': true,
        'certification.mentoredCount': true,
        'uniqueWisdom.corePhilosophy': true
      })
      .get();
    
    const countResult = await query.count();
    
    return {
      code: 0,
      data: {
        list: result.data,
        total: countResult.total,
        page,
        pageSize
      }
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * 申请导师陪伴
 */
async function applyMentor(params, openId) {
  const { mentorPractitionerId, targetGoal, planDuration = 90 } = params;
  
  if (!mentorPractitionerId) {
    return { code: 400, message: '缺少mentorPractitionerId参数' };
  }
  
  try {
    // 获取用户ID
    const user = await db.collection('users')
      .where({ openId })
      .field({ _id: true })
      .get();
    
    if (user.data.length === 0) {
      return { code: 404, message: '用户不存在' };
    }
    
    const userId = user.data[0]._id;
    
    // 检查是否已有导师
    const existingMentorship = await db.collection('mentorship')
      .where({
        menteeId: userId,
        status: _.in(['active', 'pending'])
      })
      .get();
    
    if (existingMentorship.data.length > 0) {
      return { code: 400, message: '您已有导师或申请待处理' };
    }
    
    // 获取导师信息
    const mentor = await db.collection('practitioners')
      .where({ practitionerId: mentorPractitionerId })
      .get();
    
    if (mentor.data.length === 0) {
      return { code: 404, message: '导师不存在' };
    }
    
    const mentorData = mentor.data[0];
    const mentorId = mentorData._id;
    
    // 创建陪伴关系
    const mentorshipResult = await db.collection('mentorship').add({
      data: {
        mentorId,
        menteeId: userId,
        mentorInfo: {
          name: mentorData.profile.realName,
          veganYears: mentorData.veganJourney.veganYears,
          specialties: mentorData.certification.specialties,
          avatar: mentorData.profile.avatar
        },
        plan: {
          startDate: new Date(),
          planDuration,
          currentDay: 1,
          targetGoal,
          milestones: [
            { day: 3, goal: '度过最想放弃的第3天', status: 'pending' },
            { day: 7, goal: '完成第一周', status: 'pending' },
            { day: 30, goal: '完成第一个月', status: 'pending' },
            { day: 90, goal: '完成3个月适应期', status: 'pending' }
          ]
        },
        interactions: [],
        progress: {
          currentStatus: '刚开始',
          challengesFaced: [],
          solutionsApplied: [],
          healthChanges: '',
          mealsRecorded: 0,
          carbonReduced: 0,
          daysConsecutive: 0
        },
        outcome: {
          success: false,
          completedAt: null,
          finalReport: '',
          testimonial: '',
          canBeUsedAsCase: false
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    // 更新导师的学员数量
    await db.collection('practitioners')
      .doc(mentorId)
      .update({
        data: {
          'certification.mentoredCount': _.inc(1)
        }
      });
    
    // 更新用户的导师信息
    await db.collection('users')
      .doc(userId)
      .update({
        data: {
          'mentorship.hasMentor': true,
          'mentorship.mentorId': mentorId
        }
      });
    
    return {
      code: 0,
      message: '导师申请成功',
      data: {
        mentorshipId: mentorshipResult._id,
        mentorName: mentorData.profile.realName
      }
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * 搜索践行者
 */
async function searchPractitioners(params) {
  const { keyword, page = 1, pageSize = 10 } = params;
  
  if (!keyword) {
    return { code: 400, message: '缺少搜索关键词' };
  }
  
  try {
    // 使用正则搜索（简化版）
    const skip = (page - 1) * pageSize;
    
    const result = await db.collection('practitioners')
      .where({
        status: 'active',
        _openid: _.exists(true)  // 确保有数据
      })
      .skip(skip)
      .limit(pageSize)
      .get();
    
    // 客户端过滤（因为云开发限制）
    const filtered = result.data.filter(p => 
      p.profile.realName.includes(keyword) ||
      p.uniqueWisdom.corePhilosophy.includes(keyword) ||
      p.certification.specialties.some(s => s.includes(keyword))
    );
    
    return {
      code: 0,
      data: {
        list: filtered,
        total: filtered.length,
        page,
        pageSize
      }
    };
    
  } catch (error) {
    throw error;
  }
}

