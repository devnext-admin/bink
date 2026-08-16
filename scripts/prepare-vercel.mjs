// Vercel reads vercel.json from the directory it deploys, and the documented
// flow here deploys dist/ directly. Copy the app's config in, minus
// outputDirectory: that key points at dist relative to the app root, and would
// make Vercel look for dist/dist once dist itself is the deploy root.
import fs from 'node:fs';

const cfg = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
delete cfg.outputDirectory;
fs.writeFileSync('dist/vercel.json', JSON.stringify(cfg, null, 2) + '\n');
console.log('wrote dist/vercel.json');
