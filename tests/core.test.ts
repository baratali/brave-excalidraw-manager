import {it,expect} from 'vitest';
import {parseScene,scene,safePath,revision} from '../src/core';
it('rejects invalid drawings',()=>{expect(()=>parseScene('{"type":"other","elements":[]}')).toThrow();});
it('retains images and metadata while filtering transient state',()=>{const s=scene([{id:'a',type:'image',fileId:'i',customData:{x:1}},{id:'b',isDeleted:true}],{viewBackgroundColor:'#fff',selectedElementIds:{a:true}},{i:{dataURL:'data:image/png;base64,AA'},unused:{}});expect(parseScene(JSON.stringify(s))).toEqual(s);expect(Object.keys(s.files)).toEqual(['i']);expect(s.appState.selectedElementIds).toBeUndefined();expect(s.elements).toHaveLength(1);});
it('rejects escaping paths',()=>{for(const p of ['../a','/a','a/../b','a\\b','a//b'])expect(()=>safePath(p)).toThrow();expect(safePath('folder/file.excalidraw')).toEqual(['folder','file.excalidraw']);});
it('hashes contents rather than metadata',async()=>{expect(await revision('a')).toBe(await revision('a'));expect(await revision('a')).not.toBe(await revision('b'));});
