import {get,put} from './db';
import {safePath,revision,parseScene} from './core';
const TRASH='.excalidraw-manager-trash';
async function root(){const r=await get('root');if(!r)throw Error('Connect a folder first');if(await r.queryPermission({mode:'readwrite'})!=='granted')throw Error('Folder permission expired. Reconnect the folder.');return r as FileSystemDirectoryHandle;}
async function parent(path:string){const parts=safePath(path);const name=parts.pop()!;let dir=await root();for(const part of parts)dir=await dir.getDirectoryHandle(part);return {dir,name};}
async function read(path:string){const {dir,name}=await parent(path);const text=await (await (await dir.getFileHandle(name)).getFile()).text();return {text,revision:await revision(text)};}
async function absent(path:string){try{const {dir,name}=await parent(path);await dir.getFileHandle(name);throw Error('Destination already exists');}catch(e:any){if(e.name!=='NotFoundError')throw e;}}
async function write(path:string,text:string){parseScene(text);const {dir,name}=await parent(path);const f=await dir.getFileHandle(name,{create:true});const w=await f.createWritable();try{await w.write(text);await w.close();}catch(e){await w.abort().catch(()=>{});throw e;}return read(path);}
async function single(){const tabs=await chrome.tabs.query({url:'https://excalidraw.com/*'});if(tabs.length>1)throw Error('Multiple Excalidraw tabs: close the other tabs, then reconcile before saving.');}
async function handle(m:any,s:chrome.runtime.MessageSender){if(s.id!==chrome.runtime.id)throw Error('Unauthorized');if(m.op==='setup'){await chrome.tabs.create({url:chrome.runtime.getURL('setup.html')});return {};}
if(m.op==='status'){const r=await root();const tabs=await chrome.tabs.query({url:'https://excalidraw.com/*'});return {name:r.name,multiple:tabs.length>1};}
if(m.op==='draft'){await single();await put('draft:'+m.path,m.scene);return {};}
if(m.op==='recover')return {scene:await get('draft:'+m.path)};
if(m.op==='list'){const paths:string[]=[];async function walk(d:FileSystemDirectoryHandle,p=''){for await(const [name,h] of (d as any).entries()){if(name===TRASH&&!m.trash)continue;const next=p+name;if(h.kind==='directory')await walk(h,next+'/');else if(name.endsWith('.excalidraw')&&(!m.trash||next.startsWith(TRASH+'/')))paths.push(next);}}await walk(await root());return {paths:paths.sort()};}
if(m.op==='read')return read(m.path);
await single();
if(m.op==='mkdir'){const {dir,name}=await parent(m.path);await dir.getDirectoryHandle(name,{create:true});return {};}
if(m.op==='save'){const old=await read(m.path);if(old.revision!==m.revision) return {conflict:true,...old};return write(m.path,m.text);}
if(m.op==='create'){await absent(m.path);return write(m.path,m.text);}
if(['move','copy','trash'].includes(m.op)){const old=await read(m.path);if(m.revision&&m.revision!==old.revision)throw Error('File changed on disk. Refresh before moving it.');let target=m.target;if(m.op==='trash'){const r=await root();await r.getDirectoryHandle(TRASH,{create:true});target=TRASH+'/'+Date.now()+'__'+encodeURIComponent(m.path)+'.excalidraw';}await absent(target);const saved=await write(target,old.text);if(saved.revision!==old.revision)throw Error('Copy verification failed; source retained');if(m.op!=='copy'){if((await read(m.path)).revision!==old.revision)throw Error('Source changed; both copies retained');const {dir,name}=await parent(m.path);await dir.removeEntry(name);}return {target,...saved};}throw Error('Unknown operation');}
let queue=Promise.resolve();
chrome.runtime.onMessage.addListener((m,s,respond)=>{queue=queue.then(async()=>{try{respond({ok:true,...await handle(m,s)});}catch(e){respond({ok:false,error:String(e)});}});return true;});
chrome.action.onClicked.addListener(async()=>{const tabs=await chrome.tabs.query({url:'https://excalidraw.com/*'});if(tabs[0]?.id)await chrome.tabs.update(tabs[0].id,{active:true});else await chrome.tabs.create({url:'https://excalidraw.com'});});
