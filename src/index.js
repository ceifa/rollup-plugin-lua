import { parse } from 'luaparse';
import { readFile, stat } from 'fs/promises';
import { resolve, relative, dirname } from 'path';

const isRequireCall = (node) => {
    return node.type.endsWith('CallExpression')
        && node.base.type === 'Identifier'
        && node.base.name === 'require';
}

const populateRequiredModules = async (currentFile, node, requiredModules) => {
    if (isRequireCall(node)) {
        const argument = node.arguments[0];
        if (argument.type === 'StringLiteral') {
            const module = argument.raw.substr(1, argument.raw.length - 2);
            const files = [resolve(dirname(currentFile), module + '.lua'), resolve(dirname(currentFile), module, 'init.lua')];


            for (const file of files) {
                if (requiredModules[file]) {
                    return;
                }

                let exists = false;
                try {
                    if (await stat(file)) {
                        exists = true;
                    }
                } catch { }

                if (exists) {
                    const luaCode = await readFile(file, { encoding: 'utf-8' });
                    requiredModules[file] = luaCode;
                    const initialNode = parse(luaCode, { comments: false });

                    await populateRequiredModules(file, initialNode, requiredModules);
                }
            }
        }

        return;
    }

    for (const property of Object.values(node)) {
        if (property && typeof property === 'object') {
            if (property instanceof Array) {
                if (property.length > 0 && property[0].type) {
                    for (let i = property.length - 1; i >= 0; i--) {
                        await populateRequiredModules(currentFile, property[i], requiredModules);
                    }
                }
            } else if (property.type) {
                await populateRequiredModules(currentFile, property, requiredModules);
            }
        }
    }
};

export default function (option = {}) {
    return {
        name: 'lua',
        async load(id) {
            if (id.endsWith('.lua')) {
                const luaCode = await readFile(id, { encoding: 'utf-8' });
                const initialNode = parse(luaCode, { comments: false });

                const modules = { [id]: luaCode };
                await populateRequiredModules(id, initialNode, modules);

                let code = `
                    import { LuaFactory } from 'wasmoon';

                    let factory = undefined, engine = undefined;

                    export const getFactory = () => {
                        if (!factory) {
                            factory = new LuaFactory();
                        }
                        
                        return factory;
                    };

                    export const getEngine = async () => {
                        if (!engine) {
                            engine = await getFactory().createEngine();;                            
                        }

                        return engine;
                    };

                    export default async (engine, ...args) => {
                        engine = engine || await getEngine();

                        engine.doStringSync('table.remove(package.searchers, 3)');
                        engine.doStringSync('table.remove(package.searchers, 3)');
                        engine.doStringSync('package.path = [[./?.lua;./?/init.lua]]');
                        
                        if (args.length) {
                            engine.global.set('arg', args);
                        }

                        ${Object.entries(modules)
                        .map(([k, v]) => `getFactory().mountFileSync(\`${relative(dirname(id), k)}\`, \`${v.replace(/`/g, '\\`')}\`)`)
                        .join(';\n')}

                        return engine.doFileSync(\`${relative(dirname(id), id)}\`);
                    };
                `;

                return code;
            }
            return null;
        },
    }
}