const prettierOptions = JSON.parse(require('fs').readFileSync('./.prettierrc').toString());

module.exports = {
  extends: [
    'ringcentral-typescript'
  ],
  'rules': {
    'import/no-default-export':'off',
    'jsx-a11y/anchor-is-valid': 'off', // Next.js use <a>
    'no-console': 'off',
    'no-unused-expressions': 'off', // tests
    'prettier/prettier': ['warn', Object.assign({}, prettierOptions)],
    'react/sort-comp': 'off',
    'react/prop-types': 'off',
    'ringcentral/specified-comment-with-task-id': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-var-requires': 'off'
  },
  env: {
    browser: true,
    jest: true,
    node: true
  },
  settings: {
    react: {
      version: '16.12.0'
    }
  },
    globals: {
      page: 'readonly'
    }
};