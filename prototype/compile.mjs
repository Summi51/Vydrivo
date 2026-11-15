import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {localInput,probe} from './media.mjs';
import {compileTimeline} from './timeline.mjs';
try{
  const [boardFile,reviewFile,assetFile]=process.argv.slice(2);
  if(!assetFile)throw new Error('Usage: compile board.json review.json assets.json');
  const read=file=>JSON.parse(readFileSync(file,'utf8'));
  const root=path.dirname(path.resolve(assetFile)), assets=read(assetFile);
  if(!Array.isArray(assets))throw new Error('Expected an asset array.');
  const run=randomUUID(),copies=[];
  const resolved=assets.map((a,i)=>{
    const audio=localInput(root,a.audioFile),audioInfo=probe(audio);
    if(!audioInfo.streams.some(s=>s.codec_type==='audio'&&s.codec_name==='mp3'))throw new Error('Expected an MP3 narration asset; normalize other formats explicitly.');
    const alignment=read(localInput(root,a.alignmentFile));
    if(alignment.sceneId!==a.sceneId)throw new Error('Alignment belongs to another scene.');
    const audioSrc=`media/${run}/${i}.mp3`;copies.push([audio,audioSrc]);
    const result={...a,narrationHash:alignment.narrationHash,alignment:alignment.alignment,audioSrc,audioSeconds:Number(audioInfo.format.duration)};
    if(a.kind==='ai-generated-footage'){
      const video=localInput(root,a.videoFile),videoInfo=probe(video);
      const stream=videoInfo.streams.find(s=>s.codec_type==='video');
      if(!stream||stream.codec_name!=='h264'||!videoInfo.format.format_name?.includes('mp4'))throw new Error('Expected H.264 MP4 footage; normalize other formats explicitly.');
      result.videoSeconds=Number(stream.duration||videoInfo.format.duration);
      result.videoSrc=`media/${run}/${i}.mp4`;copies.push([video,result.videoSrc]);
    }
    return result;
  });
  const timeline=compileTimeline(read(boardFile),read(reviewFile),resolved);
  const out=path.resolve('prototype/output',`timeline-${run}`);mkdirSync(out,{recursive:true});
  // Local rendering assets only. Never serve this directory as a hosted public site.
  for(const [source,dest] of copies){const file=path.resolve('remotion/public',dest);mkdirSync(path.dirname(file),{recursive:true});copyFileSync(source,file);}
  writeFileSync(path.join(out,'props.json'),JSON.stringify({timeline},null,2),{flag:'wx',mode:0o600});
  console.log(`Validated render props: ${out}/props.json`);
}catch(e){console.error(e.message);process.exitCode=1;}
