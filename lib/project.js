var fs = require('fs');
var path = require('path');
var view = require('./view');
var stats = require('./statistics');
var GitHub = require('./github');
var Parser = require('./parser');
var Documentation = require('./documentation');
var gfm = require('github-flavored-markdown');

/**
 * Represent set of files and it's common settings.
 * Allows to write documentation. Top-level API class
 *
 * Two common use-cases: download github project, process list of files
 * ```
 * var p = new Project;
 * p.title = 'Makedoc API docs';
 * p.repo = '1602/makedoc';
 * p.readFiles(['./lib/project.js'], p.makeDocumentation.bind(p));
 */
function Project(root) {
    this.root = root;
    this.title = null;
    this.repo = null;
    this.files = [];
    this.out = './doc/';
    this.layout = __dirname + '/../layout.html';
    this.layoutHTML = null;
}
module.exports = Project;

Project.prototype.download = function download(subdir, callback) {
    var project = this;
    var gh = new GitHub(this.repo);
    gh.download(subdir, 1, function (err, files) {
        if (!err) {
            project.files = project.files.concat(files);
        }
        gh.readme(function (err, readme) {
            if (err) {
                console.log(err);
            }
            project.readme = readme;
            if (callback) {
                callback.call(project);
            }
        });
    });
};

Project.prototype.readFiles = function (filenames, callback) {
    var project = this;
    var wait = filenames.length;
    filenames.forEach(function (filename) {
        fs.readFile(filename, function (err, code) {
            project.files.push({
                code: code.toString(),
                name: filename
            });
            done();
        });
    });
    if (project.root) {
        var readme, filename;
        fs.readdirSync(project.root).forEach(function (f) {
            if (f.match(/readme\.(md|markdown)/i)) {
                filename = f;
            }
        });

        if (filename) {
            readme = fs.readFileSync(project.root + '/' + filename, 'utf8');
            project.readme = gfm.parse(readme);
        } else {
            console.error('WARN: no README.md file found');
        }
    }

    function done() {
        if (--wait === 0 && callback) callback.call(project);
    }
};

Project.prototype.makeDocumentation = function () {
    var project = this;
    var layout = project.layoutHTML || fs.readFileSync(project.layout).toString();

    // 1. Parse files
    project.files.forEach(function (file) {
        file.parsed = new Parser(file.code, file.name);
        file.docFile = basename(file.name);
        file.isClass = !!file.parsed.constr;
        if (file.isClass) {
            file.displayName = file.parsed.constr.className;
        } else {
            file.displayName = file.parsed.modexp;
            if (file.displayName === 'exports') {
                file.displayName = file.name;
            }
        }
        file.gitName = project.repo;
    });

    project.files = project.files
    .filter(function (f) {
        return f.parsed.anyMethod()
    })
    .sort(function (file, file2) {
        return file.displayName > file2.displayName ? 1 : -1;
    });

    // 2. Generate common parts
    var doc = new Documentation(layout);
    doc.topBar = view.makeTopbar(project.files);
    doc.title = project.title || project.repo;
    doc.setOutputDir(project.out);

    // 3. Readme file
    doc.writeReadme(project.files, project.readme);

    // 4. Generate files
    project.files.forEach(function (file) {
        var html = view.htmlBodyContents(file);
        html.topBar = view.makeTopbar(project.files, file.docFile);
        html.breadcrumb = view.makeBreadcrumb(project, file);
        doc.write(file, html);
    });

    // 5. Statistics
    project.stats = stats(project.files);
    fs.writeFileSync(
        path.join(this.out, 'stats.json'),
        JSON.stringify(project.stats)
    );

};

function basename(filename) {
    return filename
    .replace(/\.?\/?lib\//, '')
    .replace(/\.js$/, '')
    .replace(/\//g, '|') +
    '.html';
}
