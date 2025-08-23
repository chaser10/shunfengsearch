// 顺丰API测试脚本
const axios = require('axios');

// API配置
const config = {
  partnerID: 'Y5Y030QF',
  secret: 'DQELQtFIB3x02fVhG9CLuhPlY1jAb0gf',
  authUrl: 'https://sfapi.sf-express.com',
  apiUrl: 'https://bspgw.sf-express.com'
};

// 测试Token获取
async function testTokenAPI() {
  console.log('🔐 测试Token获取API...');
  
  try {
    const params = new URLSearchParams({
      partnerID: config.partnerID,
      secret: config.secret,
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

    if (response.data && response.data.apiResultCode === 'A1000' && response.data.accessToken) {
      console.log('✅ Token获取成功');
      console.log('结果代码:', response.data.apiResultCode);
      console.log('有效期:', response.data.expiresIn, '秒');
      console.log('Token:', response.data.accessToken.substring(0, 20) + '...');
      return response.data.accessToken;
    } else {
      console.log('❌ Token获取失败');
      console.log('响应:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Token获取出错');
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('错误信息:', error.response.data);
    } else if (error.request) {
      console.log('网络错误:', error.message);
    } else {
      console.log('其他错误:', error.message);
    }
    return null;
  }
}

// 测试查询API
async function testQueryAPI(token) {
  console.log('\n📦 测试快递查询API...');
  
  if (!token) {
    console.log('❌ 无有效Token，跳过查询测试');
    return;
  }

  try {
    const requestData = {
      trackingType: 1,
      trackingNumber: ['444003077898'], // 使用12位数字格式
      language: 'zh-CN',
      methodType: 1
    };

    const timestamp = Date.now().toString();
    const msgData = JSON.stringify(requestData);

    const params = new URLSearchParams({
      service: 'EXP_RECE_SEARCH_ROUTES',
      timestamp: timestamp,
      msgData: msgData,
      accessToken: token,
      partnerID: config.partnerID,
      charset: 'UTF-8',
      format: 'json'
    });

    console.log('请求参数:');
    console.log('- service:', 'EXP_RECE_SEARCH_ROUTES');
    console.log('- partnerID:', config.partnerID);
    console.log('- timestamp:', timestamp);
    console.log('- msgData:', msgData);
    console.log('- accessToken:', token.substring(0, 20) + '...');

    const response = await axios.post(
      `${config.apiUrl}/std/service`,
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      }
    );

    console.log('✅ 查询API调用成功');
    console.log('响应代码:', response.data.apiResultCode);
    console.log('响应信息:', response.data.apiErrorMsg || '成功');
    
    if (response.data.apiResultData) {
      console.log('查询结果数量:', response.data.apiResultData.length);
    }
    
    console.log('完整响应:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ 查询API出错');
    if (error.response) {
      console.log('状态码:', error.response.status);
      console.log('错误信息:', error.response.data);
    } else if (error.request) {
      console.log('网络错误:', error.message);
    } else {
      console.log('其他错误:', error.message);
    }
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始顺丰API测试\n');
  console.log('配置信息:');
  console.log('Partner ID:', config.partnerID);
  console.log('认证URL:', config.authUrl);
  console.log('API URL:', config.apiUrl);
  console.log('密钥:', config.secret.substring(0, 10) + '...\n');

  // 测试Token获取
  const token = await testTokenAPI();
  
  // 测试查询API
  await testQueryAPI(token);
  
  console.log('\n✨ 测试完成');
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testTokenAPI, testQueryAPI, runTests };
