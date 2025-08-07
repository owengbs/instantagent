// Polyfill for crypto.getRandomValues
if (typeof global !== 'undefined') {
  // 检查是否已经有crypto对象
  if (!global.crypto) {
    try {
      const crypto = require('crypto');
      global.crypto = {
        getRandomValues: function(array: any) {
          const bytes = crypto.randomBytes(array.length);
          for (let i = 0; i < array.length; i++) {
            array[i] = bytes[i];
          }
          return array;
        },
        randomUUID: function() {
          return require('crypto').randomUUID();
        },
        subtle: {} // 添加subtle属性以满足类型要求
      } as any;
    } catch (e) {
      // 如果require失败，提供一个简单的实现
      global.crypto = {
        getRandomValues: function(array: any) {
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
          }
          return array;
        },
        randomUUID: function() {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        },
        subtle: {} // 添加subtle属性以满足类型要求
      } as any;
    }
  }

  // Polyfill for process
  if (!global.process) {
    global.process = {
      env: {},
      version: '',
      platform: 'browser' as any,
      nextTick: function(callback: Function) {
        setTimeout(callback, 0);
      }
    } as any;
  }

  // Polyfill for Buffer
  if (!global.Buffer) {
    try {
      global.Buffer = require('buffer').Buffer;
    } catch (e) {
      // 简单的Buffer polyfill
      global.Buffer = {
        from: function(data: any) {
          return new Uint8Array(data);
        },
        alloc: function(size: number) {
          return new Uint8Array(size);
        }
      } as any;
    }
  }
}
