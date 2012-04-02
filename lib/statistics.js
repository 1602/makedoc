module.exports = function calculateStatistics(files) {
    var stat = {
        totalMethods: 0,
        documentedMethods: 0,
        files: files.length,
        classes: 0,
        packages: 0,
        codeLinesTotal: 0,
        codeLines: 0,
        codeLinesDocumented: 0
    };

    files.forEach(function (file) {
        stat.codeLinesTotal += file.parsed.codeLines.length;
        file.parsed.instanceMethods.forEach(calcMethod);
        file.parsed.classMethods.forEach(calcMethod);
        file.parsed.helperMethods.forEach(calcMethod);
        if (file.isClass) {
            stat.classes += 1;
        } else {
            stat.packages += 1;
        }
    });

    if (stat.codeLines) {
        stat.coverage = Math.round(100 * stat.codeLinesDocumented / stat.codeLines);
    }

    return stat;

    function calcMethod(method) {
        // for each method
        stat.totalMethods += 1;
        if (method.code) {
            lines = method.code.split(/\n/).length;
            stat.codeLines += lines;
        }
        if (method.doc) {
            stat.documentedMethods += 1;
            stat.codeLinesDocumented += lines;
        }
    }

};

