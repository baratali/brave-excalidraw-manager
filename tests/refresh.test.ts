// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {act} from 'react';
import {webcrypto} from 'node:crypto';
import {emptyScene,revision} from '../src/core';

const realImmediate=setImmediate;
it.each(['saved','unsaved','conflict','other canvas','other folder','missing file','loading','disk changed','legacy'])('refresh: %s',async(mode)=>{
 vi.resetModules();vi.useFakeTimers();
 vi.stubGlobal('crypto',webcrypto);
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 (globalThis as any).ResizeObserver=class {observe(){} disconnect(){}};
 document.body.innerHTML='<div id="root"></div>';sessionStorage.clear();localStorage.clear();
 const stored={...emptyScene(),elements:[{id:'a',type:'rectangle',x:1}]};
 const edited={...stored,elements:[{id:'a',type:'rectangle',x:2}]};
 let canvas=['unsaved','conflict'].includes(mode)?edited:mode==='other canvas'?{...stored,elements:[{id:'different',type:'ellipse'}]}:stored;
 const hash=await revision(JSON.stringify(stored));
 sessionStorage.setItem('excalidraw-manager-active',JSON.stringify({path:'a.excalidraw',workspaceId:'workspace-a',base:'original',currentHash:await revision(JSON.stringify(['unsaved','conflict'].includes(mode)?edited:stored)),savedHash:hash}));
 if(mode==='legacy')sessionStorage.clear();
 const disk=JSON.stringify(mode==='disk changed'?{...stored,elements:[{id:'a',type:'rectangle',x:3}]}:stored);
 const sendMessage=vi.fn(async(m:any)=>{
  if(m.op==='status')return {ok:true,name:'drawings',workspaceId:mode==='other folder'?'workspace-b':'workspace-a',multiple:false};
  if(m.op==='list')return {ok:true,paths:['a.excalidraw','b.excalidraw']};
  if(m.op==='read')return mode==='missing file'?{ok:false,error:'File not found'}:{ok:true,text:disk,revision:['conflict','disk changed'].includes(mode)?'external':'original'};
  if(m.op==='save')return {ok:true,text:m.text,revision:'saved'};
  return {ok:true};
 });
 vi.stubGlobal('chrome',{runtime:{sendMessage}});
 const notify=(data:any)=>window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{channel:'excalidraw-manager-editor',...data}}));
 const originalAdd=window.addEventListener.bind(window),listeners:Array<[any,any,any]>=[];
 vi.spyOn(window,'addEventListener').mockImplementation((type:any,listener:any,options:any)=>{listeners.push([type,listener,options]);originalAdd(type,listener,options);});
 vi.spyOn(window,'postMessage').mockImplementation((m:any)=>{if(m.channel==='excalidraw-manager-command'){if(m.kind==='load')canvas=m.data;queueMicrotask(()=>notify({kind:'reply',id:m.id,scene:canvas,collaboration:false,loading:mode==='loading'}));}});
 const prompt=vi.spyOn(window,'prompt').mockReturnValue(null);
 const flush=async()=>{for(let i=0;i<100;i++)await new Promise(r=>realImmediate(r));};
 await act(async()=>{await import('../src/content');await flush();});
 const shadow=document.getElementById('excalidraw-folder-manager')!.shadowRoot!;
 const label=()=>shadow.querySelector('[role="status"]')!.textContent;
 if(['saved','unsaved','conflict','disk changed'].includes(mode)){
  expect(shadow.querySelector('strong')?.textContent).toBe('a.excalidraw');
  expect(label()).toBe(mode==='disk changed'?'Reloaded from disk':mode==='saved'?'Saved':mode==='unsaved'?'Unsaved changes restored — click Save to sync':'Conflict: disk and restored browser drawing have changed');
 }else{expect(shadow.querySelector('strong')).toBeNull();}
 expect(prompt).not.toHaveBeenCalled();expect(sendMessage.mock.calls.some(([m])=>m.op==='save')).toBe(false);
 if(mode==='legacy'){
  const button=Array.from(shadow.querySelectorAll('button')).find(b=>b.textContent==='a.excalidraw')!;
  await act(async()=>{button.click();await flush();});
  expect(prompt).not.toHaveBeenCalled();expect(shadow.querySelector('strong')?.textContent).toBe('a.excalidraw');
 }
 if(mode==='saved'){
  const button=Array.from(shadow.querySelectorAll('button')).find(b=>b.textContent==='b.excalidraw')!;
  await act(async()=>{button.click();await flush();});
  expect(prompt).not.toHaveBeenCalled();expect(shadow.querySelector('strong')?.textContent).toBe('b.excalidraw');
 }
 for(const [type,listener,options]of listeners)window.removeEventListener(type,listener,options);
 vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();
});
