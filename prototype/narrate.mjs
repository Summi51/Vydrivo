// Explicit invocation only. Uses local secrets; never logs API response bodies.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {requireReview} from './storyboard.mjs';
import {narrationHash} from './timeline.mjs';
import {lookupNarrationCache,narrationCacheKey,upsertCacheIndex} from './narration-cache.mjs';
import {requireFreeAllowance,alignmentCues} from './voice-policy.mjs';
const origin='https://api.elevenlabs.io';
async function request(route,options={}) {
  const r=await fetch(origin+route,{...options,redirect:'error',headers:{'xi-api-key':process.env.ELEVENLABS_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(45000)});
  if(!r.ok) throw new Error(`ElevenLabs HTTP ${r.status}; no automatic retry or paid fallback.`);
  return r.json();
}
try {
  if(!process.env.ELEVENLABS_API_KEY) throw new Error('Missing ELEVENLABS_API_KEY in ignored .env.local.');
  const which=process.argv[2]||'female';
  if(!['male','female'].includes(which)) throw new Error('Choose male or female.');
  const voiceId=process.env[`ELEVENLABS_${which.toUpperCase()}_VOICE_ID`];
  if(!/^[A-Za-z0-9]{20}$/.test(voiceId||'')) throw new Error('Missing or invalid saved voice ID.');
  let scene;
  if(process.argv.includes('--storyboard')) {
    const i=process.argv.indexOf('--storyboard');
    const [boardFile,reviewFile,sceneId]=process.argv.slice(i+1,i+4);
    if(!boardFile||!reviewFile||!sceneId)throw new Error('--storyboard requires board.json review.json scene-id');
    const board=JSON.parse(readFileSync(boardFile,'utf8'));
    requireReview(board,JSON.parse(readFileSync(reviewFile,'utf8')));
    const selected=board.scenes.find(s=>s.id===sceneId);
    if(!selected)throw new Error('Scene not found in reviewed storyboard.');
    scene={...selected,paidCallsAllowed:false,incrementalSpendCapINR:0};
  } else {
    if(!process.argv.includes('--demo'))throw new Error('Use --storyboard board.json review.json scene-id; legacy fixtures require --demo.');
    scene=JSON.parse(readFileSync(process.argv[4]||'prototype/scene.json','utf8'));
  }
  if(scene.paidCallsAllowed!==false||scene.incrementalSpendCapINR!==0) throw new Error('Zero-spend fixture policy required.');
  const base=path.resolve('prototype/output');
  const cached=lookupNarrationCache(base,{voiceId,model:'eleven_multilingual_v2',narration:scene.narration});
  if(cached){console.log(`Reused saved narration: ${cached}. No new speech request.`);process.exit(0);}
  const subscription=await request('/v1/user/subscription');
  requireFreeAllowance(subscription,scene.narration);
  await request(`/v1/voices/${voiceId}`);
  if(process.argv.includes('--check')) {console.log('Read-only check passed: voice accessible and conservative free allowance available. No speech generated.');process.exit(0);}
  const out=path.resolve(process.argv[3]||`prototype/output/voice-${Date.now()}`);
  if(!out.startsWith(base+path.sep)) throw new Error('Output must be a new directory under prototype/output.');
  if(existsSync(out)) throw new Error('Output directory exists; reconcile prior attempt rather than resubmitting.');
  mkdirSync(out,{recursive:true});
  const journal=path.join(out,'attempt.json');
  writeFileSync(journal,JSON.stringify({state:'submitting-or-uncertain',voiceId,model:'eleven_multilingual_v2',costCapINR:0,automaticRetry:false},null,2));
  const data=await request(`/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,{method:'POST',body:JSON.stringify({text:scene.narration,model_id:'eleven_multilingual_v2'})});
  if(typeof data.audio_base64!=='string'||!data.audio_base64.length) throw new Error('Speech response has no audio. Retain attempt for reconciliation.');
  writeFileSync(path.join(out,'narration.mp3'),Buffer.from(data.audio_base64,'base64'));
  const alignment=data.alignment||data.normalized_alignment;
  const cues=alignmentCues(alignment,scene.narration);
  writeFileSync(path.join(out,'alignment.json'),JSON.stringify({sceneId:scene.id,narrationHash:narrationHash(scene.narration),alignment},null,2));
  writeFileSync(path.join(out,'captions.json'),JSON.stringify(cues,null,2));
  writeFileSync(journal,JSON.stringify({state:'succeeded',voiceId,model:'eleven_multilingual_v2',costCapINR:0,privateNoncommercialTest:true,captionTiming:'provider-character-alignment',automaticRetry:false},null,2));
  const indexPath=path.join(base,'narration-cache.json');
  const index=existsSync(indexPath)?JSON.parse(readFileSync(indexPath,'utf8')):null;
  writeFileSync(indexPath,JSON.stringify(upsertCacheIndex(index,{key:narrationCacheKey({voiceId,model:'eleven_multilingual_v2',narration:scene.narration}),relativeDir:path.basename(out),voiceId,model:'eleven_multilingual_v2',narrationHash:narrationHash(scene.narration),costCapINR:0}),null,2));
  console.log('Narration and measured captions saved. Private test only; commercial rights not established.');
} catch(e) {console.error(e.message);process.exitCode=1;}
