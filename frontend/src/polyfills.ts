// 安全的crypto polyfill
if (typeof global !== 'undefined') {
  // 只在Node.js环境中设置crypto
  if (typeof window === 'undefined' && !global.crypto) {
    global.crypto = {
      getRandomValues: function(array: any) {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      }
    } as any;
  }
  
  // 确保process对象存在
  if (!global.process) {
    global.process = {
      env: {},
      version: '',
      platform: 'browser' as any
    } as any;
  }
}
