//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

const { CleanWebpackPlugin: CleanPlugin } = require('clean-webpack-plugin');
const esbuild = require('esbuild');
const { EsbuildPlugin } = require('esbuild-loader');
const ForkTsCheckerPlugin = require('fork-ts-checker-webpack-plugin');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports =
	/**
	 * @param {{ } | undefined } env
	 * @param {{ mode: 'production' | 'development' | 'none' | undefined }} argv
	 * @returns { WebpackConfig[] }
	 */
	function (env, argv) {
		const mode = argv.mode || 'none';
		env = { ...env };

		return [getExtensionConfig(mode, env)];
	};

/**
 * @param { 'production' | 'development' | 'none' } mode
 * @param {{ }} env
 * @returns { WebpackConfig }
 */
function getExtensionConfig(mode, env) {
	/**
	 * @type WebpackConfig['plugins'] | any
	 */
	const plugins = [
		new CleanPlugin(),
		new ForkTsCheckerPlugin({
			async: false,
			eslint: {
				enabled: true,
				files: 'src/**/*.ts?(x)',
				options: {
					cache: true,
					cacheLocation: path.join(__dirname, '.eslintcache/'),
					cacheStrategy: 'content',
					fix: mode !== 'production',
					overrideConfigFile: path.join(__dirname, '.eslintrc.json'),
				},
			},
			formatter: 'basic',
			typescript: {
				configFile: path.join(__dirname, 'tsconfig.json'),
			},
		}),
		new webpack.DefinePlugin({
			'MODE': JSON.stringify(mode),
		}),
	];

	return {
		name: 'extension',
		entry: {
			background: './src/background.ts',
			'service-worker': './src/service-worker.ts',
		},
		mode: mode,
		target: 'web',
		devtool: mode === 'production' ? false : 'source-map',
		output: {
			filename: '[name].js',
			path: path.join(__dirname, 'dist'),
		},
		optimization: {
			minimizer: [
				new EsbuildPlugin({
					drop: ['debugger'],
					format: 'esm',
					legalComments: 'none',
					minify: true,
					target: 'es2022',
					treeShaking: true,
				}),
			],
		},
		module: {
			rules: [
				{
					exclude: /\.d\.ts$/,
					include: path.join(__dirname, 'src'),
					test: /\.tsx?$/,
					use: {
						loader: 'esbuild-loader',
						options: {
							format: 'esm',
							implementation: esbuild,
							target: ['es2022', 'chrome102'],
							tsconfig: path.join(__dirname, 'tsconfig.json'),
						},
					},
				},
			],
		},
		resolve: {
			extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
		},
		plugins: plugins,
		infrastructureLogging:
			mode === 'production'
				? undefined
				: {
					level: 'log', // enables logging required for problem matchers
				},
		stats: {
			preset: 'errors-warnings',
			assets: true,
			assetsSort: 'name',
			assetsSpace: 100,
			colors: true,
			env: true,
			errorsCount: true,
			warningsCount: true,
			timings: true,
		},
	};
}
