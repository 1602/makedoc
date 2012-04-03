var path = require('path');

/**
 * Javascript source code analyser
 * @param code
 */
function Parser(code, filename) {
    this.code = code;
    this.filename = filename;
    this.classMethods = [];
    this.instanceMethods = [];
    this.helperMethods = [];
    this.constr = null;
    this.modexp = null;

    // Rule match documentable entities (both documented and not)
    this.rule = /(?:\/\*\*([\s\S]*?)\*\/\n+)?([^\s\(][^'\n\{]*)((?:\n\/\*\*)|(?:{})|(?:{\n*[\s\S]*?\n\};?)\n)?/g;

    // run analyse
    this.process();
}
module.exports = Parser;

/**
 * Main parser loop
 */
Parser.prototype.process = function process() {
    var parser = this;
    var match;

    this.codeLines = this.code.split('\n');
    this.fixInlineCommentingStyle();
    this.fixIndentedDocs();
    this.code = this.codeLines.join('\n');

    this.tryToDetermineModexp();

    while (match = this.rule.exec(this.code)) {
        (function (match) {
            var doc = '';
            if (match[1]) {
                doc = match[1].split('\n').map(function (line) {
                    return line.replace(/\s\*\s?/, '');
                }).join('\n');
            }
            var m = {
                match: match,
                doc: doc,
                what: match[2].split(/\s*=\s*/)[0].split('.'),
                declaration: match[2].split(/\s*=\s*/)[1],
                code: match[3]
            };

            console.log('what:', match[2]);

            // if (what[1] === 'validatesLengthOf') console.log(match[1], doc);

            if (m.doc.match(/@nocode/)) {
                m.code = ' ';
                m.doc = doc.replace(/@nocode\s*\n?/, '');
            }

            if (!m.code) return;

            parser.matchConstructor(m) ||
            parser.matchOddStyleConstructor(m) ||
            parser.matchNamedHelper(m) ||
            parser.matchClassOrInstanceMethod(m) ||
            parser.matchHelper(m);

        })(match);
    }

    if (this.modexp === 'exports' || !this.modexp) {
        this.modexp = path.basename(this.filename, '.js');
    }

};

/**
 * Try to match constructor looking like: `function Constructor() {`
 */
Parser.prototype.matchConstructor = function matchConstructor(m) {
    // if constructor already matched (only allow one constructor per file)

    var declaration = m.what[0];
    var reCtor = /function ([A-Z][^\s\(]+)/;
    var dm = declaration.match(reCtor);
    if (!dm) return false;
    if (this.constr) return true;

    var ctor = dm[1];
    this.constr = {
        className: ctor,
        methodName: ctor,
        code: declaration + m.code,
        doc: m.doc
    };
    return true;
};

/**
 * Try to match odd-style constructor looking like:
 * ```
 * var Constructor = function () {
 * ```
 */
Parser.prototype.matchOddStyleConstructor = function matchOddStyleConstructor(m) {
    var reCtorName = /var [A-Z][^\s]+/;
    var mn = m.what[0].match(reCtorName);

    if (!mn || !(m.declaration||'').match(/function/)) return false;
    if (this.constr) return true;
    var ctor = mn[1];
    this.constr = {
        className: ctor,
        methodName: ctor,
        code: m.what[0] + m.declaration + m.code,
        doc: m.doc
    };
    return true;
};

/**
 * Match named helper method:
 * ```
 * function namedHelper() {
 * ```
 */
Parser.prototype.matchNamedHelper = function matchNamedHelper(m) {
    if (!m.what[0].match(/function [a-z][^\s\(]+/)) return false;
    var methodName = m.what[0].match(/function ([a-z][^\s\(]+)/)[1];
    this.helperMethods.push({
        methodName: methodName,
        declaration: m.what[0],
        doc: m.doc,
        isPublic: !!m.doc.match(/@(api )?public/),
        isHelperMethod: true,
        code: m.what[0] + m.code
    });
    return false;
};

/**
 * Match class or instance method
 */
Parser.prototype.matchClassOrInstanceMethod = function matchClassOrInstanceMethod(m) {
    // match class and instance methods
    var what = m.what;
    if (what.length > 1 && this.constr && what[0] === this.constr.className) {
        var method = {
            className: what[0],
            methodName: what[2] || what[1],
            declaration: m.declaration,
            code: m.declaration + m.code,
            doc: m.doc,
            isInstanceMethod: what[2] && what[1] === 'prototype',
            isPublic: !m.doc.match(/@(api )?private/)
        };
        if (method.isInstanceMethod) {
            this.instanceMethods.push(method);
        } else {
            this.classMethods.push(method);
        }
        return true;
    }
    return false;
};

/**
 * Any other exported helper: `mod.exp = function () {`
 *
 * By default processed function would private, to mark it as public
 * comments should contain `public` tag, or `api public`
 */
Parser.prototype.matchHelper = function matchHelper(m) {
    var what = m.what;
    if (what.length === 2 && m.declaration) {
        this.modexp = this.modexp || what[0];
        console.log(this.modexp, what[0], what[1]);
        if (what[0] === this.modexp) {
            this.helperMethods.push({
                methodName: what[1],
                declaration: m.declaration,
                doc: m.doc,
                isPublic: !!m.doc.match(/@(api )?public/),
                isHelperMethod: true,
                code: m.declaration + m.code
            });
        }
    }
};

/**
 * Convert docco-inline style to jsdoc block-line style of commenting.
 * 
 * Before:
 * ```
 * //
 * // ### Method name
 * // #### Description
 * // #### any other stuff
 * //
 * ```
 * After:
 * ```
 * /**
 *  * ### Method name
 *  * Description
 *  * any other stuff
 *  ** /
 */
Parser.prototype.fixInlineCommentingStyle = function fixInlineCommentingStyle() {

    var prevCommentedLine = -2;
    var reOnelineComment = /^\/\//;
    var codeLines = this.codeLines;
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
};

Parser.prototype.fixIndentedDocs = function fixIndentedDocs() {
    var codeLines = this.codeLines;
    var indentationDetected;
    codeLines.forEach(function (line, i) {
        if (!indentationDetected) {
            var m = line.match(/^(\s+)\/\*\*/);
            if (m && m[1].length > 1) {
                indentationDetected = m[1].length;

            } else return;
        } else {
            if (line.substr(0, indentationDetected).match(/\S/)) {
                indentationDetected = false;
                return;
            } else if (line[indentationDetected] === '}') {
                codeLines[i] = line.substr(indentationDetected);
                indentationDetected = false;
                return;
            }
        }
        line = line.substr(indentationDetected);
        if (!line.match(/\S/)) {
            line = '';
        }
        codeLines[i] = line;
    });
};

/**
 * Search for module declaration strings:
 * ```
 * var myexp = module.exports;
 * module.exports = someThings;
 * ```
 */
Parser.prototype.tryToDetermineModexp = function tryToDetermineModexp() {
    // try to find `var myexp = module.exports` stuff
    var m = this.code.match(/^var ([_$a-zA-Z]*?)\s+=\s+(module\.)?exports/m);
    if (m) {
        this.modexp = m[1];
        // console.log('Got modexp = ' + modexp);
        return
    }

    // try to find `module.exports = myexp` stuff
    var mm = this.code.match(/^module\.exports.*?= ([^=]+?)[;\n\s]/);
    if (mm) {
        this.modexp = mm[1];
        // console.log('GOT modexp = ' + modexp);
    }

};

