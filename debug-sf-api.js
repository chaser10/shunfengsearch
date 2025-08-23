// 顺丰API调试工具 - 专门用于诊断A1001错误
const axios = require('axios');

// API配置
const config = {
  partnerID: 'Y5Y030QF',
  secret: 'DQELQtFIB3x02fVhG9CLuhPlY1jAb0gf',
  authUrl: 'https://sfapi.sf-express.com',
  apiUrl: 'https://bspgw.sf-express.com'
};

// 获取Token
async function getToken() {
  console.log('🔐 步骤1: 获取访问令牌...');
  
  try {
    const params = new URLSearchParams({
      partnerID: config.partnerID,
      secret: config.secret,
      grantType: 'password'
    });

    console.log('Token请求参数:', {
      partnerID: config.partnerID,
      secret: config.secret.substring(0, 10) + '...',
      grantType: 'password'
    });

    const response = await axios.post(
      `${config.authUrl}/oauth2/accessToken`,
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    console.log('Token响应:', response.data);

    if (response.data && response.data.apiResultCode === 'A1000' && response.data.accessToken) {
      console.log('✅ Token获取成功');
      return response.data.accessToken;
    } else {
      console.log('❌ Token获取失败');
      return null;
    }
  } catch (error) {
    console.log('❌ Token获取出错:', error.message);
    return null;
  }
}

// 测试查询API - 详细版本
async function testQueryAPIDetailed(token) {
  console.log('\n📦 步骤2: 测试查询API（详细版本）...');
  
  if (!token) {
    console.log('❌ 无有效Token，跳过测试');
    return;
  }

  try {
    // 构建业务数据
    const requestData = {
      trackingType: 1,
      trackingNumber: ['SF1001234567890'], // 测试单号
      language: 'zh-CN',
      methodType: 1
    };

    // 测试手机尾号验证
    const requestDataWithPhone = {
      trackingType: 1,
      trackingNumber: ['SF1001234567890'],
      language: 'zh-CN',
      methodType: 1,
      checkPhoneNo: '1234' // 测试手机尾号
    };

    const timestamp = Date.now().toString();
    const msgData = JSON.stringify(requestData);

    // 方案1: 基础参数 (修正：使用serviceCode)
    console.log('\n--- 测试方案1: 基础参数 (serviceCode) ---');
    const params1 = new URLSearchParams({
      serviceCode: 'EXP_RECE_SEARCH_ROUTES',
      partnerID: config.partnerID,
      timestamp: timestamp,
      msgData: msgData,
      accessToken: token
    });

    await testRequest('方案1', params1);

    // 方案2: 添加requestID
    console.log('\n--- 测试方案2: 添加requestID ---');
    const params2 = new URLSearchParams({
      serviceCode: 'EXP_RECE_SEARCH_ROUTES',
      partnerID: config.partnerID,
      requestID: `REQ_${timestamp}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: timestamp,
      msgData: msgData,
      accessToken: token
    });

    await testRequest('方案2', params2);

    // 方案3: 添加更多可选参数
    console.log('\n--- 测试方案3: 添加更多参数 ---');
    const params3 = new URLSearchParams({
      serviceCode: 'EXP_RECE_SEARCH_ROUTES',
      partnerID: config.partnerID,
      requestID: `REQ_${timestamp}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: timestamp,
      msgData: msgData,
      accessToken: token,
      charset: 'UTF-8',
      format: 'json'
    });

    await testRequest('方案3', params3);

    // 方案4: 尝试不同的业务数据格式
    console.log('\n--- 测试方案4: 简化业务数据 ---');
    const simpleRequestData = {
      trackingType: 1,
      trackingNumber: ['SF1001234567890']
    };
    const params4 = new URLSearchParams({
      service: 'EXP_RECE_SEARCH_ROUTES',
      partnerID: config.partnerID,
      timestamp: timestamp,
      msgData: JSON.stringify(simpleRequestData),
      accessToken: token
    });

    await testRequest('方案4', params4);

    // 方案5: 尝试添加签名字段
    console.log('\n--- 测试方案5: 添加可能的签名字段 ---');
    const params5 = new URLSearchParams({
      service: 'EXP_RECE_SEARCH_ROUTES',
      partnerID: config.partnerID,
      timestamp: timestamp,
      msgData: msgData,
      accessToken: token,
      version: '2.0',
      signType: 'MD5'
    });

    await testRequest('方案5', params5);

    // 方案6: 测试手机尾号验证
    console.log('\n--- 测试方案6: 添加手机尾号验证 ---');
    const params6 = new URLSearchParams({
      serviceCode: 'EXP_RECE_SEARCH_ROUTES',
      partnerID: config.partnerID,
      timestamp: timestamp,
      msgData: JSON.stringify(requestDataWithPhone),
      accessToken: token
    });

    await testRequest('方案6', params6);

    // 方案6: 尝试不同的服务名称
    console.log('\n--- 测试方案6: 尝试其他服务名称 ---');
    const alternativeServices = [
      'EXP_RECE_SEARCH_FILTER_ROUTES',
      'RouteService',
      'EXP_RECE_SEARCH_ROUTES_NEW',
      'SEARCH_ROUTES'
    ];

    for (const serviceName of alternativeServices) {
      const params6 = new URLSearchParams({
        service: serviceName,
        partnerID: config.partnerID,
        timestamp: timestamp,
        msgData: msgData,
        accessToken: token
      });

      console.log(`\n测试服务名称: ${serviceName}`);
      await testRequest(`服务-${serviceName}`, params6);
    }

  } catch (error) {
    console.log('❌ 测试过程出错:', error.message);
  }
}

// 执行单个请求测试
async function testRequest(name, params) {
  try {
    console.log(`\n${name} 请求参数:`);
    const paramObj = {};
    for (const [key, value] of params.entries()) {
      paramObj[key] = key === 'accessToken' ? value.substring(0, 20) + '...' : value;
    }
    console.log(paramObj);
    console.log('参数字符串长度:', params.toString().length);

    const response = await axios.post(
      `${config.apiUrl}/std/service`,
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'SF-Express-Debug/1.0'
        },
        timeout: 30000,
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      }
    );

    console.log(`${name} 响应:`, {
      status: response.status,
      apiResultCode: response.data?.apiResultCode,
      apiErrorMsg: response.data?.apiErrorMsg,
      hasData: !!response.data?.apiResultData
    });

    if (response.data?.apiResultCode === 'A1001') {
      console.log(`❌ ${name} 仍然返回A1001错误`);
      console.log('完整响应:', response.data);
    } else if (response.data?.apiResultCode === 'A1000') {
      console.log(`✅ ${name} 成功！`);
    } else {
      console.log(`⚠️ ${name} 返回其他错误:`, response.data?.apiResultCode);
    }

  } catch (error) {
    console.log(`❌ ${name} 请求失败:`, error.message);
    if (error.response) {
      console.log('错误响应:', error.response.data);
    }
  }
}

