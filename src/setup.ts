import {put} from './db';
document.querySelector('#connect')!.addEventListener('click',async()=>{try {const root=await (window as any).showDirectoryPicker({mode:'readwrite'});await put('root',root);document.querySelector('#status')!.textContent=`Connected ${root.name}. Return to Excalidraw.`;}catch(e){document.querySelector('#status')!.textContent=String(e);}});
