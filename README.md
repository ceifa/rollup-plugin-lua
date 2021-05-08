# rollup-plugin-lua [![npm package](https://img.shields.io/npm/v/rollup-plugin-lua.svg)](https://www.npmjs.com/package/rollup-plugin-lua)

Rollup plugin for Lua scripts.

## Installation

```bash
npm install --save-dev rollup-plugin-lua
```

## Usage

### rollup.config.js
```js
import { rollup } from 'rollup';
import lua from 'rollup-plugin-lua';

rollup({
	entry: 'src/app.js',
	plugins: [
		lua()
	]
});
```

### sum.lua
```lua
return function(x, y)
    return x + y
end
```

### app.js
```js
import run from './sum.lua';

const sum = await run();
console.log(sum(10, 10)); // 20
```