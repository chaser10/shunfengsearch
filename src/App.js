import React, { useState, useCallback } from 'react';
import axios from 'axios';
import './App.css';

// 顺丰快递批量查询应用

// 演示数据（当API不可用时使用）
const demoResults = [
  {
    mailNo: 'SF1001234567890',
    success: true,
    routes: [
      {
        acceptTime: '2024-01-15 09:30:00',
        acceptAddress: '广东省深圳市南山区顺丰速运营业点',
        opCode: 'PICKUP',
        remark: '快件已被收取'
      },
      {
        acceptTime: '2024-01-15 12:45:00',
        acceptAddress: '广东省深圳市南山区处理中心',
        opCode: 'SORTING',
        remark: '快件在处理中心进行分拣'
      },
      {
        acceptTime: '2024-01-15 18:20:00',
        acceptAddress: '广东省深圳市南山区处理中心',
        opCode: 'DEPARTURE',
        remark: '快件已发出，下一站：上海转运中心'
      },
      {
        acceptTime: '2024-01-16 06:15:00',
        acceptAddress: '上海市浦东新区转运中心',
        opCode: 'ARRIVAL',
        remark: '快件到达转运中心'
      },
      {
        acceptTime: '2024-01-16 14:20:00',
        acceptAddress: '上海市黄浦区顺丰速运营业点',
        opCode: 'DELIVERY',
        remark: '快件正在派送中，派送员：李四，电话：138****5678'
      },
      {
        acceptTime: '2024-01-16 16:45:00',
        acceptAddress: '上海市黄浦区某某小区',
        opCode: 'DELIVERED',
        remark: '快件已签收，签收人：王五'
      }
    ]
  }
];

// 生成演示数据
function generateDemoData(trackingNumbers) {
  return trackingNumbers.map((num, index) => {
    if (index === 0 && demoResults[0]) {
      return { ...demoResults[0], mailNo: num };
    }

    return {
      mailNo: num,
      success: Math.random() > 0.3, // 70%成功率
      routes: Math.random() > 0.3 ? [
        {
          acceptTime: '2024-01-15 10:00:00',
          acceptAddress: '广东省深圳市南山区顺丰速运营业点',
          opCode: 'PICKUP',
          remark: '快件已被收取'
        },
        {
          acceptTime: '2024-01-15 15:30:00',
          acceptAddress: '广东省深圳市南山区处理中心',
          opCode: 'SORTING',
          remark: '快件在处理中心进行分拣'
        }
      ] : [],
      errorCode: Math.random() > 0.3 ? undefined : 'NO_ROUTE_DATA',
      errorMsg: Math.random() > 0.3 ? undefined : '暂无路由信息或快递单号不存在'
    };
  });
}

// 验证快递单号
function validateTrackingNumber(trackingNumber) {
  if (!trackingNumber || typeof trackingNumber !== 'string') {
    return false;
  }

  const trimmed = trackingNumber.trim().toUpperCase();

  // 基本长度检查：快递单号通常在8-20位之间
  if (trimmed.length < 8 || trimmed.length > 20) {
    return false;
  }

  // 顺丰快递单号格式（按优先级排序）
  const patterns = [
    // 顺丰标准格式：SF + 10-12位数字
    /^SF\d{10,12}$/,

    // 纯数字格式：10-15位数字
    /^\d{10,15}$/,

    // 两个字母开头 + 数字：如EMS、YTO等
    /^[A-Z]{2}\d{8,15}$/,

    // 三个字母开头 + 数字：如JDX等
    /^[A-Z]{3}\d{8,15}$/,

    // 字母数字混合格式
    /^[A-Z0-9]{10,20}$/,

    // 包含连字符的格式
    /^[A-Z0-9-]{10,25}$/
  ];

  const isValid = patterns.some(pattern => pattern.test(trimmed));

  // 调试信息（开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log(`验证快递单号: "${trimmed}" -> ${isValid ? '有效' : '无效'}`);
  }

  return isValid;
}

// 解析输入的快递单号
function parseTrackingNumbers(input) {
  if (!input || !input.trim()) {
    return [];
  }

  // 分割输入，支持多种分隔符
  const rawNumbers = input
    .split(/[\n,;，；\s\t]+/)
    .map(num => num.trim())
    .filter(num => num.length > 0);

  // 过滤有效的快递单号
  const validNumbers = rawNumbers
    .map(num => num.toUpperCase())
    .filter(num => validateTrackingNumber(num)); // 移除数量限制

  // 调试信息（开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log('原始输入:', rawNumbers);
    console.log('有效单号:', validNumbers);
    console.log('无效单号:', rawNumbers.filter(num => !validateTrackingNumber(num.toUpperCase())));
  }

  return validNumbers;
}

