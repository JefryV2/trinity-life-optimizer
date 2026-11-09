const { withProjectBuildGradle, withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// Trinity native-build workarounds (Windows long paths + NDK 27.1 STL)';

const BLOCK = `
${MARKER}
subprojects { subproject ->
  def applyCmakeFix = {
    if (subproject.hasProperty('android')) {
      subproject.android.defaultConfig.externalNativeBuild.cmake.arguments '-DCMAKE_OBJECT_PATH_MAX=1024', '-DCMAKE_CXX_STANDARD_LIBRARIES=-lc++_shared -lm'
    }
  }
  if (subproject.state.executed) {
    applyCmakeFix()
  } else {
    subproject.afterEvaluate(applyCmakeFix)
  }
}
`;

const APP_BLOCK = `
${MARKER} (app module)
android {
  defaultConfig {
    externalNativeBuild {
      cmake {
        arguments '-DCMAKE_OBJECT_PATH_MAX=1024', '-DCMAKE_CXX_STANDARD_LIBRARIES=-lc++_shared -lm'
      }
    }
  }
}
`;

module.exports = function withCmakeLongPaths(config) {
  config = withProjectBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    const idx = contents.indexOf(MARKER);
    if (idx !== -1) contents = contents.slice(0, idx).replace(/\s+$/, '\n');
    cfg.modResults.contents = contents + BLOCK;
    return cfg;
  });
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    const idx = contents.indexOf(MARKER);
    if (idx !== -1) contents = contents.slice(0, idx).replace(/\s+$/, '\n');
    cfg.modResults.contents = contents + APP_BLOCK;
    return cfg;
  });
};