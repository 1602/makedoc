var https = require('https');

function GitHub(repo) {
    this.repo = repo;
    this.files = [];
    this.wait = 0;
}
module.exports = GitHub;

GitHub.prototype.download = function (subdir, deep, callback) {
    var gh = this;
    this.dir('/' + this.repo + '/tree/master/' + subdir, deep);
    this.onDone = function () {
        if (gh.wait === 0) callback(gh.err, gh.files);
    };
};

GitHub.prototype.readme = function (callback) {
    get('/' + this.repo, function (err, $) {
        if (err) {
            return callback(err);
        }
        var readme = $('#readme .markdown-body').html();
        callback(null, readme);
    });
};

GitHub.prototype.dir = function loadDir(path, deep) {
    var gh = this;
    gh.wait += 1;
    get(path, function (err, $) {
        $('a.js-slide-to').each(function () {
            var url = $(this).attr('href');
            console.log(url);
            if (url.match(/\.js$/)) {
                gh.file(url);
            } else if (deep && url.match(/\/tree\//)) {
                console.log(url);
                gh.dir(url, deep - 1);
            }
        });
        gh.done();
    });
};

GitHub.prototype.file = function loadFile(path) {
    var gh = this;
    gh.wait += 1;
    getRaw(path, function (code) {
        gh.files.push({
            name: path.split('/').slice(5).join('/'),
            code: code
        });
        gh.done();
    });
};

GitHub.prototype.done = function () {
    this.wait -= 1;
    if (this.wait === 0 && this.onDone) this.onDone();
};

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
            done(null, jquery(html));
        });
    }).on('error', function (err) {
        done(err || new Error(path));
    });
}

function getRaw(url, done) {
    var newUrl = url.replace(/\/blob\/.*?\//, '/master/')
    https.get({
        host: 'raw.github.com',
        path: newUrl
    }, function (res) {
        console.log('got raw', newUrl);
        var file = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) { file += chunk; });
        res.on('end', function () {
            done(file);
        });
    }).on('error', function (err) {
        done(err || new Error(newUrl));
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

