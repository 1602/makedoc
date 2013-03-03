#!/usr/bin/env node

var optimist = require('optimist');
var argv = optimist
    .usage([
        'Generate bootstrapped jsdoc.',
        'Usage: $0 [files] [options]',
        '',
        'Examples:',
        '  makedoc lib/*.js                # parse lib/*.js files',
        '  makedoc lib/*.js -o ./apidocs   # output to ./apidocs',
        '  makedoc -d -g 1602/compound     # process github repository'
    ].join('\n'))

    .alias('t', 'title')
    .describe('t', 'Specify common title of documentation pages')

    .alias('g', 'git')
    .describe('g', 'Github repo (add fancy links to sources)')

    .alias('d', 'download')
    .describe('d', 'Download files from github public repo')

    .alias('o', 'out')
    .describe('o', 'Specify output dir. By default ./doc')

    .alias('a', 'assets')
    .describe('a', 'Copy assets to $DOC_ROOT/assets')

    .argv;

var title = argv.t;
var git = argv.g;
var out = argv.o || './doc/';
var Project = require('../lib/project');
var path = require('path');

var p = new Project(process.cwd());
p.title = title || 'API Docs';
p.repo = git;

if (argv.d && git) {
    console.log('Generating docs from remote github repository');
    p.download(argv.d, p.makeDocumentation.bind(p));
} else if (argv._.length) {
    console.log('Generating docs local files');
    p.readFiles(argv._, p.makeDocumentation.bind(p));
} else {
    optimist.showHelp();
}

