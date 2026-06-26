const appConfig = require('./app.json');

const naverMapClientId = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID;

module.exports = {
  ...appConfig.expo,
  plugins: appConfig.expo.plugins.map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === '@mj-studio/react-native-naver-map') {
      return [
        plugin[0],
        {
          ...plugin[1],
          client_id: naverMapClientId || plugin[1].client_id,
        },
      ];
    }

    return plugin;
  }),
};
