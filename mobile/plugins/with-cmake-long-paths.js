const { withProjectBuildGradle } = require('expo/config-plugins');

const BLOCK = `
// Windows long-path workaround: keep CMake object paths under MAX_PATH
subprojects {
  afterEvaluate { subproject ->
    if (subproject.hasProperty('android')) {
      subproject.android.defaultConfig.externalNativeBuild.cmake.arguments '-DCMAKE_OBJECT_PATH_MAX=1024'
    }
  }
}
`;

module.exports = function withCmakeLongPaths(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('CMAKE_OBJECT_PATH_MAX')) {
      cfg.modResults.contents += BLOCK;
    }
    return cfg;
  });
};