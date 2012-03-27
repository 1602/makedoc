#!/usr/bin/env node

var argv = require('optimist')
    .usage('Generate bootstrapped jsdoc.\nUsage: $0')
    .alias('d', 'dir')
    .describe('d', 'Load all *.js files inside directory')
    .alias('t', 'title')
    .describe('t', 'Specify common title of documentation pages')
    .argv

var title = argv.t;

argv._.forEach(function (file) {
    require('../lib/doc').generateFile(file, title);
});

