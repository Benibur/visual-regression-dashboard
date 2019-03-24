const path = require('path')
// const HtmlWebpackPlugin = require(‘html-webpack-plugin’);

module.exports = {
  entry: "./main.js",
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: "bundle.js"
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.pug$/,
        use: ['pug-loader']
      }
    ]
  }
};
