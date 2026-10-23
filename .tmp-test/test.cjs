const ts = require('typescript');
const fs = require('fs');
const code = fs.readFileSync('scratch-test.ts','utf8');
const result = ts.transpileModule(code, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  }
});
fs.writeFileSync('.tmp-test/test.mjs', result.outputText);
