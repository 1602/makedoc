## About

Super-tiny, not pretending to be complete static html documentation generator. As a result you will get [something like this](http://1602.github.com/jugglingdb/abstract-class.html)

## Installation

    npm install makedoc -g

## Usage

    makedoc path/to/your/code.js path/to/another/file.js

will create `./doc/code.html` and `./doc/file.html`

You also can specify title of page using `-t` option.

## How my code should look like?

Absolutely situable question. First of all it should be zero-indented:

```
/**
 * Method description
 * @param {String} someArgument - some awesome argument
 */
function someMethod(someArgument) {
    console.log(someArgument);
}
```

will work, but

```
(function () {
    /**
     * Method description
     * @param {String} someArgument - some awesome argument
     */
    function someMethod(someArgument) {
        console.log(someArgument);
    }
})();

would not. Why? Because I'm too lazy, and 80% of my code met this requirement, rest of code (20%)... Hmmm. I don't like this code, I think it should be rewritten to be more flat, more clean, more obvious.

Another requirement: file should contain some documented Constructor: function with name started with capital letter. Only **one** constructor per file!

## How does it work?

makedoc looking for `/**` started comment, then wait for `*/` and check next line, if it ends with `{`, grab all following lines unless `\n}`. That's it.

This input information allows us to get split methods to three kinds:

- class methods (`SomeClass.someMethod = function someMethod() {`)
- instance methods (`SomeClass.prototype.someMethod = function someMethod() {`)
- helper methods (`function someMethod() {`)

## MIT License

    Copyright (C) 2011 by Anatoliy Chakkaev
    
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.

