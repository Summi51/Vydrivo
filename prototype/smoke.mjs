// Synthetic media tests rendering only. Never counts as AI footage or narration.
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {binaries,run,probe,srt} from './media.mjs';
const out=path.resolve('prototype/output',`smoke-${Date.now()}`);
mkdirSync(out,{recursive:true});
writeFileSync(path.join(out,'captions.srt'),srt([{start:0,end:2,text:'RENDER TEST — NOT AI FOOTAGE'},{start:2,end:5,text:'Synthetic test pattern and tone'}]));
const start=Date.now();
run(binaries.ffmpeg,['-hide_banner','-v','error','-nostdin','-n','-f','lavfi','-i','testsrc2=size=720x1280:rate=30:duration=5','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=5','-vf',"subtitles=captions.srt:force_style='FontSize=18,MarginV=28,Outline=2'",'-c:v','libx264','-preset','veryfast','-threads','1','-filter_threads','1','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart','render-test.mp4'],{cwd:out,timeout:120000});
const media=probe(path.join(out,'render-test.mp4'));
const v=media.streams.find(s=>s.codec_type==='video'),a=media.streams.find(s=>s.codec_type==='audio');
if(v?.width!==720||v?.height!==1280||v?.codec_name!=='h264'||a?.codec_name!=='aac'||Math.abs(Number(media.format.duration)-5)>.15) throw new Error('Smoke test validation failed');
run(binaries.ffmpeg,['-v','error','-i',path.join(out,'render-test.mp4'),'-f','null','-']);
writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'synthetic-render-smoke-only',actualAIFootage:false,actualNarration:false,costINR:0,elapsedMs:Date.now()-start,media},null,2));
console.log(`PASS: synthetic renderer smoke test in ${Date.now()-start} ms; NOT AI footage.\n${out}`);
