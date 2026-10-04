const path = require('node:path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: { main: './src/main.jsx', admin: './src/admin.jsx' },
  target: ['web', 'es5'],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'assets/[name].[contenthash:8].js',
    publicPath: '/',
    clean: true,
    assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { ie: '11' }, useBuiltIns: 'entry', corejs: 3 }],
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        },
      },
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
      { test: /\.(jpe?g|png|svg|woff2?)$/, type: 'asset/resource' },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'assets/style.[contenthash:8].css' }),
    new HtmlWebpackPlugin({ template: './src/index.html', chunks: ['main'] }),
    new HtmlWebpackPlugin({ template: './src/admin.html', filename: 'admin.html', chunks: ['admin'] }),
  ],
  performance: { maxAssetSize: 700000, maxEntrypointSize: 700000 },
};
