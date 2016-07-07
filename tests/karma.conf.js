module.exports = function(config) {
    config.set({
        basePath: '.',
        frameworks: ['mocha', 'chai'],
        reporters: ['progress', 'coverage'],
        preprocessors: {
            '../src/steller.web.js': ['coverage']
        },
        coverageReporter: {
            dir : '../coverage/',
            reporters: [
                { type: 'html', subdir: '.', file: 'index.html' },
            ]
        },
        files: [
            '../node_modules/lodash/lodash.min.js',
            '../node_modules/jquery/dist/jquery.min.js',
            '../src/steller.js',
            '../src/steller.lib.js',
            '../src/steller.lib.web.js',
            '../src/steller.web.js',
            '../tests/tests.web.js'
        ]
    });
};
