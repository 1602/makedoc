#!/usr/bin/env node

var argv = require('optimist')
    .usage('Generate bootstrapped jsdoc.\nUsage: $0')

    .alias('t', 'title')
    .describe('t', 'Specify common title of documentation pages')

    .alias('g', 'git')
    .describe('g', 'Github repo (add fancy links to sources)')

    .alias('d', 'download')
    .describe('d', 'Download files from github public repo')

    .alias('o', 'out')
    .describe('o', 'Specify output dir. By default ./doc')

    .argv;

var title = argv.t;
var git = argv.g;
var out = argv.o || './doc/';
var Project = require('../lib/project');
var path = require('path');

var p = new Project;
p.title = title || 'API Docs';
p.repo = git;

if (argv.d && git) {
    p.download(argv.d, p.makeDocumentation.bind(p));
} else {
    p.readFiles(argv._, p.makeDocumentation.bind(p));
}

