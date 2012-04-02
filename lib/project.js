var fs = require('fs');
var path = require('path');
var view = require('./view');
var stats = require('./statistics');
var GitHub = require('./github');
var Parser = require('./parser');
var Documentation = require('./documentation');

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
function Project() {
    this.title = null;
    this.repo = null;
    this.files = [];
    this.out = './doc/';
    this.layout = __dirname + '/../layout.html';
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

    function done() {
        if (--wait === 0 && callback) callback.call(project);
    }
};

Project.prototype.makeDocumentation = function () {
    var project = this;
    var layout = fs.readFileSync(project.layout).toString();

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
        doc.write(file, html);
    });

    // 5. Statistics
    fs.writeFileSync(
        path.join(this.out, 'stats.json'),
        JSON.stringify(stats(project.files))
    );

};

function basename(filename) {
    return filename
    .replace(/\.?\/?lib\//, '')
    .replace(/\.js$/, '')
    .replace(/\//g, '|') +
    '.html';
}
