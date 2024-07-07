const webpack = require('webpack');
const path = require('path');  

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, './dist/'),
    filename: 'index.js',
    libraryTarget: 'commonjs2', // 使库支持多种引用方式，包括require
    libraryExport: 'default', // 确保默认导出
  },
  mode: 'none',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // 如果你的代码使用了ES6语法，可能需要使用babel-loader来编译
        },
      },
    ],
  },
  // 外部模块配置
  externals: {
      assert: 'commonjs assert',
      buffer: 'commonjs buffer',
      child_process: 'commonjs child_process',
      cluster: 'commonjs cluster',
      crypto: 'commonjs crypto',
      dgram: 'commonjs dgram',
      dns: 'commonjs dns',
      events: 'commonjs events',
      fs: 'commonjs fs',
      http: 'commonjs http',
      https: 'commonjs https',
      net: 'commonjs net',
      os: 'commonjs os',
      path: 'commonjs path',
      process: 'commonjs process',
      querystring: 'commonjs querystring',
      stream: 'commonjs stream',
      tls: 'commonjs tls',
      url: 'commonjs url',
      util: 'commonjs util',
      v8: 'commonjs v8',
      vm: 'commonjs vm',
      zlib: 'commonjs zlib'
  },
};