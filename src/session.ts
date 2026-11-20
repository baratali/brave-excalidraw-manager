import {revision,Scene} from './core';

const KEY='excalidraw-manager-active';
export interface ActiveSession {
  path:string;
  workspaceId:string;
  base:string;
  currentHash:string;
  savedHash:string;
}
export function readSession():ActiveSession|null {
  try {
    const value=JSON.parse(sessionStorage.getItem(KEY)||'null');
    return value&&['path','workspaceId','base','currentHash','savedHash'].every(k=>typeof value[k]==='string')?value:null;
  } catch {return null;}
}
let sequence=0;
export async function rememberSession(path:string,workspaceId:string,base:string,current:Scene,saved:string) {
  const token=++sequence;
  const [currentHash,savedHash]=await Promise.all([revision(JSON.stringify(current)),revision(saved)]);
  if(token===sequence)sessionStorage.setItem(KEY,JSON.stringify({path,workspaceId,base,currentHash,savedHash}));
}
export function forgetSession(){sequence++;sessionStorage.removeItem(KEY);}