// 检测重复快递单号的函数
function detectDuplicateNumbers(numbers) {
  const duplicates = {};
  const counts = {};

  // 统计每个单号的出现次数
  numbers.forEach(num => {
    const upperNum = num.toUpperCase();
    counts[upperNum] = (counts[upperNum] || 0) + 1;
  });

  // 找出重复的单号
  Object.keys(counts).forEach(num => {
    if (counts[num] > 1) {
      duplicates[num] = counts[num];
    }
  });

  return { duplicates, counts };
}

// 验证输入并返回详细的验证结果
function validateTrackingInput(input) {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      validNumbers: [],
      errors: ['请输入快递单号']
    };
  }

  const rawNumbers = input
    .split(/[\n,;，；\s\t]+/)
    .map(num => num.trim())
    .filter(num => num.length > 0);

  if (rawNumbers.length === 0) {
    return {
      isValid: false,
      validNumbers: [],
      errors: ['请输入有效的快递单号']
    };
  }

  const validNumbers = [];
  const invalidNumbers = [];
  const errors = [];

  rawNumbers.forEach((num, index) => {
    const upperNum = num.toUpperCase();
    if (validateTrackingNumber(upperNum)) {
      validNumbers.push(upperNum);
    } else {
      invalidNumbers.push(`第${index + 1}个单号格式不正确: "${num}"`);
    }
  });

  if (validNumbers.length === 0) {
    errors.push('没有找到有效的快递单号');
    errors.push(...invalidNumbers);
  } else if (invalidNumbers.length > 0) {
    errors.push(`发现${invalidNumbers.length}个无效单号:`);
    errors.push(...invalidNumbers);
  }

  // 移除数量限制，支持任意数量查询
  if (validNumbers.length > 50) {
    errors.push(`查询数量较多 (${validNumbers.length} 个)，建议分批查询以获得更好的性能`);
  }

  // 检测重复单号并生成详细信息
  const { duplicates, counts } = detectDuplicateNumbers(validNumbers);
  const uniqueNumbers = [...new Set(validNumbers)];

  const duplicateInfo = {
    hasDuplicates: Object.keys(duplicates).length > 0,
    duplicates: duplicates,
    counts: counts,
    totalDuplicates: validNumbers.length - uniqueNumbers.length
  };

  if (duplicateInfo.hasDuplicates) {
    const duplicateList = Object.keys(duplicates).map(num => `${num} (出现${duplicates[num]}次)`);
    errors.push(`发现重复单号：${duplicateList.join(', ')}`);
  }

  return {
    isValid: uniqueNumbers.length > 0,
    validNumbers: uniqueNumbers,
    duplicateInfo: duplicateInfo,
    errors: errors
  };
}

// 顺丰API服务类
class SFExpressAPI {
  constructor() {
    this.accessToken = null;
    this.tokenExpireTime = 0;
    this.partnerID = process.env.REACT_APP_SF_PARTNER_ID;
    this.secret = process.env.REACT_APP_SF_SECRET;
    this.authUrl = process.env.REACT_APP_SF_AUTH_URL || 'https://sfapi.sf-express.com';
    this.apiUrl = process.env.REACT_APP_SF_API_BASE_URL || 'https://bspgw.sf-express.com';
  }

  // 获取访问令牌
  async getAccessToken() {
    // 检查token是否还有效（提前5分钟刷新）
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpireTime - 5 * 60 * 1000) {
      return this.accessToken;
    }

    if (!this.partnerID || !this.secret) {
      throw new Error('缺少必要的API配置信息，请检查环境变量');
    }

