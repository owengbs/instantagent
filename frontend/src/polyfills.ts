// 简单的crypto polyfill
if (typeof global !== 'undefined' && !global.crypto) {
  global.crypto = {
    getRandomValues: function(array: any) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }
  } as any;
}
