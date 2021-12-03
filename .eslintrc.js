module.exports = {
    extends: ['ringcentral-typescript'],
    rules: {
        'import/no-default-export': 'off',
        'import/no-unresolved': 'off',
        'jsx-a11y/anchor-is-valid': 'off', // Next.js use <a>
        'no-console': 'off',
        'no-unused-expressions': 'off', // tests
        'react/sort-comp': 'off',
        'react/prop-types': 'off',
        'ringcentral/specified-comment-with-task-id': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-var-requires': 'off',
    },
    env: {
        browser: true,
        jest: true,
        node: true,
    },
    settings: {
        react: {
            version: '17.0.2',
        },
    },
    globals: {
        page: 'readonly',
    },
};
