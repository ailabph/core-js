# core-js

test setup
1) make sure config.ini.php is set
2) create/update .env and add AILAB_CONFIG_PATH=<path_of_config>
3) create empty build folder
4) run 'node build.js run_build'
5) set target dir and location of dataObject
6) after orm is generated, run tsc

changelog
- v1.0.1 - full implementation of core from composer ailabph/ailab-core

## Running Tests

To run tests, follow these steps:

1) Make sure you are in the project root directory.
2) Run 'npm test' in your terminal.

To run a specific test, use:
```
npm test -- -t "string pattern of the test"
```