    try {
      const params = new URLSearchParams({
        partnerID: this.partnerID,
        secret: this.secret,
        grantType: 'password'
      });

      const response = await axios.post(
        `${this.authUrl}/oauth2/accessToken`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      if (response.data && response.data.apiResultCode === 'A1000' && response.data.accessToken) {
        this.accessToken = response.data.accessToken;
        // 设置过期时间（提前5分钟）
        this.tokenExpireTime = now + (response.data.expiresIn - 300) * 1000;
        return this.accessToken;
      } else {
        throw new Error(`获取访问令牌失败: ${response.data?.apiErrorMsg || '未知错误'}`);
      }
    } catch (error) {
      console.error('Token获取失败:', error);
      if (error.response) {
        throw new Error(`认证失败: ${error.response.status} ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('网络连接失败，请检查网络设置');
      } else {
        throw new Error(`认证失败: ${error.message}`);
      }
    }
  }

  // 批量查询快递路由信息 - 支持真正的并发批量查询
  async searchRoutes(trackingNumbers, checkPhoneNo = null, onProgress = null) {
    try {
      // 验证输入
      if (!trackingNumbers || trackingNumbers.length === 0) {
        return {
          success: false,
          error: '请输入至少一个快递单号'
        };
      }

      // 移除数量限制，支持任意数量的快递单号批量查询
      if (trackingNumbers.length > 50) {
        console.warn(`查询数量较多 (${trackingNumbers.length} 个)，建议分批查询以获得更好的性能`);
      }

      // 验证必需的配置参数
      if (!this.partnerID || !this.secret) {
        return {
          success: false,
          error: '缺少必要的API配置信息（Partner ID或密钥）'
        };
      }

      // 获取访问令牌
      const token = await this.getAccessToken();

      if (!token) {
        return {
          success: false,
          error: '无法获取有效的访问令牌'
        };
      }

      console.log(`开始批量查询 ${trackingNumbers.length} 个快递单号...`);

      // 实现并发控制的批量查询
      return await this.performBatchQuery(trackingNumbers, checkPhoneNo, token, onProgress);

    } catch (error) {
      console.error('批量查询失败:', error);
      return {
        success: false,
        error: error.message || '批量查询过程中发生未知错误'
      };
    }
  }

  // 执行并发控制的批量查询
  async performBatchQuery(trackingNumbers, checkPhoneNo, token, onProgress) {
    const results = [];
    const concurrencyLimit = 3; // 并发限制：同时最多3个请求
    const totalCount = trackingNumbers.length;
    let completedCount = 0;

    // 更新进度
    const updateProgress = (completed, total, currentNumber = null) => {
      if (onProgress) {
        onProgress({
          completed,
          total,
          percentage: Math.round((completed / total) * 100),
          currentNumber
        });
      }
    };

    // 单个快递单号查询函数
    const querySingleNumber = async (trackingNumber) => {
      try {
        console.log(`查询快递单号: ${trackingNumber}`);
        updateProgress(completedCount, totalCount, trackingNumber);

        const result = await this.querySingleTrackingNumber(trackingNumber, checkPhoneNo, token);

        completedCount++;
        updateProgress(completedCount, totalCount);

        return result;
      } catch (error) {
        console.error(`查询快递单号 ${trackingNumber} 失败:`, error);
        completedCount++;
        updateProgress(completedCount, totalCount);

        return {
          mailNo: trackingNumber,
          success: false,
          errorCode: 'QUERY_ERROR',
          errorMsg: error.message || '查询失败',
          routes: []
        };
      }
    };

    // 使用并发控制执行查询
    for (let i = 0; i < trackingNumbers.length; i += concurrencyLimit) {
      const batch = trackingNumbers.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(querySingleNumber);

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        console.error('批次查询失败:', error);
        // 即使批次失败，也要继续处理其他批次
      }
    }

    console.log(`批量查询完成，共处理 ${results.length} 个快递单号`);

    return {
      success: true,
      data: results,
      summary: {
        total: totalCount,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    };
  }

  // 查询单个快递单号
  async querySingleTrackingNumber(trackingNumber, checkPhoneNo, token) {
    try {
      // 构建业务数据 - 单个快递单号查询
      const requestData = {
        trackingType: 1,
        trackingNumber: [trackingNumber], // 单个快递单号数组
        language: 'zh-CN',
        methodType: 1
      };

      // 如果提供了手机尾号，添加到请求数据中
      if (checkPhoneNo && checkPhoneNo.length === 4) {
        requestData.checkPhoneNo = checkPhoneNo;
      }

      const timestamp = Date.now().toString();
      const msgData = JSON.stringify(requestData);

      // 构建请求参数 - 确保所有必需参数都存在
      const requestParams = {
        serviceCode: 'EXP_RECE_SEARCH_ROUTES',
        partnerID: this.partnerID,
        requestID: `REQ_${timestamp}_${Math.random().toString(36).substring(2, 11)}`,
        timestamp: timestamp,
        msgData: msgData,
        accessToken: token
      };

      // 验证所有必需参数（包括requestID）
      const requiredParams = ['serviceCode', 'partnerID', 'requestID', 'timestamp', 'msgData', 'accessToken'];
      const missingParams = requiredParams.filter(param => !requestParams[param]);

      if (missingParams.length > 0) {
        console.error('缺少必需参数:', missingParams);
        throw new Error(`缺少必需参数: ${missingParams.join(', ')}`);
      }

      const params = new URLSearchParams(requestParams);

      // 详细的调试信息
      console.log('=== 顺丰API请求详情 ===');
      console.log('请求URL:', `${this.apiUrl}/std/service`);
      console.log('请求参数:', requestParams);
      console.log('业务数据:', requestData);
      console.log('参数字符串:', params.toString());

      const response = await axios.post(
        `${this.apiUrl}/std/service`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'SF-Express-Tracker/1.0'
          },
          timeout: 30000,
          validateStatus: function (status) {
            // 接受200-299和400-499的状态码，以便获取详细错误信息
            return status >= 200 && status < 500;
          }
        }
      );

      console.log('=== 顺丰API响应详情 ===');
      console.log('HTTP状态码:', response.status);
      console.log('响应头:', response.headers);
      console.log('响应数据:', response.data);

      // 检查响应格式
      if (!response.data) {
        return {
          success: false,
          error: 'API返回空响应'
        };
      }

      if (response.data && response.data.apiResultCode === 'A1000') {
        // 处理成功响应 - 解析嵌套的JSON数据
        console.log('API返回成功，开始解析数据...');

        try {
          // 第一步：解析apiResultData中的JSON字符串
          const parsedData = JSON.parse(response.data.apiResultData);
          console.log('解析后的数据:', parsedData);

          // 第二步：从msgData.routeResps中提取路由数据
          const routeResps = parsedData?.msgData?.routeResps || [];
          console.log('提取的路由响应:', routeResps);

          // 第三步：查找当前快递单号的路由数据
          const routeData = routeResps.find(
            item => item.mailNo === trackingNumber
          );

          if (routeData && routeData.routes && routeData.routes.length > 0) {
            // 显示所有路由信息，提供完整的快递历史
            return {
              mailNo: trackingNumber,
              success: true,
              routes: routeData.routes.map(route => ({
                acceptTime: route.acceptTime || '',
                acceptAddress: route.acceptAddress || '',
                opCode: route.opCode || '',
                remark: route.remark || '',
                // 添加顺丰特有的状态信息
                firstStatusName: route.firstStatusName || '',
                secondaryStatusName: route.secondaryStatusName || ''
              })),
              // 添加完整路由数据的统计信息
              totalRoutes: routeData.routes.length,
              // 添加最新状态信息用于快速预览
              latestStatus: {
                firstStatusName: routeData.routes[routeData.routes.length - 1]?.firstStatusName || '',
                secondaryStatusName: routeData.routes[routeData.routes.length - 1]?.secondaryStatusName || '',
                acceptTime: routeData.routes[routeData.routes.length - 1]?.acceptTime || '',
                acceptAddress: routeData.routes[routeData.routes.length - 1]?.acceptAddress || ''
              }
            };
          } else {
            return {
              mailNo: trackingNumber,
              success: false,
              errorCode: 'NO_ROUTE_DATA',
              errorMsg: '暂无路由信息或快递单号不存在',
              routes: []
            };
          }

        } catch (parseError) {
          console.error('解析API响应数据失败:', parseError);
          return {
            success: false,
            error: `数据解析失败: ${parseError.message}`,
            code: 'PARSE_ERROR'
          };
        }
      } else {
        // 详细的错误分析
        const errorCode = response.data?.apiResultCode;
        const errorMsg = response.data?.apiErrorMsg || '查询失败';

        console.log('=== API错误分析 ===');
        console.log('错误码:', errorCode);
        console.log('错误信息:', errorMsg);

        if (errorCode === 'A1001') {
          console.log('A1001错误详细分析:');
          console.log('- 检查必传参数:', requiredParams);
          console.log('- 当前参数值:', requestParams);
          console.log('- 可能缺少requestID参数');

          return {
            success: false,
            error: `A1001错误 - 必传参数不可为空。请检查是否缺少requestID参数。`,
            code: errorCode,
            debugInfo: {
              requestParams: requestParams,
              suggestion: '确保包含所有必需参数，特别是requestID'
            }
          };
        }

        return {
          success: false,
          error: `${errorCode}: ${errorMsg}`,
          code: errorCode,
          debugInfo: {
            requestParams: requestParams,
            responseData: response.data
          }
        };
      }
    } catch (error) {
      console.error('路由查询失败:', error);

      if (error.response?.status === 401) {
        // Token过期，清除缓存的token
        this.accessToken = null;
        this.tokenExpireTime = 0;
        return {
          success: false,
          error: '认证已过期，请重试'
        };
      }

      if (error.response) {
        return {
          success: false,
          error: `API请求失败: ${error.response.status} ${error.response.statusText}`
        };
      } else if (error.request) {
        return {
          success: false,
          error: '网络连接失败，请检查网络设置'
        };
      } else {
        return {
          success: false,
          error: error.message || '未知错误'
        };
      }
    }
  }
}

// 创建API实例
const sfApi = new SFExpressAPI();



// 提取派送员信息的辅助函数
function extractDeliveryPersonInfo(remark) {
  if (!remark) return null;

  // 正则表达式匹配派送员信息：快件交给【姓名，联系电话：手机号】
  const deliveryPattern = /快件交给【([^，]+)，联系电话：(\d{11})】/;
  const match = remark.match(deliveryPattern);

  if (match) {
    const name = match[1];
    const phone = match[2];

    return {
      name: name,
      phone: phone // 直接显示完整手机号，不进行隐藏
    };
  }

  return null;
}

// 从路由历史中查找派送员信息
function findDeliveryPersonFromHistory(routes) {
  if (!routes || routes.length === 0) return null;

  // 策略1: 首先检查最新记录（可能是已签收记录）
  const latestRoute = routes[routes.length - 1];
  let deliveryPerson = extractDeliveryPersonInfo(latestRoute.remark);

  if (deliveryPerson) {
    return deliveryPerson;
  }

  // 策略2: 向前查找，优先查找"派送中"状态的记录
  for (let i = routes.length - 2; i >= 0; i--) {
    const route = routes[i];
    const status = route.firstStatusName || route.secondaryStatusName || '';

    // 优先查找派送中状态的记录
    if (status === '派送中') {
      deliveryPerson = extractDeliveryPersonInfo(route.remark);
      if (deliveryPerson) {
        return deliveryPerson;
      }
    }
  }

  // 策略3: 如果派送中状态没有找到，则查找所有记录中的派送员信息
  for (let i = routes.length - 2; i >= 0; i--) {
    const route = routes[i];
    deliveryPerson = extractDeliveryPersonInfo(route.remark);
    if (deliveryPerson) {
      return deliveryPerson;
    }
  }

  return null;
}

// 获取快递最新状态
function getLatestStatus(routes) {
  if (!routes || routes.length === 0) {
    return {
      status: '无状态信息',
      statusColor: 'gray',
      time: '',
      address: '',
      deliveryPerson: null
    };
  }

  // 获取最新的路由记录（最后一条）
  const latestRoute = routes[routes.length - 1];

  const status = latestRoute.firstStatusName || latestRoute.secondaryStatusName || '未知状态';
  let statusColor = 'gray';

  // 根据状态设置颜色
  switch (status) {
    case '已签收':
      statusColor = 'green';
      break;
    case '派送中':
      statusColor = 'yellow';
      break;
    case '运送中':
      statusColor = 'blue';
      break;
    case '已揽收':
      statusColor = 'purple';
      break;
    default:
      statusColor = 'gray';
  }

  // 智能提取派送员信息：对于已签收和派送中状态，从历史记录中查找
  let deliveryPerson = null;
  if (status === '已签收' || status === '派送中') {
    deliveryPerson = findDeliveryPersonFromHistory(routes);
  } else {
    // 其他状态只检查当前记录
    deliveryPerson = extractDeliveryPersonInfo(latestRoute.remark);
  }

  return {
    status,
    statusColor,
    time: latestRoute.acceptTime || '',
    address: latestRoute.acceptAddress || '',
    remark: latestRoute.remark || '',
    deliveryPerson: deliveryPerson
  };
}

// 导出功能
function exportToCSV(results, filename) {
  const headers = ['快递单号', '序号', '处理时间', '处理地点', '操作代码', '状态描述'];
  const rows = [headers];
  
  results.forEach(result => {
    if (result.success && result.routes && result.routes.length > 0) {
      result.routes.forEach((route, index) => {
        rows.push([
          result.mailNo,
          (index + 1).toString(),
          route.acceptTime || '',
          route.acceptAddress || '',
          route.opCode || '',
          route.remark || ''
        ]);
      });
    } else {
      rows.push([
        result.mailNo,
        '1',
        '',
        '',
        result.errorCode || '',
        result.errorMsg || '查询失败'
      ]);
    }
  });

  const csvContent = rows.map(row => 
    row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const fileName = filename || `快递查询结果_${new Date().toISOString().slice(0, 10)}.csv`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

function App() {
  const [input, setInput] = useState('');
  const [phoneLastFour, setPhoneLastFour] = useState(''); // 手机尾号
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [apiStatus, setApiStatus] = useState('ready'); // ready, connecting, connected, error
  const [isDemoMode, setIsDemoMode] = useState(false);
  // 批量查询进度状态
  const [queryProgress, setQueryProgress] = useState(null);
  // 重复信息状态
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // 使用新的验证函数
    const validation = validateTrackingInput(input);

    if (!validation.isValid) {
      // 显示详细的错误信息
      const errorMsg = validation.errors.join('\n');
      setError(errorMsg);
      return;
    }

    const numbers = validation.validNumbers;

    // 保存重复信息用于结果显示
    setDuplicateInfo(validation.duplicateInfo);

    // 如果有警告信息，显示但不阻止查询
    if (validation.errors.length > 0) {
      console.warn('输入验证警告:', validation.errors);
    }

    setIsLoading(true);
    setError('');
    setResults([]);
    setQueryProgress(null);
    setApiStatus('connecting');

    try {
      console.log('开始查询快递单号:', numbers);
      if (phoneLastFour) {
        console.log('使用手机尾号验证:', phoneLastFour);
      }

      // 进度回调函数
      const onProgress = (progress) => {
        setQueryProgress(progress);
        console.log(`查询进度: ${progress.completed}/${progress.total} (${progress.percentage}%)`);
        if (progress.currentNumber) {
          console.log(`正在查询: ${progress.currentNumber}`);
        }
      };

      const response = await sfApi.searchRoutes(numbers, phoneLastFour || null, onProgress);
      setApiStatus('connected');

      if (response.success && response.data) {
        setResults(response.data);
        const successCount = response.data.filter(r => r.success).length;
        const totalCount = response.data.length;

        if (response.isDemo) {
          setIsDemoMode(true);

          if (response.apiError === 'A1001') {
            setError(`⚠️ API调用失败 (A1001错误)，当前显示演示数据

🔍 A1001错误分析：
• 错误含义：必传参数不可为空
• 可能原因：API服务权限未开通或参数格式不正确

💡 解决建议：
1. 确认Partner ID (${process.env.REACT_APP_SF_PARTNER_ID}) 已开通快递查询服务权限
2. 联系顺丰技术支持确认服务配置
3. 检查API账户状态是否正常

📞 技术支持：请联系顺丰开放平台技术支持团队`);
          } else {
            setError('注意：当前显示的是演示数据，因为API配置可能需要调整。请联系管理员配置正确的API参数。');
          }
        } else {
          setIsDemoMode(false);
          if (successCount === 0) {
            setError('所有快递单号查询失败，请检查单号是否正确');
          } else if (successCount < totalCount) {
            setError(`部分查询失败：${totalCount - successCount}/${totalCount} 个单号查询失败`);
          }
        }

        console.log('查询成功，结果:', response.data);
      } else {
        const errorMsg = response.error || '查询失败，请重试';
        setError(errorMsg);
        setApiStatus('error');
        console.error('查询失败:', errorMsg, response.code);
      }
    } catch (err) {
      console.error('查询过程中发生错误:', err);
      setError(err.message || '网络错误，请检查网络连接后重试');
      setApiStatus('error');
    } finally {
      setIsLoading(false);
      setQueryProgress(null); // 清除进度状态
    }
  }, [input, phoneLastFour]);

  const toggleExpanded = (mailNo) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(mailNo)) {
      newExpanded.delete(mailNo);
    } else {
      newExpanded.add(mailNo);
    }
    setExpandedItems(newExpanded);
  };

  const handleExport = () => {
    if (results.length > 0) {
      exportToCSV(results);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SF</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                顺丰快递批量查询
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                支持批量查询快递路由信息
              </div>
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
                  apiStatus === 'connected' ? 'bg-green-100 text-green-800' :
                  apiStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                  apiStatus === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    apiStatus === 'connected' ? 'bg-green-500' :
                    apiStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                    apiStatus === 'error' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`}></div>
                  <span>
                    {apiStatus === 'connected' ? 'API已连接' :
                     apiStatus === 'connecting' ? 'API连接中' :
                     apiStatus === 'error' ? 'API连接失败' :
                     'API就绪'}
                  </span>
                </div>

                {isDemoMode && (
                  <div className="flex items-center space-x-1 text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span>演示模式</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-700">{error}</div>
            </div>
          )}

          {/* 输入表单 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              批量查询快递单号
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  快递单号 *
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="请输入快递单号，例如：&#10;SF1001234567890&#10;SF1001234567891&#10;&#10;支持换行、逗号或分号分隔，支持批量查询"
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={isLoading}
                />
              </div>

              {/* 手机尾号输入框 */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    手机尾号（后4位）
                  </label>
                  <div className="relative group">
                    <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="tooltip">
                      部分快递查询可能需要手机尾号验证
                    </div>
                  </div>
                </div>
                <input
                  type="text"
                  value={phoneLastFour}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // 只允许数字
                    if (value.length <= 4) {
                      setPhoneLastFour(value);
                    }
                  }}
                  placeholder="例如：1234"
                  maxLength="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  可选字段，部分快递查询可能需要手机尾号验证
                </p>
              </div>

              {/* 查询进度显示 */}
              {queryProgress && (
                <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">
                      批量查询进度
                    </span>
                    <span className="text-sm text-blue-600">
                      {queryProgress.completed}/{queryProgress.total} ({queryProgress.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${queryProgress.percentage}%` }}
                    ></div>
                  </div>
                  {queryProgress.currentNumber && (
                    <div className="text-xs text-blue-600">
                      正在查询: {queryProgress.currentNumber}
                    </div>
                  )}
                </div>
              )}

              {/* 查询前去重信息提示 */}
              {input && (() => {
                const validation = validateTrackingInput(input);
                if (validation.isValid && validation.duplicateInfo?.hasDuplicates) {
                  return (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="text-sm text-yellow-800">
                        📋 将查询 <strong>{validation.validNumbers.length}</strong> 个去重后的快递单号
                        （原输入 {validation.validNumbers.length + validation.duplicateInfo.totalDuplicates} 个，去重 {validation.duplicateInfo.totalDuplicates} 个）
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (queryProgress ? `查询中 ${queryProgress.completed}/${queryProgress.total}` : '查询中...') : '开始查询'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setInput('');
                    setPhoneLastFour('');
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  清空
                </button>
                
                <button
                  type="button"
                  onClick={() => setInput('SF1001234567890\n123456789012\nYT1234567890\nJDX1234567890')}
                  disabled={isLoading}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  使用示例
                </button>

                <button
                  type="button"
                  onClick={() => setInput('SF1234567890, 123456789012; YT1234567890\nJDX1234567890')}
                  disabled={isLoading}
                  className="px-3 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  测试分隔符
                </button>
              </div>
            </form>

            {/* 格式说明和测试工具 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-800 mb-3">支持的快递单号格式：</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                <div>
                  <strong>顺丰快递：</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• SF + 10-12位数字：SF1234567890</li>
                    <li>• 纯数字：123456789012</li>
                  </ul>
                </div>
                <div>
                  <strong>其他快递：</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• 两字母开头：YT1234567890</li>
                    <li>• 三字母开头：JDX1234567890</li>
                    <li>• 字母数字混合：ABC123DEF456</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <h5 className="text-sm font-medium text-blue-800 mb-1">📱 手机尾号验证说明：</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 部分快递查询需要手机尾号验证（寄件人或收件人手机号后4位）</li>
                  <li>• 如果查询失败，可尝试输入手机尾号重新查询</li>
                  <li>• 手机尾号为可选字段，不影响正常查询流程</li>
                </ul>
              </div>

              {/* 实时验证提示 */}
              {input && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">输入验证结果：</h5>
                  {(() => {
                    const validation = validateTrackingInput(input);
                    return (
                      <div className="space-y-2">
                        <div className={`text-sm ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          {validation.isValid ?
                            `✅ 找到 ${validation.validNumbers.length} 个有效快递单号` :
                            '❌ 没有找到有效的快递单号'
                          }
                        </div>

                        {validation.validNumbers.length > 0 && (
                          <div className="text-sm text-gray-600">
                            <strong>有效单号：</strong> {validation.validNumbers.join(', ')}
                          </div>
                        )}

                        {validation.errors.length > 0 && (
                          <div className="text-sm text-orange-600">
                            <strong>提示：</strong>
                            <ul className="ml-4 mt-1">
                              {validation.errors.map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* 查询结果 */}
          {results.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">批量查询结果</h2>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-600">
                      📦 总计: {results.length} 个快递单号
                    </span>
                    <span className="text-green-600">
                      ✅ 成功: {results.filter(r => r.success).length}
                    </span>
                    <span className="text-red-600">
                      ❌ 失败: {results.filter(r => !r.success).length}
                    </span>
                    {results.length > 1 && (
                      <span className="text-blue-600">
                        🚀 并发查询完成
                      </span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  导出CSV
                </button>
              </div>

              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={result.mailNo}
                    className={`border rounded-lg overflow-hidden ${
                      result.success ? 'border-green-200' : 'border-red-200'
                    }`}
                  >
                    <div
                      className={`p-4 cursor-pointer transition-colors ${
                        result.success 
                          ? 'bg-green-50 hover:bg-green-100' 
                          : 'bg-red-50 hover:bg-red-100'
                      }`}
                      onClick={() => toggleExpanded(result.mailNo)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-500">
                            #{index + 1}
                          </span>
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-lg font-semibold">
                                {result.mailNo}
                              </span>
                              {/* 显示重复标注 */}
                              {duplicateInfo && duplicateInfo.counts && duplicateInfo.counts[result.mailNo] > 1 && (
                                <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                                  原输入中重复 {duplicateInfo.counts[result.mailNo]} 次
                                </span>
                              )}
                            </div>
                            {/* 显示最新状态 */}
                            {result.success && result.routes && result.routes.length > 0 && (() => {
                              const latestStatus = getLatestStatus(result.routes);
                              return (
                                <div className="space-y-1 mt-1">
                                  {/* 状态、时间、地址行 */}
                                  <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      latestStatus.statusColor === 'green' ? 'bg-green-100 text-green-800' :
                                      latestStatus.statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                                      latestStatus.statusColor === 'blue' ? 'bg-blue-100 text-blue-800' :
                                      latestStatus.statusColor === 'purple' ? 'bg-purple-100 text-purple-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {latestStatus.status}
                                    </span>
                                    {latestStatus.time && (
                                      <span className="text-xs text-gray-500">
                                        {latestStatus.time}
                                      </span>
                                    )}
                                    {latestStatus.address && (
                                      <span className="text-xs text-gray-500">
                                        📍 {latestStatus.address}
                                      </span>
                                    )}
                                  </div>

                                  {/* 派送员信息行 */}
                                  {latestStatus.deliveryPerson && (
                                    <div className="flex items-center space-x-3 text-xs">
                                      <span className="text-blue-600 flex items-center">
                                        👤 {latestStatus.deliveryPerson.name}
                                      </span>
                                      <span className="text-green-600 flex items-center">
                                        📞 {latestStatus.deliveryPerson.phone}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            result.success
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {result.success ? '查询成功' : '查询失败'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {result.success && result.routes && (
                            <span className="text-sm text-gray-600">
                              {result.routes.length} 条记录
                            </span>
                          )}
                          <span className="text-gray-400">
                            {expandedItems.has(result.mailNo) ? '▼' : '▶'}
                          </span>
                        </div>
                      </div>
                      
                      {!result.success && (
                        <div className="mt-2 text-sm text-red-600">
                          {result.errorMsg || '查询失败'}
                        </div>
                      )}
                    </div>

                    {expandedItems.has(result.mailNo) && (
                      <div className="border-t">
                        {result.success && result.routes && result.routes.length > 0 ? (
                          <div className="p-4">
                            <div className="space-y-3">
                              {result.routes.map((route, routeIndex) => (
                                <div
                                  key={routeIndex}
                                  className="flex items-start space-x-4 p-3 bg-gray-50 rounded-md"
                                >
                                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                    {routeIndex + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="text-sm font-medium text-gray-900">
                                        {route.acceptTime}
                                      </span>
                                      {route.opCode && (
                                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                          {route.opCode}
                                        </span>
                                      )}
                                      {route.firstStatusName && (
                                        <span className={`px-2 py-1 text-xs rounded ${
                                          route.firstStatusName === '已签收' ? 'bg-green-100 text-green-800' :
                                          route.firstStatusName === '派送中' ? 'bg-yellow-100 text-yellow-800' :
                                          route.firstStatusName === '运送中' ? 'bg-blue-100 text-blue-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {route.firstStatusName}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-600 mb-1">
                                      📍 {route.acceptAddress}
                                      {route.secondaryStatusName && route.secondaryStatusName !== route.firstStatusName && (
                                        <span className="ml-2 text-xs text-gray-500">
                                          ({route.secondaryStatusName})
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-800">
                                      {route.remark}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            <div className="text-red-600 mb-2">
                              {result.errorMsg || '查询失败，请检查单号是否正确'}
                            </div>
                            {result.errorCode && (
                              <div className="text-sm text-gray-400">
                                错误代码: {result.errorCode}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
