/**
 * Service Worker for PWA
 * 提供离线缓存、后台同步等功能
 */

const CACHE_NAME = 'roundtable-chat-v1.2.0'
const STATIC_CACHE_NAME = 'roundtable-static-v1.2.0'
const DYNAMIC_CACHE_NAME = 'roundtable-dynamic-v1.2.0'
const AUDIO_CACHE_NAME = 'roundtable-audio-v1.0.0'

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-16x16.png',
  '/icons/icon-32x32.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-180x180.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
]

// 需要预缓存的关键路径
const CRITICAL_RESOURCES = [
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/src/styles/mobile.css'
]

// 需要缓存的API路径模式
const API_CACHE_PATTERNS = [
  /^.*\/api\/mentors\/.*/,
  /^.*\/api\/users\/stats.*/,
  /^.*\/api\/users\/active.*/
]

// 不需要缓存的路径
const EXCLUDE_PATTERNS = [
  /^.*\/api\/realtime\/.*/,  // WebSocket不缓存
  /^.*\/realtime\/.*/,       // WebSocket不缓存
  /^.*\/api\/test\/.*/,      // 测试API不缓存
  /^.*\/api\/meeting-summary\/generate.*/, // 会议总结生成不缓存
  /^.*\/api\/tts\/.*/,       // TTS接口不缓存（音频流）
  /^.*ws:\/\/.*/,           // WebSocket不缓存
  /^.*wss:\/\/.*/           // 安全WebSocket不缓存
]

// 音频缓存模式
const AUDIO_CACHE_PATTERNS = [
  /.*\.mp3$/,
  /.*\.wav$/,
  /.*\.ogg$/,
  /.*\.m4a$/,
  /.*\.aac$/
]

// 移动端优化配置
const MOBILE_CONFIG = {
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  maxAudioCacheSize: 20 * 1024 * 1024, // 20MB
  cacheTimeout: 24 * 60 * 60 * 1000, // 24小时
  networkTimeout: 5000, // 5秒网络超时
  retryAttempts: 3
}

/**
 * Service Worker安装事件
 */
self.addEventListener('install', event => {
  console.log('📦 Service Worker installing...')
  
  event.waitUntil(
    Promise.all([
      // 缓存静态资源
      caches.open(STATIC_CACHE_NAME)
        .then(cache => {
          console.log('📥 Caching static assets...')
          return cache.addAll(STATIC_ASSETS)
        }),
      
      // 预缓存关键资源
      caches.open(DYNAMIC_CACHE_NAME)
        .then(cache => {
          console.log('📥 Pre-caching critical resources...')
          return cache.addAll(CRITICAL_RESOURCES.map(url => new Request(url, { cache: 'reload' })))
        })
        .catch(() => {
          // 关键资源缓存失败不阻止安装
          console.warn('⚠️ Failed to pre-cache some critical resources')
        }),
      
      // 初始化音频缓存
      caches.open(AUDIO_CACHE_NAME)
        .then(() => {
          console.log('🎵 Audio cache initialized')
        })
    ])
    .then(() => {
      console.log('✅ Service Worker installed successfully')
      return self.skipWaiting()
    })
    .catch(error => {
      console.error('❌ Failed to install Service Worker:', error)
    })
  )
})

/**
 * Service Worker激活事件
 */
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...')
  
  event.waitUntil(
    Promise.all([
      // 清理旧缓存
      caches.keys()
        .then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              // 清理旧版本缓存
              if (cacheName !== STATIC_CACHE_NAME && 
                  cacheName !== DYNAMIC_CACHE_NAME &&
                  cacheName !== AUDIO_CACHE_NAME &&
                  cacheName !== CACHE_NAME) {
                console.log('🗑️ Deleting old cache:', cacheName)
                return caches.delete(cacheName)
              }
            })
          )
        }),
      
      // 清理过期缓存
      cleanExpiredCache(),
      
      // 优化缓存大小
      optimizeCacheSize()
    ])
    .then(() => {
      console.log('✅ Service Worker activated')
      return self.clients.claim()
    })
  )
})

/**
 * 网络请求拦截
 */
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  
  // 只处理GET请求
  if (request.method !== 'GET') {
    return
  }
  
  // 排除不需要缓存的请求
  if (EXCLUDE_PATTERNS.some(pattern => pattern.test(request.url))) {
    return
  }
  
  // WebSocket请求直接放行
  if (request.headers.get('upgrade') === 'websocket') {
    return
  }
  
  event.respondWith(
    handleRequest(request)
  )
})

