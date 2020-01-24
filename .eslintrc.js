const prettierOptions = JSON.parse(require('fs').readFileSync('./.prettierrc').toString());

module.exports = {
  "extends": [
    "ringcentral-typescript"
  ],
  "rules": {
    "import/no-default-export":"off",
    "import/no-unresolved": "off", // to capture direct deps in TS
    "jsx-a11y/anchor-is-valid": "off", // Next.js use <a>
    "no-console": "off",
    "no-undef": "off", //FIXME @see https://github.com/eslint/typescript-eslint-parser/issues/75
    "no-unused-expressions": "off", // tests
    'prettier/prettier': ['warn', Object.assign({}, prettierOptions)],
    "react/sort-comp": "off",
    "react/prop-types": "off",
    "ringcentral/specified-comment-with-task-id": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-var-requires": "off"
  },
  "env": {
    "browser": true,
    "mocha": true,
    "node": true
  },
  "settings": {
    "react": {
      "version": "16.6.0"
    }
  }
}