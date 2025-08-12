/**
 * Service Worker for PWA
 * 提供离线缓存、后台同步等功能
 */

const CACHE_NAME = 'roundtable-chat-v1.0.0'
const STATIC_CACHE_NAME = 'roundtable-static-v1.0.0'
const DYNAMIC_CACHE_NAME = 'roundtable-dynamic-v1.0.0'

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
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
  /^.*\/api\/meeting-summary\/generate.*/ // 会议总结生成不缓存
]

/**
 * Service Worker安装事件
 */
self.addEventListener('install', event => {
  console.log('📦 Service Worker installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('📥 Caching static assets...')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('✅ Static assets cached successfully')
        return self.skipWaiting()
      })
      .catch(error => {
        console.error('❌ Failed to cache static assets:', error)
      })
  )
})

/**
 * Service Worker激活事件
 */
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...')
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 清理旧版本缓存
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
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

console.log('🔧 Service Worker script loaded')
