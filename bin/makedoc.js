#!/usr/bin/env node

var argv = require('optimist')
    .usage('Generate bootstrapped jsdoc.\nUsage: $0')

    .alias('t', 'title')
    .describe('t', 'Specify common title of documentation pages')

    .alias('g', 'git')
    .describe('g', 'Github repo (add fancy links to sources)')

    .alias('d', 'download')
    .describe('d', 'Download files from github public repo')

    .argv

var title = argv.t;
var git = argv.g;

if (argv.d && git) {
    require('../lib/downloader').download('/' + git + '/tree/master/' + argv.d, function (files) {
        files.forEach(generate);
    });
} else {
    argv._.forEach(generate);
}

function generate(file) {
    require('../lib/doc').generateFile(file, {
        title: title,
        git: git
    });
}

