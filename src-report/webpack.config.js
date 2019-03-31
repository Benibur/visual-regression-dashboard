const path            = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin')

module.exports = {
  mode: "development",
  entry: {
    build:  './src-report/report/src/main.js',
    worker: './src-report/report/src/worker-main.js',
  },
  output: {
    path: path.join(__dirname, '/report/dist'),
    publicPath: '/static',
    filename: '[name].js',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: "babel-loader",
        include: [path.resolve(__dirname, 'report/src')]
      },
      {
        test: /\.(svg)$/,
        use: ["url-loader"],
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader'
        ]
      }
    ]
  },
  devServer: {
    contentBase: './report',
    port: 5555
  },
  plugins: [
    // new UglifyJSPlugin(),
    new VueLoaderPlugin()
  ]
}
