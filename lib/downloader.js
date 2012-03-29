var https = require('https');

var files = [];
var readme;
var dlDone;

exports.download = function (basePath, done) {
    dlDone = done;
    var git = basePath.split('/').slice(0, 3).join('/');
    console.log(git);
    get(git, function ($) {
        readme = $('#readme .markdown-body').html();
        loadDir(basePath, true);
    });
};

function loadDir(path, goDeep) {

    waitFor(loadDir);

    get(path, function ($) {
        loadDir.wait -= 1;
        $('a.js-slide-to').each(function () {
            var url = $(this).attr('href');
            console.log(url);
            if (url.match(/\.js$/)) {
                loadFile(url);
            } else if (goDeep && url.match(/\/tree\//)) {
                console.log(url);
                loadDir(url);
            }
        });
    });
}

function loadFile(path) {

    waitFor(loadFile);

    getRaw(path, function (code) {
        files.push({
            name: path.split('/').slice(5).join('/'),
            code: code
        });
        loadFile.wait -= 1;
        maybeDone();
    });
}

function get(path, done) {
    https.get({
        host: 'github.com',
        path: path
    }, function (res) {
        console.log('got html', path);
        var html = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) { html += chunk; });
        res.on('end', function () {
            done(jquery(html));
        });
    }).on('error', console.log);
}

function getRaw(url, done) {
    https.get({
        host: 'raw.github.com',
        path: url.replace('/blob/', '/')
    }, function (res) {
        console.log('got raw', url);
        var file = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) { file += chunk; });
        res.on('end', function () {
            done(file);
        });
    });
}

function jquery(html) {
    var opts = {
        features: {
            FetchExternalResources: false, ProcessExternalResources: false
        }
    };
    var jq = require('./jquery');
    var jsdom = require('jsdom');
    var window = jsdom.jsdom(html, null, opts).createWindow();
    return jq.create(window);
}

function waitFor(fn) {
    if (!fn.wait) {
        fn.wait = 1;
    } else {
        fn.wait += 1;
    }
}

function maybeDone() {
    if (loadFile.wait === 0 && loadDir.wait === 0) {
        dlDone(files, readme);
    }
}
