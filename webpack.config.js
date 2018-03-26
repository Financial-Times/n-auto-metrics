const nodeExternals = require('webpack-node-externals');
// const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

module.exports = {
	mode: 'production',
	devtool: 'source-map',
	target: 'node',
	entry: './src/index',
	output: {
		libraryTarget: 'umd',
		path: path.resolve('./dist'),
		filename: 'index.js',
	},
	externals: nodeExternals(),
	module: {
		rules: [
			{
				test: /\.js?$/,
				exclude: '/node_modules/',
				use: {
					loader: 'babel-loader',
					// override options set in .babelrc
					options: {
						presets: [
							[
								'env',
								{
									modules: false,
									targets: { node: '6.10' },
								},
							],
						],
						plugins: ['transform-object-rest-spread'],
					},
				},
			},
		],
	},
	optimization: {
		minimize: false,
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify('production'),
			},
		}),
		// new UglifyJsPlugin({
		// 	sourceMap: true,
		// 	parallel: true,
		// 	uglifyOptions: {
		// 		keep_fnames: true,
		// 		keep_classnames: true,
		// 	},
		// }),
	],
};
