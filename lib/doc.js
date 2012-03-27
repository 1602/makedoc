var fs = require('fs');
var path = require('path');
var md = require('markdown-js');

exports.generateFile = makeDoc;

var files = [];

function makeDoc(filename, baseTitle) {

    baseTitle = baseTitle || 'API Doc'

    var code = fs.readFileSync(filename).toString();
    var codeLines = code.split('\n');
    var layout = fs.readFileSync(__dirname + '/../layout.html').toString();

    var re = /\/\*\*([\s\S]*?)\*\/\n+([^\n\{]*)({\n[\s\S]*?\n\};?\n)?/g;
    var match;
    var body = '';
    var sidebar = '';

    var classMethods = [];
    var instanceMethods = [];
    var helperMethods = [];
    var constr;

    while (match = re.exec(code)) {
        (function (match) {
            var doc = match[1].split('\n').map(function (line) {
                return line.replace(/\s\*\s?/, '');
            }).join('\n');
            var what = match[2].split(' = ')[0].split('.');
            var declaration = match[2].split(' = ')[1];
            var code = match[3];

            // if (what[1] === 'validatesLengthOf') console.log(match[1], doc);

            if (doc.match(/@nocode/)) {
                code = ' ';
                doc = doc.replace(/@nocode\s*\n?/, '');
            }

            if (!code) return;

            // match constructor
            if (what[0].match(/function [A-Z][^\s\(]+/)) {
                var ctor = what[0].match(/function ([A-Z][^\s\(]+)/)[1];
                constr = {
                    className: ctor,
                    methodName: ctor,
                    code: what[0] + code,
                    doc: doc
                };
            }
            // match helper methods
            else if (what[0].match(/function [a-z][^\s\(]+/)) {
                var methodName = what[0].match(/function ([a-z][^\s\(]+)/)[1];
                helperMethods.push({
                    methodName: methodName,
                    declaration: what[0],
                    doc: doc,
                    isPublic: ~doc.indexOf('@public'),
                    isHelperMethod: true,
                    code: what[0] + code
                });
            }
            // match class and instance methods
            else {
                var method = {
                    className: what[0],
                    methodName: what[2] || what[1],
                    declaration: declaration,
                    code: declaration + code,
                    doc: doc,
                    isInstanceMethod: what[2] && what[1] === 'prototype',
                    isPublic: !~doc.indexOf('@private')
                };
                if (method.isInstanceMethod) {
                    instanceMethods.push(method);
                } else {
                    classMethods.push(method);
                }
            }

        })(match);
    }

    if (!constr) {
        console.error('Constructor not found in', filename);
        return;
    }

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
        sidebarHeader('helper methods');
        pageHeader(constr.className + ' - helper methods');
        listMethods(helperMethods);
        helperMethods.forEach(printMethod);
    }

    if (!path.existsSync('./doc/')) {
        fs.mkdirSync('./doc', 0755);
    }

    var docFile = './doc/' + path.basename(filename, '.js') + '.html';

    console.log('writing file', docFile);
    files.push({name: docFile, className: constr.className});
    process.nextTick(function () {
        fs.writeFileSync(
            docFile,
            layout
            .replace(/PROJECT NAME/, baseTitle)
            .replace(/TOPBAR/, makeTopbar(constr.className))
            .replace(/SIDEBAR/, '<ul class="nav nav-list">' + sidebar + '</ul>')
            .replace(/TITLE/, constr.className + ' | ' + baseTitle)
            .replace(/BODY/, body)
        );
    });

    function pageHeader(name) {
        body += '<div class="page-header"><h2>' + name + '</h2></div>';
    }

    function sidebarHeader(name) {
        sidebar += '<li class="nav-header">' + name + '</li>';
    }

    function appendCodeBlock(code) {
        body += '<a class="btn btn-small" onclick="$(this).next(\'pre\').toggle()">Source code</a>';
        body += '<pre class="prettyprint linenums:' + getLinenum(code) + '" style="display: none; margin-top: 15px;"><code>' + code + '</code></pre>';
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
            .replace(/@see (.*?)\n/g, '@see <i class="icon-share-alt"></i> <a href="#$1">$1</a>\n')
            .replace(/\{([a-z]*?)\}/gi, '<strong>$1</strong>')
            .replace(/@(\S+)/g, '<br/><span class="label label-info">@$1</span>')
            .replace(/```\n/g, function () {
                if (++i % 2 === 0) {
                    return '<pre class="prettyprint linenums"><code>';
                } else {
                    return '</code></pre>\n';
                }
            });

        body += '<div class="doc">' +
            md.makeHtml(doc) +
            '</div>';
    }

    function getLinenum(code) {
        var l = codeLines.length;
        var firstLine = code.split('\n')[0];
        for (var i = 0; i < l; i += 1) {
            if (~codeLines[i].indexOf(firstLine)) {
                console.log('%d. %s', i + 1, firstLine);
                return i + 1;
            }
        }
        return 1;
    }

    function listMethods(collection, listType) {
        body += '<ul class="nav nav-pills">';
        collection.forEach(function (method) {
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
    return files.map(function (file) {
        return '<li' + (className === file.className ? ' class="active"' : '') + '><a href="' + path.basename(file.name) + '">' + file.className + '</a></li>';
    }).join('\n              ');
}
