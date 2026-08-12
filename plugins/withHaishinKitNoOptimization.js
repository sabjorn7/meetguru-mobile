// Expo config plugin: compile HaishinKit + Logboard (the iOS RTMP stack behind
// @api.video/react-native-livestream) WITHOUT Swift optimization.
//
// Why: under Xcode 26 / iOS 26 SDK, `swift-frontend` segfaults while optimizing these pods in a
// Release archive (`-O -whole-module-optimization`) — a compiler crash, not a source error (see
// the failed iOS build's "Run fastlane" → Xcode logs). Forcing SWIFT_OPTIMIZATION_LEVEL=-Onone for
// just these two pods skips the crashing optimizer pass; the rest of the app still builds with -O.
//
// Injected into the existing Expo `post_install do |installer|` block in the generated Podfile.

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TARGETS = ['HaishinKit', 'Logboard'];
const MARKER = '# haishinkit-noopt (config plugin)';

const SNIPPET = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      if ${JSON.stringify(TARGETS)}.include?(target.name)
        target.build_configurations.each do |bc|
          bc.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
        end
      end
    end
`;

module.exports = function withHaishinKitNoOptimization(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');

      if (contents.includes(MARKER)) return cfg; // idempotent

      const postInstall = /post_install do \|installer\|\n/;
      if (postInstall.test(contents)) {
        contents = contents.replace(postInstall, (m) => m + SNIPPET);
      } else {
        contents += `\npost_install do |installer|\n${SNIPPET}\nend\n`;
      }

      fs.writeFileSync(podfile, contents);
      return cfg;
    },
  ]);
};
