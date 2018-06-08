# named-module-webpack-plugin

It allows you to use modules with names. For example:

**src/button/button.js**
```js
function Button(){}

export default Button as 'button';
```

**src/button/root.js**
```js
import Button from 'button';

// ...
```

*Note: if there's no module with name 'button' then it will process it as before (look for it in node_modules and so on).*

## How to install:
Just include it into your webpack config:
```js
plugins: [
    new NamedModulePlugin()
]
```

You can also use some options:
```js
plugins: [
    new NamedModulePlugin({
        test: /^@[a-zA-Z0-9]+$/,
        moduleDir: './components/',
        moduleTest: /\.(js|jsx)/
    })
]
```

### Options
#### `test`
What names for modules to use. For example if you wanna name all your modules like `@moduleName`, then set it to `/^@[a-zA-Z0-9]+$/` as in example above.

It may prevent you from overriding modules from node_modules.

By default: `/^[a-zA-Z0-9\-_]+$/`.

#### `moduleDir`
The folder with all your modules.

*Note: it will read all your files and dirs deeply each time so don't set it to `'/'`.*

#### `moduleTest`
What files in your modules dir are modules.

By default: `/\.js$/`.
