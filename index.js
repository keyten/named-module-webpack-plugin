const path = require('path');
const fs = require('fs');

function NamedModulePlugin(options){
    options = options || {};

    this.options = {
        test : options.test || /^[a-zA-Z0-9\-_]+$/,
        moduleDir : options.moduleDir || path.resolve(__dirname, 'src'),
        moduleTest : options.moduleTest || /\.js$/
    };
};

NamedModulePlugin.prototype = {
    apply : function(compiler) {
        const test = this.options.test;
        const map = this.getModulesMap();
        const paths = Object.values(map);

        compiler.hooks.normalModuleFactory.tap('NamedModulePlugin', nmf => {
            nmf.hooks.beforeResolve.tap('NamedModulePlugin', result => {
                if(!result){
                    return;
                }

                if(test.test(result.request) && map[result.request]){
                    result.request = map[result.request];
                }
            });

            nmf.hooks.parser.for('javascript/auto').tap('NamedModulePlugin', (parser, parserOptions) => {
                var oldParse = parser.parse;
                parser.parse = function(){
                    if(paths.indexOf(arguments[1].current.rawRequest) > -1){
                        arguments[0] = removeAsFromModuleCode(arguments[0]);
                    }
                    return oldParse.apply(this, arguments);
                };
            });
        });
    },

    getModulesMap : function(){
        const moduleTest = this.options.moduleTest;
        const map = {};

        function scanDir(dir){
            fs.readdirSync(dir).forEach(file => {
                const filePath = path.resolve(dir, file);
                if(fs.lstatSync(filePath).isDirectory()){
                    scanDir(filePath);
                } else {
                    if(moduleTest.test(filePath)){
                        const name = getModuleName(fs.readFileSync(filePath, 'utf-8'));
                        if(name){
                            map[name.name] = filePath;
                        }
                    }
                }
            });
        }

        scanDir(this.options.moduleDir);

        return map;
    }
};

// Note: 'as' should be a keyword here so don't define vars with this name
function getModuleName(code){
    const {strs, source} = prepareCode(code);
    let lineBreaks = 0;
    const parts = source.split(' as ');
    for(let i = 0; i < parts.length; i++){
        let part = parts[i];
        lineBreaks += (part.match(/\n/g) || {length: 0}).length
        let expIndex = part.lastIndexOf('export');
        if(expIndex > -1 && expIndex > part.lastIndexOf('import') && parts[i + 1]){
            return {
                name: strs[+parts[i + 1].match(/^\'@(\d+)\'/)[1]],
                strNum: lineBreaks
            };
        }
    }
    return null;
}

function removeAsFromModuleCode(source){
    const {strNum} = getModuleName(source);
    source = source.split('\n');
    source[strNum] = source[strNum].replace(/\s*as\s*\'[a-zA-Z0-9_\-]+\'/, '')
    return source.join('\n');
}

function prepareCode(source){
    const strs = [];
    let comment = null;
    let stringType = null;
    let string;
    let newSource = '';
    for(let i = 0; i < source.length; i++){
        let letter = source[i];
        if(comment){
            if(comment === 'one' && letter === '\n'){
                comment = null;
            } else if(comment === 'two' && letter === '/' && source[i - 1] === '*'){
                comment = null;
            }
            continue;
        }

        if(letter === '/' && source[i - 1] && source[i - 1] === '/'){
            comment = 'one';
        } else if(letter === '*' && source[i - 1] && source[i - 1] === '/'){
            comment = 'two';
        }

        if(!stringType){
            if((letter === "'" || letter === '"' || letter === '`') && source[i - 1] && source[i - 1] !== '\\'){
                stringType = letter;
                string = '';
            } else {
                newSource += letter;
            }
        } else {
            if(letter === stringType && source[i - 1] && source[i - 1] !== '\\'){
                stringType = null;
                newSource += `'@${strs.length}'`;
                strs.push(string);
            } else {
                string += letter;
            }
        }
    }

    return {
        source: newSource,
        strs
    };
}

module.exports = NamedModulePlugin;
