import antfu from '@antfu/eslint-config'

export default antfu(
  {
    unocss: true,
    formatters: true,
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Remember to specify the file glob here, otherwise it might cause the vue plugin to handle non-vue files
    files: ['**/*.vue, **/*.js, **/*.ts'],
  },
  {
    ignores: ['src-tauri/**/*', 'locales/**/*', 'dist/**/*', 'node_modules/**/*'],
  },
)
