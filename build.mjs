import {build} from 'esbuild';
import {cp,mkdir} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
for(const name of ['worker','bridge','content','setup']) await build({entryPoints:[`src/${name}.${name==='content'?'tsx':'ts'}`],outfile:`dist/${name}.js`,bundle:true,format:name==='worker'?'esm':'iife',target:'chrome120',define:{'process.env.NODE_ENV':'"production"'}});
