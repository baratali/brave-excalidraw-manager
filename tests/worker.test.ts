import {beforeAll,beforeEach,it,expect,vi} from 'vitest';
import {emptyScene} from '../src/core';
const state=vi.hoisted(()=>({data:new Map<string,any>()}));
vi.mock('../src/db',()=>({get:async(k:string)=>state.data.get(k),put:async(k:string,v:any)=>{state.data.set(k,v);}}));
let receive:any;let multiple=false;
class Directory {
 name='test';permission='granted';entriesMap=new Map<string,any>();
 async queryPermission(){return this.permission;}
 async getDirectoryHandle(n:string,o:any={}){if(!this.entriesMap.has(n)){if(!o.create)throw new DOMException('missing','NotFoundError');this.entriesMap.set(n,new Directory());}return this.entriesMap.get(n);}
 async getFileHandle(n:string,o:any={}){if(!this.entriesMap.has(n)){if(!o.create)throw new DOMException('missing','NotFoundError');this.entriesMap.set(n,new FileHandle());}return this.entriesMap.get(n);}
 async removeEntry(n:string){this.entriesMap.delete(n);}
 async *entries(){for(const [n,v]of this.entriesMap)yield [n,v];}
 kind='directory';
}
class FileHandle {kind='file';text='';fail=false;async getFile(){return {text:async()=>this.text};}async createWritable(){let next='';return {write:async(t:string)=>{if(this.fail)throw Error('disk full');next=t;},close:async()=>{this.text=next;},abort:async()=>{}};}}
let root:Directory;
async function rpc(op:string,data:any={}){return new Promise<any>(resolve=>receive({op,...data},{id:'test'},resolve));}
beforeAll(async()=>{(globalThis as any).chrome={runtime:{id:'test',onMessage:{addListener:(f:any)=>receive=f}},tabs:{query:async()=>multiple?[{},{}]:[{}]},action:{onClicked:{addListener:()=>{}}}};await import('../src/worker');});
beforeEach(()=>{root=new Directory();multiple=false;state.data.clear();state.data.set('root',root);});
const text=()=>JSON.stringify(emptyScene());
it('creates, reads, and detects external revisions',async()=>{const a=await rpc('create',{path:'a.excalidraw',text:text()});expect(a.ok).toBe(true);const f=await root.getFileHandle('a.excalidraw');f.text=JSON.stringify({...emptyScene(),appState:{gridSize:42}});const r=await rpc('save',{path:'a.excalidraw',revision:a.revision,text:text()});expect(r.conflict).toBe(true);expect(f.text).not.toBe(text());});
it('rejects destination collisions without changing the source',async()=>{await rpc('create',{path:'a.excalidraw',text:text()});await rpc('create',{path:'b.excalidraw',text:text()});const r=await rpc('move',{path:'a.excalidraw',target:'b.excalidraw'});expect(r.ok).toBe(false);expect(root.entriesMap.has('a.excalidraw')).toBe(true);});
it('moves through verified copies and restores trash',async()=>{await rpc('create',{path:'a.excalidraw',text:text()});const t=await rpc('trash',{path:'a.excalidraw'});expect(t.ok).toBe(true);expect(root.entriesMap.has('a.excalidraw')).toBe(false);expect((await rpc('list')).paths).toEqual([]);expect((await rpc('list',{trash:true})).paths).toEqual([t.target]);expect((await rpc('move',{path:t.target,target:'a.excalidraw'})).ok).toBe(true);});
it('blocks writes and recovery replacement with multiple tabs',async()=>{await rpc('create',{path:'a.excalidraw',text:text()});multiple=true;expect((await rpc('draft',{path:'a.excalidraw',scene:emptyScene()})).ok).toBe(false);expect((await rpc('create',{path:'b.excalidraw',text:text()})).ok).toBe(false);});
it('retains original after write failure',async()=>{await rpc('create',{path:'a.excalidraw',text:text()});const f=await root.getFileHandle('a.excalidraw');f.fail=true;const r=await rpc('save',{path:'a.excalidraw',text:text(),revision:(await rpc('read',{path:'a.excalidraw'})).revision});expect(r.ok).toBe(false);expect(f.text).toBe(text());});
it('reports revoked permissions',async()=>{root.permission='denied';expect((await rpc('read',{path:'a.excalidraw'})).error).toContain('Reconnect');});
it('creates folders and recursively lists drawings',async()=>{await rpc('mkdir',{path:'nested'});await rpc('create',{path:'nested/a.excalidraw',text:text()});expect((await rpc('list')).paths).toEqual(['nested/a.excalidraw']);});
