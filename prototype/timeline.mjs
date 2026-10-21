import {createHash} from 'node:crypto';
import {requireReview,storyboardHash} from './storyboard.mjs';
import {alignmentCues} from './voice-policy.mjs';
export const narrationHash=text=>createHash('sha256').update(text).digest('hex');
function mediaPath(value){if(typeof value!=='string'||!/^media\/[a-zA-Z0-9_./-]+$/.test(value)||value.split('/').some(p=>p==='.'||p==='..'||!p))throw new Error('Use a trusted relative media/ asset path.');return value;}
// Assets are operator-resolved, not model supplied. Durations must come from FFprobe.
export function compileTimeline(board,approval,assets,{benchmark=false}={}){
  requireReview(board,approval);
  if(!Array.isArray(assets)||assets.length!==board.scenes.length||new Set(assets.map(a=>a.sceneId)).size!==assets.length)throw new Error('Exactly one asset bundle per scene is required.');
  let offset=0,footageFrames=0;
  const scenes=board.scenes.map(s=>{
    const a=assets.find(a=>a.sceneId===s.id);
    if(!a||a.narrationHash!==narrationHash(s.narration))throw new Error('Missing or stale narration asset.');
    if(!Number.isFinite(a.audioSeconds)||a.audioSeconds<=0||a.audioSeconds>40)throw new Error('Invalid measured audio duration.');
    const captions=alignmentCues(a.alignment,s.narration);
    if(captions.at(-1).end>a.audioSeconds+0.04)throw new Error('Captions exceed measured audio.');
    const durationInFrames=Math.ceil(a.audioSeconds*30);
    let videoSrc;
    if(s.visualKind==='ai-generated-footage'){
      if(a.kind!=='ai-generated-footage'||!a.provenance?.provider||!a.provenance?.model||!a.provenance?.prompt||a.costINR!==0||a.freeAccessConfirmed!==true)throw new Error('Verified zero-cost actual footage provenance required.');
      if(!Number.isFinite(a.videoSeconds)||a.videoSeconds<durationInFrames/30)throw new Error('Footage cannot cover scene frames; no automatic freeze or loop.');
      videoSrc=mediaPath(a.videoSrc);footageFrames+=durationInFrames;
    }
    const result={id:s.id,title:s.title,visualKind:s.visualKind,from:offset,durationInFrames,audioSrc:mediaPath(a.audioSrc),...(videoSrc?{videoSrc}:{}),captions};offset+=durationInFrames;return result;
  });
  if(footageFrames<offset/2)throw new Error('Measured footage coverage must be at least half the timeline.');
  if(!benchmark&&(offset<1800||offset>2700))throw new Error('Measured final duration must be 60–90 seconds; revise narration and review again.');
  return {schemaVersion:1,storyboardHash:storyboardHash(board),title:board.title,fps:30,width:1080,height:1920,durationInFrames:offset,benchmark,scenes};
}
