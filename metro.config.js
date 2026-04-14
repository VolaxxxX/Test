const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force @firebase/auth to use the browser-cjs bundle instead of the RN bundle.
// The RN bundle (dist/rn/index.js) crashes in Expo Go 54 due to RN-specific
// native module dependencies. The browser-cjs bundle is pure JS and works fine.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@firebase/auth') {
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/@firebase/auth/dist/browser-cjs/index.js'
      ),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
