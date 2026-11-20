// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {act} from 'react';
import {emptyScene} from '../src/core';

it('ignores stale disk checks after deletion and skips checks while moving to trash',async()=>{
 vi.useFakeTimers();
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}});
 document.body.innerHTML='<div id="root"></div>';sessionStorage.clear();localStorage.clear();
 const canvas=emptyScene();
 let deleted=false,delayRead=false,finishRead:((value:any)=>void)|undefined,finishTrash:((value:any)=>void)|undefined;
 const sendMessage=vi.fn(async(m:any)=>{
  if(m.op==='status')return {ok:true,name:'drawings',workspaceId:'workspace',multiple:false};
  if(m.op==='list')return {ok:true,paths:deleted?[]:['test.excalidraw']};
  if(m.op==='read'){
   if(delayRead)return new Promise(resolve=>{finishRead=resolve;});
   return {ok:true,text:JSON.stringify(canvas),revision:'r1'};
  }
  if(m.op==='trash')return new Promise(resolve=>{finishTrash=()=>{deleted=true;resolve({ok:true});};});
  return {ok:true};
 });
 vi.stubGlobal('chrome',{runtime:{sendMessage}});
 const originalAdd=window.addEventListener.bind(window),listeners:Array<[any,any,any]>=[];
 vi.spyOn(window,'addEventListener').mockImplementation((type:any,listener:any,options:any)=>{listeners.push([type,listener,options]);originalAdd(type,listener,options);});
 vi.spyOn(window,'confirm').mockReturnValue(true);
 vi.spyOn(window,'postMessage').mockImplementation((m:any)=>{
  if(m.channel==='excalidraw-manager-command')queueMicrotask(()=>window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{channel:'excalidraw-manager-editor',kind:'reply',id:m.id,scene:canvas,collaboration:false}})));
 });
 const flush=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
 try{
  await act(async()=>{await import('../src/content');await flush();});
  const shadow=document.getElementById('excalidraw-folder-manager')!.shadowRoot!;
  const buttons=()=>Array.from(shadow.querySelectorAll('button'));
  const click=async(label:string)=>act(async()=>{const button=buttons().find(b=>b.textContent===label);expect(button).toBeTruthy();button!.click();await flush();});
  await click('test.excalidraw');
  delayRead=true;
  await act(async()=>{window.dispatchEvent(new Event('focus'));await flush();});
  expect(finishRead).toBeTypeOf('function');
  await click('Delete');
  expect(finishTrash).toBeTypeOf('function');
  const reads=sendMessage.mock.calls.filter(([m])=>m.op==='read').length;
  await act(async()=>{await vi.advanceTimersByTimeAsync(2100);await flush();});
  expect(sendMessage.mock.calls.filter(([m])=>m.op==='read')).toHaveLength(reads);
  await act(async()=>{finishTrash!({});await flush();finishRead!({ok:false,error:'File not found'});await flush();});
  expect(shadow.querySelector('strong')).toBeNull();
  expect(shadow.querySelector('[role="status"]')!.textContent).toBe('Moved to trash; canvas retained');
  expect(buttons().some(b=>b.textContent==='Reconcile / resume')).toBe(false);
  expect(buttons().find(b=>b.textContent==='+ Drawing')!.disabled).toBe(false);
  expect(sessionStorage.getItem('excalidraw-manager-active')).toBeNull();
 }finally{
  for(const [type,listener,options]of listeners)window.removeEventListener(type,listener,options);
  vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();
 }
});
