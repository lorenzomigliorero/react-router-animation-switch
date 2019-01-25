module.exports = () => ({
  output: {
    libraryTarget: 'commonjs2',
    library: 'ReactRouterTransitionSwitch',
  },
  externals: {
    react: 'react',
    'react-router-dom': 'react-router-dom',
    'prop-types': 'prop-types',
  },
});
