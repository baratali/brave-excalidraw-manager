// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {act} from 'react';
import {webcrypto} from 'node:crypto';
import {emptyScene,revision} from '../src/core';

const realImmediate=setImmediate;
it.each(['poll','session'])('updates recovery after an external edit loaded through %s',async(mode)=>{
 vi.resetModules();vi.useFakeTimers();
 vi.stubGlobal('crypto',webcrypto);
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}});
 document.body.innerHTML='<div id="root"></div>';sessionStorage.clear();localStorage.clear();
 const original=emptyScene(),external={...original,appState:{viewBackgroundColor:'#123456'}};
 let canvas=original,disk=mode==='session'?external:original;
 const drafts=new Map([['a.excalidraw',original]]);
 if(mode==='session'){
  const hash=await revision(JSON.stringify(original));
  sessionStorage.setItem('excalidraw-manager-active',JSON.stringify({path:'a.excalidraw',workspaceId:'workspace',base:'original',currentHash:hash,savedHash:hash}));
 }
 const sendMessage=vi.fn(async(m:any)=>{
  if(m.op==='status')return {ok:true,name:'drawings',workspaceId:'workspace',multiple:false};
  if(m.op==='list')return {ok:true,paths:['a.excalidraw','b.excalidraw']};
  if(m.op==='read')return {ok:true,text:JSON.stringify(m.path==='a.excalidraw'?disk:original),revision:m.path==='a.excalidraw'&&disk===external?'external':'original'};
  if(m.op==='draft'){drafts.set(m.path,m.scene);return {ok:true};}
  if(m.op==='recover')return {ok:true,scene:drafts.get(m.path)};
  return {ok:true};
 });
 vi.stubGlobal('chrome',{runtime:{sendMessage}});
 const originalAdd=window.addEventListener.bind(window),listeners:Array<[any,any,any]>=[];
 vi.spyOn(window,'addEventListener').mockImplementation((type:any,listener:any,options:any)=>{listeners.push([type,listener,options]);originalAdd(type,listener,options);});
 vi.spyOn(window,'postMessage').mockImplementation((m:any)=>{
  if(m.channel==='excalidraw-manager-command'){
   if(m.kind==='load')canvas=m.data;
   queueMicrotask(()=>window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{channel:'excalidraw-manager-editor',kind:'reply',id:m.id,scene:canvas,collaboration:false}})));
  }
 });
 const flush=async()=>{for(let i=0;i<50;i++)await new Promise(r=>realImmediate(r));};
 try{
  await act(async()=>{await import('../src/content');await flush();});
  const shadow=document.getElementById('excalidraw-folder-manager')!.shadowRoot!;
  const click=async(label:string)=>act(async()=>{const button=Array.from(shadow.querySelectorAll('button')).find(b=>b.textContent===label);expect(button).toBeTruthy();button!.click();await flush();});
  if(mode==='poll'){
   await click('a.excalidraw');
   disk=external;
   await act(async()=>{window.dispatchEvent(new Event('focus'));await flush();});
  }
  expect(canvas).toEqual(external);
  expect(shadow.querySelector('[role="status"]')!.textContent).toBe('Reloaded from disk');
  expect(drafts.get('a.excalidraw')).toEqual(external);
  await click('b.excalidraw');
  await click('a.excalidraw');
  expect(shadow.querySelector('dialog')).toBeNull();
  expect(shadow.querySelector('strong')!.textContent).toBe('a.excalidraw');
  expect(canvas).toEqual(external);
  expect(sendMessage.mock.calls.some(([m])=>m.op==='save')).toBe(false);
 }finally{
  for(const [type,listener,options]of listeners)window.removeEventListener(type,listener,options);
  vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();
 }
});
