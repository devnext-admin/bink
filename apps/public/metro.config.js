// Monorepo Metro config. Metro must watch the workspace root so changes in
// packages/shared trigger a rebuild, and must resolve modules from both the
// app's own node_modules and the hoisted root one.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Hierarchical lookup stays ON: npm workspaces hoist most packages to the root
// but leave some nested (expo-asset under expo, for one), and Metro has to walk
// up to find those. Disabling it is a pnpm pattern and breaks this layout.

module.exports = config;