// 参数验证工具
function validateParams(params) {
  console.log('\n🔍 参数验证:');
  
  const required = ['service', 'partnerID', 'timestamp', 'msgData', 'accessToken'];
  const missing = [];
  const empty = [];
  
  for (const param of required) {
    const value = params.get(param);
    if (!value) {
      missing.push(param);
    } else if (value.trim() === '') {
      empty.push(param);
    }
  }
  
  if (missing.length > 0) {
    console.log('❌ 缺少参数:', missing);
  }
  if (empty.length > 0) {
    console.log('❌ 空值参数:', empty);
  }
  if (missing.length === 0 && empty.length === 0) {
    console.log('✅ 所有必需参数都存在且非空');
  }
  
  // 检查参数格式
  console.log('\n参数格式检查:');
  console.log('- partnerID长度:', params.get('partnerID')?.length);
  console.log('- timestamp格式:', /^\d{13}$/.test(params.get('timestamp') || ''));
  console.log('- msgData是否为JSON:', (() => {
    try {
      JSON.parse(params.get('msgData') || '');
      return true;
    } catch {
      return false;
    }
  })());
  console.log('- accessToken长度:', params.get('accessToken')?.length);
}

// 主函数
async function main() {
  console.log('🚀 顺丰API A1001错误诊断工具');
  console.log('================================\n');
  
  const token = await getToken();
  if (token) {
    await testQueryAPIDetailed(token);
  }
  
  console.log('\n✨ 诊断完成');
}

// 运行诊断
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { getToken, testQueryAPIDetailed, validateParams };