/**
 * 处理请求的核心逻辑
 */
async function handleRequest(request) {
  const url = new URL(request.url)
  
  try {
    // 1. 静态资源 - 缓存优先策略
    if (STATIC_ASSETS.includes(url.pathname) || 
        url.pathname.includes('/icons/') ||
        url.pathname.includes('/screenshots/') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.svg')) {
      
      return await cacheFirst(request, STATIC_CACHE_NAME)
    }
    
    // 2. API请求 - 网络优先策略
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
      return await networkFirst(request, DYNAMIC_CACHE_NAME)
    }
    
    // 3. 页面请求 - 网络优先，离线时返回缓存
    if (url.pathname === '/' || 
        url.pathname.startsWith('/chat') ||
        url.pathname.startsWith('/multi-user-test') ||
        url.pathname.startsWith('/user-management')) {
      
      return await networkFirst(request, DYNAMIC_CACHE_NAME)
    }
    
    // 4. 其他请求直接网络请求
    return await fetch(request)
    
  } catch (error) {
    console.error('❌ Request failed:', request.url, error)
    
    // 如果是页面请求且网络失败，返回离线页面
    if (request.destination === 'document') {
      const cache = await caches.open(STATIC_CACHE_NAME)
      const offlineResponse = await cache.match('/index.html')
      if (offlineResponse) {
        return offlineResponse
      }
    }
    
    throw error
  }
}

/**
 * 缓存优先策略
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    console.log('📋 Cache hit:', request.url)
    return cachedResponse
  }
  
  console.log('🌐 Fetching from network:', request.url)
  const response = await fetch(request)
  
  if (response.ok) {
    await cache.put(request, response.clone())
  }
  
  return response
}

/**
 * 网络优先策略
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  
  try {
    console.log('🌐 Network first:', request.url)
    const response = await fetch(request)
    
    if (response.ok) {
      await cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.log('📋 Network failed, trying cache:', request.url)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    throw error
  }
}

/**
 * 后台同步事件
 */
self.addEventListener('sync', event => {
  console.log('🔄 Background sync:', event.tag)
  
  if (event.tag === 'chat-sync') {
    event.waitUntil(syncChatData())
  }
})

/**
 * 同步聊天数据
 */
async function syncChatData() {
  try {
    // 获取离线存储的聊天数据
    const unsentMessages = await getUnsentMessages()
    
    for (const message of unsentMessages) {
      try {
        await sendMessage(message)
        await removeUnsentMessage(message.id)
      } catch (error) {
        console.error('❌ Failed to sync message:', error)
      }
    }
  } catch (error) {
    console.error('❌ Chat sync failed:', error)
  }
}

/**
 * 获取未发送的消息
 */
async function getUnsentMessages() {
  // 这里可以实现从IndexedDB获取离线消息的逻辑
  return []
}

/**
 * 发送消息
 */
async function sendMessage(message) {
  // 这里可以实现发送消息到服务器的逻辑
  return Promise.resolve()
}

/**
 * 删除已发送的消息
 */
async function removeUnsentMessage(messageId) {
  // 这里可以实现从IndexedDB删除消息的逻辑
  return Promise.resolve()
}

/**
 * 推送通知事件
 */
self.addEventListener('push', event => {
  console.log('📣 Push notification received')
  
  const options = {
    body: event.data ? event.data.text() : '您有新的圆桌会议消息',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'chat-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: '查看消息',
        icon: '/icons/action-open.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/icons/action-close.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification('圆桌会议', options)
  )
})

/**
 * 通知点击事件
 */
self.addEventListener('notificationclick', event => {
  console.log('📱 Notification clicked:', event.action)
  
  event.notification.close()
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/chat')
    )
  }
})

/**
 * 消息事件 - 与主线程通信
 */
self.addEventListener('message', event => {
  console.log('💬 Message from main thread:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION',
      version: CACHE_NAME
    })
  }
})

/**
 * 清理过期缓存
 */
