const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');
// const HtmlInlineCssPlugin = require('html-inline-css-webpack-plugin');

module.exports = {
    mode: 'production',                     // use “development” for local debugging
    entry: './script.js',                   // bootstrap file (imports game.js)
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },

    module: {
        rules: [
            /* JS / TS handled by builtin esbuild in Webpack-5 (or you can add babel-loader) */

            /* CSS: let style-loader push rules into <style>, which will be inlined later */
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },

            /* Inline ALL png/svg/ttf/woff under 100 kB (adjust as needed) */
            {
                test: /\.(png|jpe?g|gif|svg|woff2?|ttf)$/i,
                type: 'asset/inline',              // Webpack 5 builtin
                parser: { dataUrlCondition: { maxSize: 100 * 1024 } },
            },
        ],
    },

    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html',           // existing file – NO script tag needed
            inject: 'body',
        }),
        // new HtmlInlineCssPlugin(),
        new HtmlInlineScriptPlugin(),         // replaces the <script src=…> with inline code

    ],

    devServer: {
        static: './dist',
        hot: true,
        port: 3000,
    },
};