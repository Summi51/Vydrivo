// Local single-owner feasibility harness; no network calls or credential loading.
import {readFileSync,mkdirSync,writeFileSync,renameSync,statfsSync} from 'node:fs';
import path from 'node:path';
import {binaries,run,probe,localInput,checksum,validate,srt} from './media.mjs';

try {
  const input=process.argv[2];
  if(!input) throw new Error('Usage: npm run compose -- path/to/scene-manifest.json');
  const manifestPath=path.resolve(input), scene=JSON.parse(readFileSync(manifestPath,'utf8'));
  const root=path.dirname(manifestPath), video=localInput(root,scene.video), audio=localInput(root,scene.audio);
  const vp=probe(video), ap=probe(audio), v=vp.streams.find(x=>x.codec_type==='video'), a=ap.streams.find(x=>x.codec_type==='audio');
  if(!v||!a) throw new Error('A video stream and separate narration audio are required.');
  const vd=Number(v.duration||vp.format.duration), ad=Number(a.duration||ap.format.duration);
  validate(scene,vd,ad);
  const outputRoot=path.resolve('prototype/output'); mkdirSync(outputRoot,{recursive:true});
  const disk=statfsSync(outputRoot); if(disk.bavail*disk.bsize<20*1024**3) throw new Error('Less than 20 GiB free; rendering stopped.');
  const out=path.join(outputRoot,`render-${Date.now()}`); mkdirSync(out);
  writeFileSync(path.join(out,'captions.srt'),srt(scene.captions));
  const started=Date.now();
  run(binaries.ffmpeg,['-hide_banner','-v','error','-nostdin','-n','-threads','1',
    '-protocol_whitelist','file,pipe','-i',video,'-protocol_whitelist','file,pipe','-i',audio,
    '-map','0:v:0','-map','1:a:0','-t',String(ad),'-vf',
    "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,subtitles=captions.srt:force_style='FontSize=18,MarginV=28,Outline=2'",
    '-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-threads','1','-filter_threads','1',
    '-c:a','aac','-ar','48000','-movflags','+faststart','pending.mp4'],{cwd:out,timeout:180000});
  const report=probe(path.join(out,'pending.mp4')), ov=report.streams.find(x=>x.codec_type==='video'), oa=report.streams.find(x=>x.codec_type==='audio');
  if(ov?.width!==1080||ov?.height!==1920||ov?.codec_name!=='h264'||oa?.codec_name!=='aac'||Math.abs(Number(report.format.duration)-ad)>0.15) throw new Error('Rendered output failed format/duration validation.');
  run(binaries.ffmpeg,['-v','error','-i',path.join(out,'pending.mp4'),'-f','null','-'],{timeout:60000});
  renameSync(path.join(out,'pending.mp4'),path.join(out,'video.mp4'));
  writeFileSync(path.join(out,'report.json'),JSON.stringify({schemaVersion:1,status:'render-validated-human-review-required',elapsedMs:Date.now()-started,costINR:0,source:{width:v.width,height:v.height,videoSHA256:checksum(video),audioSHA256:checksum(audio)},provenance:scene.provenance,output:report,authenticity:'User-supplied provenance; human motion review still required',captionReview:'Human synchronization review still required'},null,2));
  console.log(`Local render validated: ${path.join(out,'video.mp4')}`);
  console.log('Not an end-to-end AI generation pass until provenance, visible motion, narration and caption timing are reviewed.');
} catch(e) { console.error(e.message); process.exitCode=1; }
