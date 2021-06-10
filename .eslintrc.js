/* eslint-disable quote-props */
module.exports = {
  root: true,
  env: {
    node: true,
  },
  plugins: [
    'vue',
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
  ],
  rules: {
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/indent': ['error', 2],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    '@typescript-eslint/prefer-interface': 'off',

    'brace-style': ['error', '1tbs'],
    'comma-dangle': ['error', 'always-multiline'],
    curly: 'error',
    'eol-last': 'error',
    'eqeqeq': 'error',
    'jsx-quotes': ['error', 'prefer-single'],
    'no-case-declarations': 'error',
    'no-console': ['warn', { 'allow': ['warn', 'error'] }],
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-multi-spaces': 'error',
    'no-multiple-empty-lines': 'error',
    'no-shadow': ['error', { 'allow': ['required', 'numeric', 'between', 'minLength'] }],
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-var': 'error',
    'object-curly-spacing': ['error', 'always'],
    'object-shorthand': 'error',
    'prefer-const': 'error',
    'quote-props': ['error', 'as-needed'],
    'quotes': ['error', 'single', 'avoid-escape'],
    'semi': 'error',
    // 'sort-keys': 'error',
    'space-before-function-paren': ['error', {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always',
    }],

    'vue/component-definition-name-casing': ['error', 'kebab-case'],
    'vue/component-name-in-template-casing': ['error', 'kebab-case', {
      'registeredComponentsOnly': true,
      'ignores': [],
    }],
    'vue/eqeqeq': 'error',
    'vue/html-quotes': ['error', 'double'],
    'vue/match-component-file-name': ['error', {
      'extensions': ['vue'],
      'shouldMatchCase': false,
    }],
    'vue/max-attributes-per-line': ['error', {
      'singleline': 2,
      'multiline': {
        'max': 1,
        'allowFirstLine': false,
      },
    }],
    'vue/name-property-casing': ['error', 'kebab-case'],
    'vue/no-deprecated-scope-attribute': 'error',
    'vue/no-deprecated-slot-scope-attribute': 'error',
    'vue/no-irregular-whitespace': 'error',
    'vue/no-static-inline-styles': 'error',
    'vue/require-name-property': 'error',
    'vue/singleline-html-element-content-newline': 'off',
    'vue/v-slot-style': 'error',
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
  },
  overrides: [
    {
      files: '*.d.ts',
      rules: {
        '@typescript-eslint/indent': ['error', 4],
      },
    },
    {
      files: '*.vue',
      rules: {
        'no-unused-vars': ['off'],
        '@typescript-eslint/no-unused-vars': ['off'],
      },
    },
  ],
};
