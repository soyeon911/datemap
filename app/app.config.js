const fs = require('fs');
const path = require('path');

const appConfig = require('./app.json');

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const envText = fs.readFileSync(envPath, 'utf8');

  envText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      return;
    }

    const key = match[1];
    let value = match[2].trim();

    value = value.replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadLocalEnv();

const naverMapClientId = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID;

if (!naverMapClientId || naverMapClientId.includes('SET_BY_APP_CONFIG')) {
  throw new Error(
    'EXPO_PUBLIC_NAVER_MAP_CLIENT_ID is missing. Add it to app/.env before running expo prebuild.'
  );
}

module.exports = {
  ...appConfig.expo,
  plugins: appConfig.expo.plugins.map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === '@mj-studio/react-native-naver-map') {
      return [
        plugin[0],
        {
          ...(plugin[1] ?? {}),
          client_id: naverMapClientId,
        },
      ];
    }

    return plugin;
  }),
};