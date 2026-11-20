// @vitest-environment jsdom
import {beforeEach,it,expect,vi} from 'vitest';
import {chooseCanvasAction} from '../src/canvas-dialog';
let root:ShadowRoot;
beforeEach(()=>{
 document.body.innerHTML='<div id="host"></div>';
 root=document.getElementById('host')!.attachShadow({mode:'open'});
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
});
it('discards with one button and no typed confirmation',async()=>{
 const prompt=vi.spyOn(window,'prompt');
 const result=chooseCanvasAction(root);
 (root.querySelector('[data-action="discard"]') as HTMLButtonElement).click();
 expect(await result).toEqual({action:'discard'});
 expect(root.querySelector('dialog')).toBeNull();expect(prompt).not.toHaveBeenCalled();
 prompt.mockRestore();
});
it('returns the filename only when Save is selected',async()=>{
 const result=chooseCanvasAction(root);
 root.querySelector('input')!.value='designs/new drawing';
 root.querySelector('form')!.dispatchEvent(new Event('submit',{cancelable:true}));
 expect(await result).toEqual({action:'save',name:'designs/new drawing'});
});
it.each(['button','escape'])('cancels without replacing the canvas: %s',async(method)=>{
 const result=chooseCanvasAction(root);
 if(method==='button')(root.querySelector('[data-action="cancel"]') as HTMLButtonElement).click();
 else root.querySelector('dialog')!.dispatchEvent(new Event('cancel',{cancelable:true}));
 expect(await result).toEqual({action:'cancel'});
 expect(root.querySelector('dialog')).toBeNull();
});
