// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {act} from 'react';
import {emptyScene} from '../src/core';

it('keeps Saved after unchanged editor events, while preserving real edits during a write',async()=>{
 vi.useFakeTimers();
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 (globalThis as any).ResizeObserver=class {observe(){} disconnect(){}};
 document.body.innerHTML='<div id="root"></div>';
 let disk=JSON.stringify(emptyScene()),rev='r1',writes=0;
 let holdWrite:((r:any)=>void)|undefined;
 let delayWrite=false;
 (globalThis as any).chrome={runtime:{sendMessage:vi.fn(async(m:any)=>{
  if(m.op==='status')return {ok:true,name:'drawings',multiple:false};
  if(m.op==='list')return {ok:true,paths:['test.excalidraw']};
  if(m.op==='read')return {ok:true,text:disk,revision:rev};
  if(m.op==='save'){writes++;disk=m.text;rev='r'+(writes+1);if(delayWrite)return new Promise(resolve=>{holdWrite=()=>resolve({ok:true,text:disk,revision:rev});});return {ok:true,text:disk,revision:rev};}
  return {ok:true};
 })}};
 let canvas=emptyScene();
 const notify=(kind:string,data:any={})=>window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{channel:'excalidraw-manager-editor',kind,...data}}));
 vi.spyOn(window,'postMessage').mockImplementation((m:any)=>{if(m.channel==='excalidraw-manager-command'){if(m.kind==='load')canvas=m.data;queueMicrotask(()=>notify('reply',{id:m.id,scene:canvas,collaboration:false}));}});
 const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
 await act(async()=>{await import('../src/content');await flush();});
 const shadow=document.getElementById('excalidraw-folder-manager')!.shadowRoot!;
 const click=async(label:string)=>{await act(async()=>{const button=Array.from(shadow.querySelectorAll('button')).find(b=>b.textContent===label)!;expect(button).toBeTruthy();button.click();await flush();});};
 const status=()=>shadow.querySelector('[role="status"]')!.textContent;
 await click('test.excalidraw');
 expect(status()).toBe('Saved');
 // Selection/focus/render notifications with identical persisted contents must not mark dirty.
 await act(async()=>{notify('change',{scene:structuredClone(canvas)});await flush();});
 expect(status()).toBe('Saved');
 await click('Save');expect(status()).toBe('Saved');expect(writes).toBe(0);
 canvas={...canvas,appState:{viewBackgroundColor:'#123456'}};
 await act(async()=>{notify('change',{scene:canvas});await flush();});
 expect(status()).toBe('Unsaved changes');
 await click('Save');expect(status()).toBe('Saved');expect(writes).toBe(1);
 await act(async()=>{notify('change',{scene:structuredClone(canvas)});await vi.advanceTimersByTimeAsync(800);});
 expect(status()).toBe('Saved');expect(writes).toBe(1);
 // A save acknowledges the submitted snapshot, not a newer edit that arrived in flight.
 delayWrite=true;canvas={...canvas,appState:{viewBackgroundColor:'#222222'}};
 await act(async()=>{notify('change',{scene:canvas});await flush();});
 await click('Save');expect(status()).toBe('Saving…');
 canvas={...canvas,appState:{viewBackgroundColor:'#333333'}};
 await act(async()=>{notify('change',{scene:canvas});holdWrite!({});await flush();});
 expect(status()).toBe('Unsaved changes');
 delayWrite=false;
 await act(async()=>{await vi.advanceTimersByTimeAsync(800);await flush();});
 expect(status()).toBe('Saved');expect(JSON.parse(disk).appState.viewBackgroundColor).toBe('#333333');
 vi.useRealTimers();
});
