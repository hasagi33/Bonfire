module.exports = {
  // jest-expo wires up the Expo/React-Native environment + transforms.
  preset: 'jest-expo',
  // Our global mocks (Skia, Reanimated, gesture-handler, AsyncStorage) run first.
  moduleNameMapper: {
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@data/(.*)$': '<rootDir>/src/data/$1',
  },
  setupFiles: ['./jest.setup.js'],
  // Make sure the native-module packages are transpiled (they ship untranspiled ESM).
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|@shopify/react-native-skia|react-native-reanimated|react-native-worklets|react-native-gesture-handler))',
  ],
};
