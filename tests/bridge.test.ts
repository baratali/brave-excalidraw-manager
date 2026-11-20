// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {emptyScene} from '../src/core';

it('preserves drawing styles across file switches while resetting document state and history',async()=>{
 vi.useFakeTimers();
 document.body.innerHTML='<div class="excalidraw"></div>';
 const preferences={
  currentItemStrokeColor:'#c92a2a',currentItemBackgroundColor:'#ffec99',
  currentItemFillStyle:'solid',currentItemStrokeWidth:4,currentItemStrokeStyle:'dashed',
  currentItemRoughness:0,currentItemOpacity:70,currentItemRoundness:{type:3},
  currentItemStartArrowhead:'dot',currentItemEndArrowhead:'arrow',
  currentItemFontFamily:3,currentItemFontSize:28,currentItemTextAlign:'center',
 };
 let state:any={...preferences,selectedElementIds:{old:true},editingTextElement:{id:'old'},fileHandle:{name:'old'},viewBackgroundColor:'#aaa'};
 let elements:any[]=[];
 let files:any={};
 const history={clear:vi.fn()};
 const api={
  getAppState:()=>state,getSceneElements:()=>elements,getFiles:()=>files,
  onChange:vi.fn(),history,
  resetScene:vi.fn(()=>{state={selectedElementIds:{},editingTextElement:null};elements=[];files={};}),
  addFiles:(entries:any[])=>{files=Object.fromEntries(entries.map(f=>[f.id,f]));},
  updateScene:({elements:next,appState}:any)=>{elements=next;state={...state,...appState};},
 };
 (document.querySelector('.excalidraw') as any).__reactFiber$test={stateNode:{api,props:{}}};
 const messages:any[]=[];
 vi.spyOn(window,'postMessage').mockImplementation((m:any)=>{messages.push(m);});
 await import('../src/bridge');
 await vi.advanceTimersByTimeAsync(1000);
 const load=async(id:number,appState:any)=>{
  window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{channel:'excalidraw-manager-command',id,kind:'load',data:{...emptyScene(),appState}}}));
  await vi.advanceTimersByTimeAsync(100);
  expect(messages.find(m=>m.id===id)?.error).toBeUndefined();
  expect(messages.find(m=>m.id===id)?.scene).toBeTruthy();
 };
 await load(1,{viewBackgroundColor:'#fff',gridSize:20,currentItemFontSize:12});
 expect(state).toMatchObject({...preferences,viewBackgroundColor:'#fff',gridSize:20,fileHandle:null});
 expect(state.selectedElementIds).toEqual({});
 expect(state.editingTextElement).toBeNull();
 expect(messages.find(m=>m.id===1).scene.appState.currentItemFontSize).toBeUndefined();
 // Updated styles carry forward to the next file, rather than restoring an earlier snapshot.
 state.currentItemFontSize=36;state.currentItemStrokeColor='#1971c2';
 await load(2,{viewBackgroundColor:'#000'});
 expect(state).toMatchObject({...preferences,currentItemFontSize:36,currentItemStrokeColor:'#1971c2',viewBackgroundColor:'#000'});
 expect(api.resetScene).toHaveBeenCalledTimes(2);
 expect(history.clear).toHaveBeenCalledTimes(2);
 vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();
});
