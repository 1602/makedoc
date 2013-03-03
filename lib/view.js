var gfm = require('github-flavored-markdown');

exports.makeTopbar = function makeTopbar(files, current) {
    var topbar = '';
    var subdirs = {};
    var counter = 0;
    var limit = 7;

    files.forEach(function (file) {
        var name = file.docFile;
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
        topbar += '<li class="dropdown"> <a href="#" class="dropdown-toggle" data-toggle="dropdown"> <i class="icon-folder-open"></i> ' + dir + '  <b class="caret"></b> </a> <ul class="dropdown-menu">';
        subdirs[dir].forEach(link);
        topbar += '</ul>';
    }

    return topbar;

    function link(file) {
        var cls = (file.docFile === current ? ' class="active"' : '');
        topbar += '<li' + cls + '><a href="' + file.docFile + '">' + file.displayName + '</a></li>';
    }
};

exports.htmlBodyContents = function (file) {
    var body = '';
    var sidebar = '';
    var p = file.parsed;
    if (p.constr) {
        body += '<div class="hero-unit"><h1>' + p.constr.className + '</h1>';
        docs(p.constr.doc);
        appendCodeBlock(p.constr.code);
        if (p.classMethods.length)
            body += '<a href="#class" class="btn btn-primary btn-large">Class methods</a> ';
        if (p.instanceMethods.length)
            body += '<a href="#instance" class="btn btn-info btn-large">Instance methods</a> ';
        if (p.helperMethods.length)
            body += '<a href="#helper" class="btn btn-inverse btn-large">Helper methods</a> ';
        body += '</div>';
    }

    if (p.classMethods.length) {
        body += '<a name="class"></a>';
        sidebarHeader('class methods');
        pageHeader(p.constr.className + ' - class methods');
        listMethods(p.classMethods);
        p.classMethods.forEach(printMethod);
    }

    if (p.instanceMethods.length) {
        body += '<a name="instance"></a>';
        sidebarHeader('instance methods');
        pageHeader(p.constr.className + ' - instance methods');
        listMethods(p.instanceMethods);
        p.instanceMethods.forEach(printMethod);
    }

    if (p.helperMethods.length) {
        body += '<a name="helper"></a>';
        if (p.constr) {
            sidebarHeader('helper methods');
            pageHeader(p.constr.className + ' - helper methods');
        } else if (p.modexp) {
            sidebarHeader(file.shortName + ' - exports');
            pageHeader(file.shortName + ' - exports');
        }
        listMethods(p.helperMethods);
        p.helperMethods.forEach(printMethod);
    }

    return {
        body: body,
        sidebar: sidebar
    };

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
        if (file.gitName) {
            body += ' <a href="https://github.com/' + file.gitName + '/blob/master/' + file.name + '#L' + line + '">' + file.name + ':' + line + '</a>';
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
            //.replace(/\s*@(\S+)/g, '<br/><span class="label label-info">@$1</span>')
            .replace(/```/gm, function () {
                if (++i % 2 === 0) {
                    return '<pre class="prettyprint linenums"><code>';
                } else {
                    return '</code></pre>';
                }
            });

        body += '<div class="doc">' + gfm.parse(doc) + '</div>';
    }

    function handleSeeTag(all, what) {
        var link = what;
        if (!what.match(/^https?:\/\//) && !~what.indexOf('#')) {
            link = '#' + link;
        }
        return '@see <i class="icon-share-alt"></i> <a href="' + link + '">' + what + '</a>\n';
    }

    function getLinenum(code) {
        var l = file.parsed.codeLines.length;
        var firstLine = code.split('\n')[0];
        for (var i = 0; i < l; i += 1) {
            if (~file.parsed.codeLines[i].indexOf(firstLine)) {
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
};

exports.makeBreadcrumb = function makeBreadcrumb(project, file) {
    var f;
    if (project.repo) {
        f = ' (<a href="https://github.com/' +
            project.repo + '/tree/master/' + file.name + '">' +
            file.name + '</a>)';
    } else {
        f = ' (' + file.name + ')';
    }
    return '<li class="active">' +
        file.displayName + f + '</li>';
};

