export type CanvasChoice = {action:'save';name:string}|{action:'discard'|'cancel'};

export type RecoveryChoice = 'restore'|'discard'|'cancel';

export function chooseRecoveryAction(root:ShadowRoot):Promise<RecoveryChoice> {
  return new Promise(resolve=>{
    const previous=root.activeElement as HTMLElement|null;
    const dialog=document.createElement('dialog');
    dialog.className='canvas-dialog';
    dialog.setAttribute('aria-labelledby','recovery-dialog-title');
    dialog.setAttribute('aria-describedby','recovery-dialog-description');
    dialog.innerHTML=`<h2 id="recovery-dialog-title">Restore recovery draft?</h2>
      <p id="recovery-dialog-description">A recovery draft exists for this drawing. Restore it instead of the disk version?</p>
      <div class="tools"><button type="button" data-action="restore">Restore</button><button type="button" data-action="discard">Discard</button><button type="button" data-action="cancel" autofocus>Cancel</button></div>`;
    const finish=(choice:RecoveryChoice)=>{dialog.close();dialog.remove();previous?.focus();resolve(choice);};
    for(const action of ['restore','discard','cancel'] as const){
      dialog.querySelector(`[data-action="${action}"]`)!.addEventListener('click',()=>finish(action));
    }
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish('cancel');});
    dialog.addEventListener('keydown',event=>event.stopPropagation());
    root.append(dialog);
    dialog.showModal();
  });
}

export function chooseCanvasAction(root:ShadowRoot):Promise<CanvasChoice> {
  return new Promise(resolve=>{
    const previous=root.activeElement as HTMLElement|null;
    const dialog=document.createElement('dialog');
    dialog.className='canvas-dialog';
    dialog.setAttribute('aria-labelledby','canvas-dialog-title');
    dialog.setAttribute('aria-describedby','canvas-dialog-description');
    dialog.innerHTML=`<form>
      <h2 id="canvas-dialog-title">Save current drawing?</h2>
      <p id="canvas-dialog-description">Save your current canvas as a new file before opening another drawing.</p>
      <label>New filename<input name="filename" value="Untitled.excalidraw" required aria-label="New filename"></label>
      <div class="tools"><button type="button" data-action="cancel" autofocus>Cancel</button><button type="button" data-action="discard">Discard</button><button type="submit">Save</button></div>
    </form>`;
    const finish=(choice:CanvasChoice)=>{dialog.close();dialog.remove();previous?.focus();resolve(choice);};
    dialog.querySelector('[data-action="cancel"]')!.addEventListener('click',()=>finish({action:'cancel'}));
    dialog.querySelector('[data-action="discard"]')!.addEventListener('click',()=>finish({action:'discard'}));
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish({action:'cancel'});});
    dialog.addEventListener('keydown',event=>event.stopPropagation());
    dialog.querySelector('form')!.addEventListener('submit',event=>{
      event.preventDefault();
      const input=dialog.querySelector('input')!;
      if(!input.value.trim()){input.setCustomValidity('Enter a filename.');input.reportValidity();return;}
      finish({action:'save',name:input.value.trim()});
    });
    dialog.querySelector('input')!.addEventListener('input',event=>(event.target as HTMLInputElement).setCustomValidity(''));
    root.append(dialog);
    dialog.showModal();
  });
}
