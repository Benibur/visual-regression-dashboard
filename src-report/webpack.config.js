const path            = require('path');
const VueLoaderPlugin = require('vue-loader/lib/plugin')

module.exports = {
  mode: "development",
  entry: {
    build:  './src-report/src/main.js',
    worker: './src-report/src/worker-main.js',
  },
  output: {
    path: path.join(__dirname, '/public'),
    publicPath: '/static',
    filename: '[name].js',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: "babel-loader",
        include: [path.resolve(__dirname, 'src')]
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
    contentBase: './',
    port: 5555
  },
  plugins: [
    // new UglifyJSPlugin(),
    new VueLoaderPlugin()
  ]
}
