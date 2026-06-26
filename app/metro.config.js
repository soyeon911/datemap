const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');
config.resolver.blockList = exclusionList([
  /node_modules\/expo-modules-jsi\/apple\/\.DerivedData\/.*/,
]);

module.exports = config;
