import { rollup } from 'rollup';
import lua from '../src/index.js';

rollup({
    input: 'test/stubs/main.lua',
    plugins: [lua()]
})
    .then(result => result.generate({}))
    .then(({ output: [{ code }] }) => {
        console.log(code)
    })