async function cleanExpiredCache() {
  try {
    const cacheNames = [DYNAMIC_CACHE_NAME, AUDIO_CACHE_NAME];
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const cacheTime = response.headers.get('sw-cache-time');
          if (cacheTime) {
            const age = Date.now() - parseInt(cacheTime);
            if (age > MOBILE_CONFIG.cacheTimeout) {
              console.log('🗑️ Deleting expired cache:', request.url);
              await cache.delete(request);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to clean expired cache:', error);
  }
}

/**
 * 优化缓存大小
 */
async function optimizeCacheSize() {
  try {
    // 检查动态缓存大小
    await limitCacheSize(DYNAMIC_CACHE_NAME, MOBILE_CONFIG.maxCacheSize);
    
    // 检查音频缓存大小
    await limitCacheSize(AUDIO_CACHE_NAME, MOBILE_CONFIG.maxAudioCacheSize);
  } catch (error) {
    console.error('❌ Failed to optimize cache size:', error);
  }
}

/**
 * 限制缓存大小
 */
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  let totalSize = 0;
  const cacheEntries = [];
  
  // 计算总大小并收集条目信息
  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const size = parseInt(response.headers.get('content-length') || '0');
      const cacheTime = parseInt(response.headers.get('sw-cache-time') || Date.now().toString());
      
      cacheEntries.push({
        request,
        response,
        size,
        cacheTime
      });
      
      totalSize += size;
    }
  }
  
  // 如果超出限制，删除最旧的条目
  if (totalSize > maxSize) {
    cacheEntries.sort((a, b) => a.cacheTime - b.cacheTime);
    
    while (totalSize > maxSize && cacheEntries.length > 0) {
      const oldest = cacheEntries.shift();
      if (oldest) {
        await cache.delete(oldest.request);
        totalSize -= oldest.size;
        console.log('🗑️ Deleted old cache entry:', oldest.request.url);
      }
    }
  }
}

/**
 * 带超时的网络请求
 */
async function fetchWithTimeout(request, timeout = MOBILE_CONFIG.networkTimeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(request, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * 智能缓存策略 - 根据网络状况和设备性能调整
 */
async function intelligentCacheStrategy(request, cacheName) {
  // 检查网络连接
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isSlowConnection = connection && (
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g' ||
    connection.saveData
  );
  
  if (isSlowConnection) {
    // 慢网络：优先使用缓存
    return await cacheFirst(request, cacheName);
  } else {
    // 快网络：优先使用网络
    return await networkFirst(request, cacheName);
  }
}

/**
 * 增强的缓存优先策略
 */
async function cacheFirstEnhanced(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('📋 Cache hit:', request.url);
    
    // 后台更新缓存
    fetchWithTimeout(request.clone())
      .then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          responseClone.headers.set('sw-cache-time', Date.now().toString());
          cache.put(request, responseClone);
        }
      })
      .catch(() => {
        // 静默失败，继续使用缓存
      });
    
    return cachedResponse;
  }
  
  // 缓存未命中，从网络获取
  console.log('🌐 Cache miss, fetching from network:', request.url);
  const response = await fetchWithTimeout(request);
  
  if (response.ok) {
    const responseClone = response.clone();
    responseClone.headers.set('sw-cache-time', Date.now().toString());
    await cache.put(request, responseClone);
  }
  
  return response;
}

/**
 * 增强的网络优先策略
 */
async function networkFirstEnhanced(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    console.log('🌐 Network first:', request.url);
    const response = await fetchWithTimeout(request);
    
    if (response.ok) {
      const responseClone = response.clone();
      responseClone.headers.set('sw-cache-time', Date.now().toString());
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.log('📋 Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * 预加载关键资源
 */
async function preloadCriticalResources() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    
    const criticalUrls = [
      '/api/mentors',
      '/api/users/stats'
    ];
    
    for (const url of criticalUrls) {
      try {
        const response = await fetchWithTimeout(new Request(url));
        if (response.ok) {
          const responseClone = response.clone();
          responseClone.headers.set('sw-cache-time', Date.now().toString());
          await cache.put(url, responseClone);
          console.log('📥 Preloaded:', url);
        }
      } catch (error) {
        console.warn('⚠️ Failed to preload:', url);
      }
    }
  } catch (error) {
    console.error('❌ Preload failed:', error);
  }
}

// 在激活时预加载关键资源
self.addEventListener('activate', event => {
  event.waitUntil(
    preloadCriticalResources()
  );
});

console.log('🔧 Service Worker script loaded')
