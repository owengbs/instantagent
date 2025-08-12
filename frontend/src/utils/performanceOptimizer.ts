/**
 * 移动端性能优化工具
 * 专注于减少内存占用、电池消耗和提升响应速度
 */

import { deviceInfo, PerformanceUtils } from './mobileDetection';

interface PerformanceConfig {
  enableLazyLoading: boolean;
  enableVirtualization: boolean;
  enableMemoryOptimization: boolean;
  enableBatteryOptimization: boolean;
  enableNetworkOptimization: boolean;
  maxMemoryUsage: number; // MB
  maxCacheSize: number; // MB
  frameRateLimit: number; // FPS
}

interface PerformanceMetrics {
  memoryUsage: number;
  fps: number;
  networkLatency: number;
  batteryLevel?: number;
  isCharging?: boolean;
  cpuUsage: number;
  cacheSize: number;
  errorCount: number;
}

class PerformanceOptimizer {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private observers: Map<string, PerformanceObserver> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private memoryCache: Map<string, any> = new Map();
  private frameCounter = 0;
  private lastFrameTime = 0;
  private isOptimizationActive = false;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableLazyLoading: true,
      enableVirtualization: deviceInfo.isMobile,
      enableMemoryOptimization: true,
      enableBatteryOptimization: deviceInfo.isMobile,
      enableNetworkOptimization: true,
      maxMemoryUsage: deviceInfo.isMobile ? 100 : 500, // MB
      maxCacheSize: deviceInfo.isMobile ? 50 : 200, // MB
      frameRateLimit: deviceInfo.isMobile ? 30 : 60, // FPS
      ...config
    };

    this.metrics = {
      memoryUsage: 0,
      fps: 0,
      networkLatency: 0,
      cpuUsage: 0,
      cacheSize: 0,
      errorCount: 0
    };

    this.initializeOptimization();
  }

  /**
   * 初始化性能优化
   */
  private initializeOptimization() {
    if (this.isOptimizationActive) return;

    try {
      this.setupPerformanceMonitoring();
      this.setupMemoryOptimization();
      this.setupBatteryOptimization();
      this.setupNetworkOptimization();
      this.setupErrorTracking();
      
      this.isOptimizationActive = true;
      console.log('🚀 Performance optimization initialized');
    } catch (error) {
      console.error('❌ Failed to initialize performance optimization:', error);
    }
  }

  /**
   * 设置性能监控
   */
  private setupPerformanceMonitoring() {
    // FPS监控
    this.startFPSMonitoring();

    // 内存监控
    if (this.config.enableMemoryOptimization) {
      this.startMemoryMonitoring();
    }

    // Web Vitals监控
    this.setupWebVitalsMonitoring();

    // 网络监控
    if (this.config.enableNetworkOptimization) {
      this.startNetworkMonitoring();
    }
  }

  /**
   * FPS监控
   */
  private startFPSMonitoring() {
    const updateFPS = () => {
      const now = performance.now();
      this.frameCounter++;

      if (now - this.lastFrameTime >= 1000) {
        this.metrics.fps = this.frameCounter;
        this.frameCounter = 0;
        this.lastFrameTime = now;

        // 动态调整帧率限制
        if (this.metrics.fps < this.config.frameRateLimit * 0.8) {
          this.optimizeRendering();
        }
      }

      requestAnimationFrame(updateFPS);
    };

    requestAnimationFrame(updateFPS);
  }

  /**
   * 内存监控
   */
  private startMemoryMonitoring() {
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB

        // 内存使用过高时触发清理
        if (this.metrics.memoryUsage > this.config.maxMemoryUsage) {
          this.performMemoryCleanup();
        }
      }
    };

    // 每30秒检查一次内存
    const interval = setInterval(monitorMemory, 30000);
    this.intervals.set('memory', interval);
  }

  /**
   * Web Vitals监控
   */
  private setupWebVitalsMonitoring() {
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log('📊 LCP:', lastEntry.startTime);
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        this.observers.set('lcp', lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported');
      }

      // FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            console.log('📊 FID:', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
        this.observers.set('fid', fidObserver);
      } catch (error) {
        console.warn('FID observer not supported');
      }

      // CLS (Cumulative Layout Shift)
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          console.log('📊 CLS:', clsValue);
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
        this.observers.set('cls', clsObserver);
      } catch (error) {
        console.warn('CLS observer not supported');
      }
    }
  }

  /**
   * 网络监控
   */
  private startNetworkMonitoring() {
    const measureLatency = async () => {
      try {
        const start = performance.now();
        await fetch('/api/mentors', { method: 'HEAD' });
        const end = performance.now();
        this.metrics.networkLatency = end - start;
      } catch (error) {
        this.metrics.networkLatency = -1; // 网络错误
      }
    };

    // 每分钟测量一次网络延迟
    const interval = setInterval(measureLatency, 60000);
    this.intervals.set('network', interval);
  }

  /**
   * 设置内存优化
   */
  private setupMemoryOptimization() {
    // 自动垃圾收集
    this.scheduleGarbageCollection();

    // 内存缓存管理
    this.setupMemoryCacheManagement();

    // 图片懒加载
    if (this.config.enableLazyLoading) {
      this.setupLazyLoading();
    }
  }

  /**
   * 定时垃圾收集
   */
  private scheduleGarbageCollection() {
    const performGC = () => {
      // 清理内存缓存
      this.cleanupMemoryCache();

      // 清理事件监听器
      this.cleanupEventListeners();

      // 强制垃圾收集（如果浏览器支持）
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc();
      }

      console.log('🧹 Memory cleanup completed');
    };

    // 每5分钟执行一次垃圾收集
    const interval = setInterval(performGC, 5 * 60 * 1000);
    this.intervals.set('gc', interval);
  }

  /**
   * 内存缓存管理
   */
  private setupMemoryCacheManagement() {
    const maxCacheEntries = deviceInfo.isMobile ? 100 : 500;

    setInterval(() => {
      if (this.memoryCache.size > maxCacheEntries) {
        // 删除最老的缓存条目
        const keysToDelete = Array.from(this.memoryCache.keys())
          .slice(0, this.memoryCache.size - maxCacheEntries);
        
        keysToDelete.forEach(key => this.memoryCache.delete(key));
        console.log(`🗑️ Cleaned up ${keysToDelete.length} cache entries`);
      }
    }, 60000);
  }

  /**
   * 懒加载设置
   */
  private setupLazyLoading() {
    PerformanceUtils.lazyLoadImages();
  }

  /**
   * 设置电池优化
   */
  private setupBatteryOptimization() {
    if (!this.config.enableBatteryOptimization) return;

    // 电池API监控
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.metrics.batteryLevel = battery.level * 100;
        this.metrics.isCharging = battery.charging;

        // 低电量时启用省电模式
        if (battery.level < 0.2 && !battery.charging) {
          this.enablePowerSavingMode();
        }

        // 监听电池状态变化
        battery.addEventListener('levelchange', () => {
          this.metrics.batteryLevel = battery.level * 100;
          if (battery.level < 0.2 && !battery.charging) {
            this.enablePowerSavingMode();
          } else if (battery.level > 0.3 || battery.charging) {
            this.disablePowerSavingMode();
          }
        });

        battery.addEventListener('chargingchange', () => {
          this.metrics.isCharging = battery.charging;
        });
      }).catch(() => {
        console.warn('Battery API not supported');
      });
    }
  }

  /**
   * 启用省电模式
   */
  private enablePowerSavingMode() {
    console.log('🔋 Enabling power saving mode');
    
    // 降低帧率
    this.config.frameRateLimit = 15;
    
    // 减少网络请求
    this.config.enableNetworkOptimization = false;
    
    // 禁用非必要动画
    document.body.classList.add('power-saving-mode');
  }

  /**
   * 禁用省电模式
   */
  private disablePowerSavingMode() {
    console.log('🔋 Disabling power saving mode');
    
    // 恢复正常帧率
    this.config.frameRateLimit = deviceInfo.isMobile ? 30 : 60;
    
    // 恢复网络优化
    this.config.enableNetworkOptimization = true;
    
    // 恢复动画
    document.body.classList.remove('power-saving-mode');
  }

  /**
   * 设置网络优化
   */
  private setupNetworkOptimization() {
    // 网络状态监听
    window.addEventListener('online', () => {
      console.log('🌐 Network online');
    });

    window.addEventListener('offline', () => {
      console.log('🌐 Network offline');
      this.handleOfflineMode();
    });

    // 连接类型监听
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      connection.addEventListener('change', () => {
        this.adaptToNetworkConditions();
      });
    }
  }

  /**
   * 适应网络条件
   */
  private adaptToNetworkConditions() {
    const connection = (navigator as any).connection;
    if (!connection) return;

    const { effectiveType, saveData } = connection;

    if (effectiveType === 'slow-2g' || effectiveType === '2g' || saveData) {
      // 慢网络优化
      this.enableSlowNetworkMode();
    } else {
      // 快网络恢复
      this.disableSlowNetworkMode();
    }
  }

  /**
   * 启用慢网络模式
   */
  private enableSlowNetworkMode() {
    console.log('🐌 Enabling slow network mode');
    
    // 减少图片质量
    document.body.classList.add('slow-network-mode');
    
    // 禁用非必要的网络请求
    // ... 实现具体的网络优化逻辑
  }

  /**
   * 禁用慢网络模式
   */
  private disableSlowNetworkMode() {
    console.log('🚀 Disabling slow network mode');
    
    document.body.classList.remove('slow-network-mode');
  }

  /**
   * 处理离线模式
   */
  private handleOfflineMode() {
    console.log('📴 Handling offline mode');
    
    // 显示离线提示
    this.showOfflineNotification();
    
    // 启用离线缓存
    // ... 实现离线缓存逻辑
  }

  /**
   * 显示离线通知
   */
  private showOfflineNotification() {
    // 创建离线提示
    const notification = document.createElement('div');
    notification.className = 'offline-notification';
    notification.textContent = '网络连接已断开，正在使用离线模式';
    document.body.appendChild(notification);

    // 网络恢复时移除提示
    const handleOnline = () => {
      notification.remove();
      window.removeEventListener('online', handleOnline);
    };
    window.addEventListener('online', handleOnline);
  }

  /**
   * 设置错误跟踪
   */
  private setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.metrics.errorCount++;
      console.error('💥 JavaScript error:', event.error);
      
      // 错误过多时启用安全模式
      if (this.metrics.errorCount > 10) {
        this.enableSafeMode();
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.metrics.errorCount++;
      console.error('💥 Unhandled promise rejection:', event.reason);
    });
  }

  /**
   * 启用安全模式
   */
  private enableSafeMode() {
    console.log('🛡️ Enabling safe mode due to excessive errors');
    
    // 禁用非核心功能
    document.body.classList.add('safe-mode');
    
    // 重置错误计数
    this.metrics.errorCount = 0;
  }

  /**
   * 优化渲染性能
   */
  private optimizeRendering() {
    // 使用requestIdleCallback优化任务调度
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.performNonCriticalTasks();
      });
    }

    // 减少DOM操作
    this.batchDOMUpdates();
  }

  /**
   * 执行非关键任务
   */
  private performNonCriticalTasks() {
    // 清理内存
    this.cleanupMemoryCache();
    
    // 预加载资源
    this.preloadNextResources();
  }

  /**
   * 批量DOM更新
   */
  private batchDOMUpdates() {
    // 实现DOM更新批处理逻辑
    // 可以使用DocumentFragment来减少重排重绘
  }

  /**
   * 执行内存清理
   */
  private performMemoryCleanup() {
    console.log('🧹 Performing memory cleanup');
    
    // 清理内存缓存
    this.cleanupMemoryCache();
    
    // 清理大型对象
    this.cleanupLargeObjects();
    
    // 触发垃圾收集
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  /**
   * 清理内存缓存
   */
  private cleanupMemoryCache() {
    const currentSize = this.memoryCache.size;
    this.memoryCache.clear();
    console.log(`🗑️ Cleared ${currentSize} memory cache entries`);
  }

  /**
   * 清理大型对象
   */
  private cleanupLargeObjects() {
    // 清理大型数组、对象等
    // 具体实现根据应用需求定制
  }

  /**
   * 清理事件监听器
   */
  private cleanupEventListeners() {
    // 移除不再需要的事件监听器
    // 具体实现根据应用需求定制
  }

  /**
   * 预加载下一页资源
   */
  private preloadNextResources() {
    // 预加载可能需要的资源
    // 具体实现根据应用需求定制
  }

  /**
   * 获取性能指标
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取优化建议
   */
  public getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];

    if (this.metrics.memoryUsage > this.config.maxMemoryUsage * 0.8) {
      suggestions.push('内存使用率过高，建议清理缓存');
    }

    if (this.metrics.fps < this.config.frameRateLimit * 0.7) {
      suggestions.push('帧率过低，建议减少动画效果');
    }

    if (this.metrics.networkLatency > 2000) {
      suggestions.push('网络延迟过高，建议启用离线模式');
    }

    if (this.metrics.errorCount > 5) {
      suggestions.push('错误过多，建议检查代码质量');
    }

    return suggestions;
  }

  /**
   * 手动触发优化
   */
  public optimize() {
    console.log('🔧 Manual optimization triggered');
    
    this.performMemoryCleanup();
    this.optimizeRendering();
    
    return this.getMetrics();
  }

  /**
   * 销毁优化器
   */
  public destroy() {
    console.log('🔚 Destroying performance optimizer');
    
    // 清理定时器
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
    
    // 清理观察器
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
    
    // 清理缓存
    this.memoryCache.clear();
    
    this.isOptimizationActive = false;
  }
}

// 创建全局性能优化器实例
export const performanceOptimizer = new PerformanceOptimizer();

// 导出工具类
export { PerformanceOptimizer };
export type { PerformanceConfig, PerformanceMetrics };
