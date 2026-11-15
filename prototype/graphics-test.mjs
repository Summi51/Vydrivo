// Offline regression fixture: reuse saved speech, never synthesize or invent timestamps.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync,statfsSync,renameSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia} from '@remotion/renderer';
import {probe,run,binaries,checksum} from './media.mjs';
import {validateRenderTimeline} from '../remotion/timeline-validation.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
try{
  const disk=statfsSync('.');if(disk.bavail*disk.bsize<20*1024**3)throw new Error('Keep 20 GiB free before rendering.');
  const browser=path.resolve('node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell');
  if(!existsSync(browser))throw new Error('Installed headless browser not found; no automatic download.');
  const source='prototype/output/water-cycle-voice-001',script=read('prototype/water-cycle-scene.json');
  const captions=read(`${source}/captions.json`),attempt=read(`${source}/attempt.json`);
  if(attempt.state!=='succeeded'||attempt.costCapINR!==0)throw new Error('Missing saved zero-cost narration evidence.');
  const normalize=s=>s.replace(/\s+/g,' ').trim();
  if(normalize(captions.map(c=>c.text).join(' '))!==normalize(script.narration))throw new Error('Saved captions do not match the script.');
  const audio=path.resolve(source,'narration.mp3'),seconds=Number(probe(audio).format.duration);
  // These are fixture editorial labels. Their timing is resolved from measured caption cues.
  const topics=[['Water keeps moving','Water'],['Evaporation','evaporation'],['Condensation','condensation'],['Precipitation','precipitation'],['Collection','groundwater'],['The cycle repeats','never stops']];
  const graphicSteps=topics.map(([label,phrase])=>{const cue=captions.find(c=>c.text.toLowerCase().includes(phrase.toLowerCase()));if(!cue)throw new Error('Diagram phrase not present in measured captions.');return {label,at:cue.start};});
  const id=`water-cycle-check-${Date.now()}`,out=path.resolve('prototype/output',id),audioSrc=`media/${id}/narration.mp3`;
  mkdirSync(out,{recursive:true});mkdirSync(path.dirname(path.resolve('remotion/public',audioSrc)),{recursive:true});copyFileSync(audio,path.resolve('remotion/public',audioSrc));
  const timeline=validateRenderTimeline({schemaVersion:1,mode:'graphics-diagnostic',title:script.title,fps:30,width:1080,height:1920,durationInFrames:Math.ceil(seconds*30),scenes:[{id:'water-cycle',title:script.title,visualKind:'motion-graphics',from:0,durationInFrames:Math.ceil(seconds*30),audioSrc,captions,graphicSteps}]});
  const inputProps={timeline};writeFileSync(path.join(out,'props.json'),JSON.stringify(inputProps,null,2));
  const serveUrl=await bundle({entryPoint:path.resolve('remotion/index.jsx'),outDir:path.join(out,'bundle'),publicDir:path.resolve('remotion/public')});
  const composition=await selectComposition({serveUrl,id:'StoryboardVideo',inputProps,browserExecutable:browser});
  const outputLocation=path.join(out,'water-cycle.partial.mp4');
  await renderMedia({composition,serveUrl,codec:'h264',audioCodec:'aac',outputLocation,inputProps,browserExecutable:browser,concurrency:1,overwrite:false,timeoutInMilliseconds:60000,onProgress:({progress})=>{const percent=Math.floor(progress*100);if(percent%20===0&&percent!==globalThis.lastProgress){globalThis.lastProgress=percent;console.log(`Rendering ${percent}%`);}}});
  const info=probe(outputLocation),video=info.streams.find(s=>s.codec_type==='video'),sound=info.streams.find(s=>s.codec_type==='audio');
  if(video?.codec_name!=='h264'||video.width!==1080||video.height!==1920||sound?.codec_name!=='aac'||Math.abs(Number(info.format.duration)-timeline.durationInFrames/30)>0.15)throw new Error('Export validation failed.');
  run(binaries.ffmpeg,['-v','error','-i',outputLocation,'-f','null','-'],{timeout:120000});
  const levels=spawnSync(binaries.ffmpeg,['-hide_banner','-i',outputLocation,'-af','volumedetect','-vn','-f','null','-'],{encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
  const meanVolumeDB=Number(levels.stderr?.match(/mean_volume: (-?[\d.]+) dB/)?.[1]);
  if(levels.status!==0||!Number.isFinite(meanVolumeDB)||meanVolumeDB< -55)throw new Error('Narration is silent or unexpectedly quiet.');
  writeFileSync(path.join(out,'report.json'),JSON.stringify({kind:'graphics-diagnostic-not-ai-footage',newProviderCalls:0,newServiceSpendINR:0,voiceId:attempt.voiceId,reusedNarration:true,narrationChecksum:checksum(audio),captionTiming:'saved-provider-phrase-cues; diagram changes use phrase start, not word-perfect alignment',seconds:Number(info.format.duration),width:video.width,height:video.height,videoCodec:video.codec_name,audioCodec:sound.codec_name,fullDecodePassed:true,meanVolumeDB},null,2));
  run(binaries.ffmpeg,['-v','error','-i',outputLocation,'-vf','fps=1/10,scale=270:480,tile=4x1','-frames:v','1',path.join(out,'contact-sheet.jpg')]);
  const final=path.join(out,'water-cycle.mp4');renameSync(outputLocation,final);
  console.log(`Verified export: ${final}`);
}catch(e){console.error(e.message);process.exitCode=1;}
