import ffmpeg from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,statSync,realpathSync} from 'node:fs';
import path from 'node:path';
export const binaries = {ffmpeg, ffprobe: ffprobe.path};
export function run(binary, args, options={}) {
  const r=spawnSync(binary,args,{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024,...options});
  if(r.error || r.status!==0) throw new Error(`Local media operation failed (${r.error?.code || r.status}); check tools and media. ${r.stderr?.slice(-1200)||''}`);
  return r.stdout;
}
export function probe(file) {
  return JSON.parse(run(binaries.ffprobe,['-v','error','-protocol_whitelist','file,pipe','-show_format','-show_streams','-of','json',file]));
}
export function localInput(root, name) {
  if(typeof name!=='string'||path.isAbsolute(name)) throw new Error('Inputs must be relative local paths.');
  const base=realpathSync(root), file=realpathSync(path.resolve(base,name));
  if(!file.startsWith(base+path.sep)||!statSync(file).isFile()) throw new Error('Input escapes scene directory.');
  if(statSync(file).size>100*1024*1024) throw new Error('Prototype input exceeds 100 MB limit.');
  return file;
}
export const checksum=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
export function validate(scene, videoDuration, audioDuration) {
  if(scene.schemaVersion!==1||scene.kind!=='ai-generated-footage') throw new Error('Actual AI footage provenance is required.');
  if(scene.costINR!==0||scene.freeAccessConfirmed!==true) throw new Error('Only confirmed zero-charge inputs are allowed.');
  if(!scene.provenance?.provider||!scene.provenance?.model||!scene.provenance?.prompt) throw new Error('Provider, model and prompt are required.');
  if(![videoDuration,audioDuration].every(x=>Number.isFinite(x)&&x>0&&x<=15)) throw new Error('First-scene inputs must be 0–15 seconds.');
  if(videoDuration+0.04<audioDuration) throw new Error('Footage is shorter than narration; no freeze/loop fallback.');
  if(!Array.isArray(scene.captions)||!scene.captions.length) throw new Error('Measured caption cues are required.');
  let end=0;
  for(const c of scene.captions){
    if(!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<end||c.end<=c.start||c.end>audioDuration+0.04) throw new Error('Invalid or overlapping caption timing.');
    if(typeof c.text!=='string'||!c.text.trim()||c.text.length>100||/[\x00-\x1f<>]/.test(c.text)) throw new Error('Caption must be plain text, at most 100 characters.');
    end=c.end;
  }
}
function timestamp(s){const ms=Math.round(s*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;}
export const srt=cues=>cues.map((c,i)=>`${i+1}\n${timestamp(c.start)} --> ${timestamp(c.end)}\n${c.text}\n`).join('\n');
