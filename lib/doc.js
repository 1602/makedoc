var fs = require('fs');
var path = require('path');
var md = require('markdown-js');

exports.generateFile = makeDoc;
exports.download = require('./downloader').download;
exports.writeReadme = writeReadme;

var files = [];

var javascripts = '';
var stylesheets = '';

if (~process.argv.indexOf('--assets')) {
    javascripts += '<script src="assets/jquery.js"></script>';
    javascripts += '<script src="assets/prettify.js"></script>';
    javascripts += '<script src="assets/bootstrap-dropdown.js"></script>';
    stylesheets += '<link rel="stylesheet" href="assets/bootstrap.css" />';
    stylesheets += '<link rel="stylesheet" href="assets/prettify.css" />';
} else {
    stylesheets += '<link rel="stylesheet" href="http://twitter.github.com/bootstrap/assets/css/bootstrap.css" />';
    stylesheets += '<link rel="stylesheet" href="http://twitter.github.com/bootstrap/assets/js/google-code-prettify/prettify.css" />';
    javascripts += '<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>';
    javascripts += '<script src="http://twitter.github.com/bootstrap/assets/js/google-code-prettify/prettify.js"></script>';
    javascripts += '<script src="http://twitter.github.com/bootstrap/assets/js/bootstrap-dropdown.js"></script>';
}

var stat = {
    totalMethods: 0,
    documentedMethods: 0,
    files: 0,
    classes: 0,
    packages: 0,
    codeLinesTotal: 0,
    codeLines: 0,
    codeLinesDocumented: 0
};
var out;

