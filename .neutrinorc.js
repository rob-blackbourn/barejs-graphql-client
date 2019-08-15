module.exports = {
  options: {
    output: 'lib'
  },  
  use: [
    '@neutrinojs/standardjs',
    [
      '@neutrinojs/library',
      {
        name: 'barejs-graphql-client',
        target: 'web'
      }
    ]
  ]
};
