# core-js

test setup
1) make sure config.ini.php is set
2) create empty build folder
3) run tsc
4) npm test -- -g "build spec"
5) tsc && npm test

run orm class generator
1) await build.run(`${config.getBaseDirectory()}/node`,"@ailabph/ailab-core");

changelog
- v1.0.1 - full implementation of core from composer ailabph/ailab-core