function makeDoc(filename, options) {

    var gitName = options.git;
    var baseTitle = options.title || (gitName || '').split('/').pop();
    out = options.out || './doc/';

    var code;
    if (typeof filename === 'string') {
        code = fs.readFileSync(filename).toString();
    } else {
        code = filename.code;
        filename = filename.name;
    }


    var codeLines = code.split('\n');
    stat.codeLinesTotal += codeLines.length;
    var layout = fs.readFileSync(options.layout || __dirname + '/../layout.html').toString();

    var prevCommentedLine = -2;
    var reOnelineComment = /^\/\//;
    codeLines.forEach(function (line, i) {
        if (line.match(reOnelineComment)) {
            var nextLineIsComment = (codeLines[i + 1]||'').match(reOnelineComment);
            if (i - prevCommentedLine > 1 && nextLineIsComment) {
                codeLines[i] = line.replace(reOnelineComment, '/**');
            } else if (nextLineIsComment) {
                codeLines[i] = line
                    .replace(reOnelineComment, ' *')
                    .replace(/\#\#\#\#+/, '');
            } else {
                codeLines[i] = line.replace(reOnelineComment, ' */');
            }
            prevCommentedLine = i;

        }
    });
    code = codeLines.join('\n');

    var re = /(?:\/\*\*([\s\S]*?)\*\/\n+)?(\S[^'\n\{]*)({\n[\s\S]*?\n\};?\n)?/g;
    var match;
    var body = '';
    var sidebar = '';

    var classMethods = [];
    var instanceMethods = [];
    var helperMethods = [];
    var constr;
    var modexp;

    // try to find `var myexp = module.exports` stuff
    var m = code.match(/^var ([_$a-zA-Z]*?)\s+=\s+(module\.)?exports/m);
    if (m) {
        modexp = m[1];
        console.log('Got modexp = ' + modexp);
    } else {

        // try to find `module.exports = myexp` stuff
        var mm = code.match(/module\.exports.*?= ([^=]+?)[;\n\s]/);
        if (mm) {
            modexp = mm[1];
            console.log('GOT modexp = ' + modexp);
            modexp = path.basename(filename, '.js');
        }

    }

    while (match = re.exec(code)) {
        (function (match) {
            var doc = '';
            if (match[1]) {
                doc = match[1].split('\n').map(function (line) {
                    return line.replace(/\s\*\s?/, '');
                }).join('\n');
            }
            var what = match[2].split(' = ')[0].split('.');
            var declaration = match[2].split(' = ')[1];
            var code = match[3];

            console.log(what);

            // if (what[1] === 'validatesLengthOf') console.log(match[1], doc);

            if (doc.match(/@nocode/)) {
                code = ' ';
                doc = doc.replace(/@nocode\s*\n?/, '');
            }

            if (!code) return;

            // match constructor
            // function Constructor() {
            if (what[0].match(/function [A-Z][^\s\(]+/)) {
                var ctor = what[0].match(/function ([A-Z][^\s\(]+)/)[1];
                if (constr) return;
                constr = {
                    className: ctor,
                    methodName: ctor,
                    code: what[0] + code,
                    doc: doc
                };
            }
            // match odd-style constructor
            else if (what[0].match(/var [A-Z][^\s]+/) && (declaration||'').match(/function/)) {
                var ctor = what[0].match(/var ([A-Z][^\s]+)/)[1];
                if (constr) return;
                constr = {
                    className: ctor,
                    methodName: ctor,
                    code: what[0] + declaration + code,
                    doc: doc
                };
            }
            // match named helper methods
            // function namedHelper() {
            else if (what[0].match(/function [a-z][^\s\(]+/)) {
                var methodName = what[0].match(/function ([a-z][^\s\(]+)/)[1];
                helperMethods.push({
                    methodName: methodName,
                    declaration: what[0],
                    doc: doc,
                    isPublic: !!doc.match(/@(api )?public/),
                    isHelperMethod: true,
                    code: what[0] + code
                });
            }
            else if (what.length > 1) {
                // match class and instance methods
                if (constr && what[0] === constr.className) {
                    var method = {
                        className: what[0],
                        methodName: what[2] || what[1],
                        declaration: declaration,
                        code: declaration + code,
                        doc: doc,
                        isInstanceMethod: what[2] && what[1] === 'prototype',
                        isPublic: !doc.match(/@(api )?private/)
                    };
                    if (method.isInstanceMethod) {
                        instanceMethods.push(method);
                    } else {
                        classMethods.push(method);
                    }
                } else {
                    if (what.length === 2 && declaration) {
                        modexp = modexp || what[0];
                        console.log(modexp, what[0], what[1]);
                        if (what[0] === modexp) {
                            helperMethods.push({
                                methodName: what[1],
                                declaration: declaration,
                                doc: doc,
                                isPublic: !!doc.match(/@(api )?public/),
                                isHelperMethod: true,
                                code: declaration + code
                            });
                        }
                    }
                }
            }

        })(match);
    }

    if (!constr && !modexp) {
        console.error('Constructor not found in', filename);
        console.log(helperMethods.length);
        return;
    }

    if (modexp = 'exports') modexp = path.basename(filename, '.js');

    if (!constr && modexp && !helperMethods.length) return;

    if (constr) {
        body += '<div class="hero-unit"><h1>' + constr.className + '</h1>';
        docs(constr.doc);
        appendCodeBlock(constr.code);
        if (classMethods.length)
            body += '<a href="#class" class="btn btn-primary btn-large">Class methods</a> ';
        if (instanceMethods.length)
            body += '<a href="#instance" class="btn btn-info btn-large">Instance methods</a> ';
        if (helperMethods.length)
            body += '<a href="#helper" class="btn btn-inverse btn-large">Helper methods</a> ';
        body += '</div>';
    }

    if (classMethods.length) {
        body += '<a name="class"></a>';
        sidebarHeader('class methods');
        pageHeader(constr.className + ' - class methods');
        listMethods(classMethods);
        classMethods.forEach(printMethod);
    }

    if (instanceMethods.length) {
        body += '<a name="instance"></a>';
        sidebarHeader('instance methods');
        pageHeader(constr.className + ' - instance methods');
        listMethods(instanceMethods);
        instanceMethods.forEach(printMethod);
    }

    if (helperMethods.length) {
        body += '<a name="helper"></a>';
        if (constr) {
            sidebarHeader('helper methods');
            pageHeader(constr.className + ' - helper methods');
        } else if (modexp) {
            sidebarHeader(modexp + ' - exports');
            pageHeader(modexp + ' - exports');
        }
        listMethods(helperMethods);
        helperMethods.forEach(printMethod);
    }

    if (!path.existsSync(out)) {
        fs.mkdirSync(out, 0755);
    }

    var docFile = out + basename(filename, '.js') + '.html';

    console.log('writing file', docFile);
    files.push({name: docFile, isClass: !!constr,  className: constr ? constr.className : modexp});
    process.nextTick(function () {
        fs.writeFileSync(
            docFile,
            layout
            .replace(/PROJECT NAME/, baseTitle)
            .replace(/TOPBAR/, makeTopbar(constr ? constr.className : modexp))
            .replace(/SIDEBAR/, '<ul class="nav nav-list">' + sidebar + '</ul>')
            .replace(/TITLE/, (constr ? constr.className : modexp) + ' | ' + baseTitle)
            .replace(/JAVASCRIPTS/, javascripts)
            .replace(/STYLESHEETS/, stylesheets)
            .replace(/BODY/, body.replace(/\$'/g, '&#36;\''))
        );
        ensureAssets();
    });

    function basename(filename) {
        return filename.replace(/\.?\/?lib\//, '').replace(/\.js$/, '').replace(/\//g, '|');
    }

    function pageHeader(name) {
        body += '<div class="page-header"><h2>' + name + '</h2></div>';
    }

    function sidebarHeader(name) {
        sidebar += '<li class="nav-header">' + name + '</li>';
    }

    function appendCodeBlock(code) {
        var line = getLinenum(code);
        body += '<div class="source-code">';
        body += '<a class="btn btn-small" onclick="$(this).parent().find(\'pre\').toggle()">Source code</a>';
        if (gitName) {
            body += ' <a href="https://github.com/' + gitName + '/blob/master/' + filename + '#L' + line + '">' + filename + ':' + line + '</a>';
        }
        body += '<pre class="prettyprint linenums:' + line + '" style="display: none; margin-top: 15px;"><code>' + code.replace(/</g, '&lt;') + '</code></pre>';
        body += '</div>';
        body += '<hr/>';
    }

    function printMethod(method) {
        body += '<div class="method">';
        body += '<a name="' + label(method) + '"></a>';
        body += '<h2><i class="icon icon-eye-' +
        (method.isPublic ? 'open' : 'close') + '"></i> <span style="color: grey">' +
        (method.className ? method.className + '.' : '') + '</span>' +
        (method.isInstanceMethod ? '<span style="color: green">prototype</span>.' : '')  +
        method.methodName +
        '</h2>';

        body += '<blockquote>Declared as <code>' + method.declaration + '</code></blockquote>';

        docs(method.doc);
        appendCodeBlock(method.code);
        body += '</div>';
    }

    function docs(doc) {
        var i = 1;
        doc = doc
            .replace(/@warning(.*?)\n/, '<div class="alert"><strong>Warning! </strong>$1</div>')
            .replace(/@see (.*?)\n/g, handleSeeTag)
            .replace(/\{([a-z]*?)\}/gi, '<strong>$1</strong>')
            .replace(/\s*@(\S+)/g, '<br/><span class="label label-info">@$1</span>')
            .replace(/```\n/g, function () {
                if (++i % 2 === 0) {
                    return '<pre class="prettyprint linenums"><code>';
                } else {
                    return '</code></pre>\n';
                }
            });

        body += '<div class="doc">' + md.makeHtml(doc) + '</div>';
    }

    function handleSeeTag(all, what) {
        var link = what;
        if (!what.match(/^https?:\/\//) && !~what.indexOf('#')) {
            link = '#' + link;
        }
        return '@see <i class="icon-share-alt"></i> <a href="' + link + '">' + what + '</a>\n';
    }

    function getLinenum(code) {
        var l = codeLines.length;
        var firstLine = code.split('\n')[0];
        for (var i = 0; i < l; i += 1) {
            if (~codeLines[i].indexOf(firstLine)) {
                // console.log('%d. %s', i + 1, firstLine);
                return i + 1;
            }
        }
        return 1;
    }

    function listMethods(collection, listType) {
        body += '<ul class="nav nav-pills">';
        collection.forEach(function (method) {
            var lines = 0;
            stat.totalMethods += 1;
            if (method.code) {
                lines = method.code.split(/\n/).length;
                stat.codeLines += lines;
            }
            if (method.doc) {
                stat.documentedMethods += 1;
                stat.codeLinesDocumented += lines;
            }

            body += '<li><a href="#' + label(method) + '">' + method.methodName + '</a></li>';
            var name = method.methodName;
            if (~method.doc.indexOf('@deprecated')) name = '<strike>' + name + '</strike>';
            sidebar += '<li><a href="#' + label(method) + '"><i class="icon icon-eye-' + (method.isPublic ? 'open' : 'close') + '"></i> ' + name + '</a></li>';
        });
        body += '</ul>';
    };

    function label(method) {
        return [method.isInstanceMethod ? 'instance' : (method.isHelperMethod ? 'helper' : 'class'), method.methodName].join('/');
    };
}

function makeTopbar(className) {
    var topbar = '';
    var subdirs = {};
    var counter = 0;
    var limit = 7;

    if (!stat.files) {
        files.forEach(function (file) {
            stat.files += 1;
            if (file.isClass) {
                stat.classes += 1;
            } else {
                stat.packages += 1;
            }
        });
        stat.coverage = Math.round(100 * stat.codeLinesDocumented / stat.codeLines);
        fs.writeFileSync(out + '/stats.json', JSON.stringify(stat));
    }

    files = files.sort(function (file, file2) {
        return file.className > file2.className;
    });

    files.forEach(function (file) {
        var name = path.basename(file.name);
        if (name.match(/\|/)) {
            var dir = name.split('|')[0];
            if (subdirs[dir]) {
                subdirs[dir].push(file);
            } else {
                subdirs[dir] = [file];
            }
        } else {
            if (++counter === limit) {
                topbar += '<li class="dropdown"> <a href="#" class="dropdown-toggle" data-toggle="dropdown"> ' + 'more' + ' <b class="caret"></b> </a> <ul class="dropdown-menu">';
            }
            link(file);
        }
    });

    if (counter >= limit) {
        topbar += '</ul>';
    }

    for (dir in subdirs) {
        topbar += '<li class="dropdown"> <a href="#" class="dropdown-toggle" data-toggle="dropdown"> <i class="icon-folder-open icon-white"></i> ' + dir + '  <b class="caret"></b> </a> <ul class="dropdown-menu">';
        subdirs[dir].forEach(link);
        topbar += '</ul>';
    }

    return topbar;

    function link(file) {
        var cls = (className === file.className ? ' class="active"' : '');
        topbar += '<li' + cls + '><a href="' + path.basename(file.name) + '">' + file.className + '</a></li>';
    }
}

function ensureAssets() {
    if (~process.argv.indexOf('--assets')) {
        var assetsDir = './doc/assets';
        if (path.existsSync(assetsDir)) return;
        fs.mkdirSync(assetsDir, 0755);
        fs.readdirSync(__dirname + '/../assets').forEach(copy);
    }
    function copy(file) {
        if (file.match(/\.(css|js|png)$/)) {
            fs.writeFileSync(
                assetsDir + '/' + file,
                fs.readFileSync(__dirname + '/../assets/' + file)
            );
        }
    }
}

function writeReadme(file, html, opts) {
    var layout = fs.readFileSync(opts.layout || __dirname + '/../layout.html').toString();
    var baseTitle = opts.title;
    var sidebar = '';

    var classes = [];
    var modexps = [];
    files.forEach(function (file) {
        if (file.isClass)
            classes.push(file);
        else
            modexps.push(file);
    });

    if (classes.length) {
        sidebar += '<li class="nav-header">classes</li>';
        classes.forEach(link);
    }

    if (modexps.length) {
        sidebar += '<li class="nav-header">modules</li>';
        modexps.forEach(link);
    }

    function link(file) {
        sidebar += '<li><a href="' + path.basename(file.name) + '">' + file.className + '</a></li>';
    }

    fs.writeFileSync(
        file,
        layout
        .replace(/PROJECT NAME/, baseTitle)
        .replace(/TOPBAR/, makeTopbar())
        .replace(/SIDEBAR/, '<ul class="nav nav-list">' + sidebar + '</ul>')
        .replace(/TITLE/, baseTitle)
        .replace(/JAVASCRIPTS/, javascripts)
        .replace(/STYLESHEETS/, stylesheets)
        .replace(/BODY/, html.replace(/\$'/g, '&#36;\''))
    );
}

