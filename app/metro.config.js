const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');
config.resolver.blockList = [/node_modules\/expo-modules-jsi\/apple\/\.DerivedData\/.*/];

module.exports = config;
