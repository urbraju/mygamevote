const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Override cache directory to local folder to avoid EPERM on /var/folders/
config.cacheStores = [
    new (require('metro-cache')).FileStore({
        root: require('path').join(__dirname, '.metro-cache')
    })
];

module.exports = withNativeWind(config, { input: "./global.css" });
