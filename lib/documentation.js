var fs = require('fs');
var path = require('path');
function Documentation(layout) {
    this.layout = layout;
    this.title = '';
    this.out = '';
}
module.exports = Documentation;

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

Documentation.prototype.write = function (file, html) {
    console.log('writing', file.docFile);
    fs.writeFileSync(
        path.join(this.out, file.docFile),
        this.layout
        .replace(/PROJECT NAME/, this.title)
        .replace(/TOPBAR/, html.topBar)
        .replace(/SIDEBAR/, '<ul class="nav nav-list sidenav">' + html.sidebar + '</ul>')
        .replace(/TITLE/, file.displayName + ' | ' + this.title)
        .replace(/JAVASCRIPTS/, javascripts)
        .replace(/STYLESHEETS/, stylesheets)
        .replace(/BREADCRUMB/, html.breadcrumb)
        .replace(/BODY/, html.body.replace(/\$'/g, '&#36;\''))
    );
};

Documentation.prototype.setOutputDir = function (dir) {
    this.out = dir;
    if (path.existsSync(dir)) {
        fs.readdirSync(dir).forEach(function (file) {
            var filename = path.join(dir, file);
            if (fs.statSync(filename).isFile()) {
                fs.unlinkSync(filename);
            }
        });
    } else {
        fs.mkdirSync(dir, 0755);
    }
};

Documentation.prototype.writeReadme = function writeReadme(files, html) {
    console.log('writing readme: index.html');
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
        sidebar += '<li><a href="' + file.docFile + '"><i class="icon-chevron-right"></i>' + file.displayName + '</a></li>';
    }

    fs.writeFileSync(
        path.join(this.out, 'index.html'),
        this.layout
        .replace(/PROJECT NAME/, this.title)
        .replace(/TOPBAR/, this.topBar)
        .replace(/SIDEBAR/, '<ul class="nav nav-list sidenav">' + sidebar + '</ul>')
        .replace(/TITLE/, this.title)
        .replace(/JAVASCRIPTS/, javascripts)
        .replace(/STYLESHEETS/, stylesheets)
        .replace(/BREADCRUMB/, '<li class="active">README</li>')
        .replace(/BODY/, (html||'<div class="alert">Readme not found</div>').replace(/\$'/g, '&#36;\''))
    );
}
