module.exports = {
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  bracketSpacing: false,
  arrowParens: 'avoid',
  printWidth: 100,

  plugins: [require('prettier-plugin-json-formats')],

  overrides: [
    {
      files: 'package.json',
      options: {
        parser: 'package-json',
      },
    },
    {
      files: 'angular.json',
      options: {parser: 'angular-cli'},
    },
  ],
};
