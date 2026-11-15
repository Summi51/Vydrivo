export function requireFreeAllowance(subscription, text) {
  if(subscription.tier!=='free') throw new Error('Only a verified free account is enabled in this prototype.');
  if(subscription.can_extend_character_limit!==false) throw new Error('Usage extension is enabled or unknown; speech blocked.');
  const {character_count:used,character_limit:limit}=subscription;
  if(!Number.isFinite(used)||!Number.isFinite(limit)||used<0||limit<used) throw new Error('Free allowance could not be verified.');
  if(typeof text!=='string'||!text.trim()||text.length>700) throw new Error('Prototype narration must contain 1–700 characters.');
  if(limit-used<text.length*2) throw new Error('Insufficient conservative free allowance; no paid fallback.');
}
export function alignmentCues(alignment, expectedText) {
  const c=alignment?.characters,s=alignment?.character_start_times_seconds,e=alignment?.character_end_times_seconds;
  if(!Array.isArray(c)||!c.length||c.length!==s?.length||c.length!==e?.length) throw new Error('Missing measured speech alignment.');
  if(expectedText!==undefined&&c.join('')!==expectedText) throw new Error('Speech alignment does not match approved narration.');
  const cues=[];let text='',start=0,end=0;
  for(let i=0;i<c.length;i++){
    if(typeof c[i]!=='string'||!Number.isFinite(s[i])||!Number.isFinite(e[i])||s[i]<0||e[i]<s[i]||(i&&(s[i]<s[i-1]||s[i]<e[i-1]-0.001))) throw new Error('Invalid speech alignment.');
    if(!text) start=s[i];
    text+=c[i];end=e[i];
    if((text.length>=35&&/\s/.test(c[i]))||i===c.length-1){if(text.trim())cues.push({start,end,text:text.trim()});text='';}
  }
  return cues;
}
// Gemini TTS returns audio without word timestamps. Spread the measured audio
// duration evenly across the narration characters so captions still advance and
// the renderer gets a valid alignment. This is estimated, not measured.
export function estimatedAlignment(text, seconds) {
  const characters=Array.from(String(text??''));
  const duration=Number(seconds);
  if(!characters.length) throw new Error('Narration is empty.');
  if(!Number.isFinite(duration)||duration<=0) throw new Error('Audio duration is invalid.');
  const step=duration/characters.length;
  return {
    characters,
    character_start_times_seconds:characters.map((_,index)=>Number((index*step).toFixed(4))),
    character_end_times_seconds:characters.map((_,index)=>Number(((index+1)*step).toFixed(4))),
  };
}
// Gemini speaks faster than ElevenLabs. Keep the spoken audio but hold each
// scene to its storyboard estimate with silence so the final cut stays in the
// 60–90 second window. Never shorten a scene that already runs longer.
export function sceneDurationSeconds(speechSeconds, estimatedSeconds) {
  const speech=Number(speechSeconds);
  if(!Number.isFinite(speech)||speech<=0) throw new Error('Audio duration is invalid.');
  const estimate=Number(estimatedSeconds);
  return Number.isFinite(estimate)&&estimate>speech?estimate:speech;
}

// A modest narration overrun should still finish. Scale spoken audio toward the
// 60–90 second window instead of failing the render after the voice was already
// generated. Extreme overruns stay an error so the voice is never chipmunked.
export const TIMELINE_MIN_SECONDS=60;
export const TIMELINE_MAX_SECONDS=90;
export const MAX_TIMELINE_TEMPO=1.35;

export function fitTimeline(speechSeconds, {minSeconds=TIMELINE_MIN_SECONDS, maxSeconds=TIMELINE_MAX_SECONDS, maxTempo=MAX_TIMELINE_TEMPO}={}) {
  const seconds=(Array.isArray(speechSeconds)?speechSeconds:[]).map(Number);
  if(!seconds.length||seconds.some((value)=>!Number.isFinite(value)||value<=0)) {
    throw new Error('Audio duration is invalid.');
  }
  const total=seconds.reduce((sum,value)=>sum+value,0);
  if(total>=minSeconds&&total<=maxSeconds) {
    return {seconds,tempo:1,total,fitted:false};
  }
  const target=total>maxSeconds?maxSeconds:minSeconds;
  // atempo > 1 speeds audio up. A 106s narration needs ~1.18x to land at 90s.
  const playback=total/target;
  if(playback<1/maxTempo||playback>maxTempo) {
    const direction=total>maxSeconds?'shorter':'longer';
    throw new Error(`Narration is ${total.toFixed(1)}s, too far from ${minSeconds}–${maxSeconds}s to fit cleanly. Make the storyboard a little ${direction}, then render again.`);
  }
  const fitted=seconds.map((value)=>value/playback);
  const drift=target-fitted.reduce((sum,value)=>sum+value,0);
  fitted[fitted.length-1]+=drift;
  return {
    seconds:fitted,
    tempo:playback,
    total:fitted.reduce((sum,value)=>sum+value,0),
    fitted:Math.abs(playback-1)>0.0001,
  };
}
