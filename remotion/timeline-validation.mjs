// Browser-safe render boundary. Model output never selects code or arbitrary URLs.
export function validateRenderTimeline(t){
  if(!t||t.schemaVersion!==1||t.fps!==30||t.width!==1080||t.height!==1920||!Number.isInteger(t.durationInFrames)||t.durationInFrames<1||t.durationInFrames>2700)throw new Error('Invalid render timeline settings.');
  if(!Array.isArray(t.scenes)||!t.scenes.length||t.scenes.length>24)throw new Error('Missing scenes.');
  const pathOK=p=>typeof p==='string'&&/^media\/[\w./-]+$/.test(p)&&p.split('/').every(v=>v&&v!=='.'&&v!=='..');
  let cursor=0,footage=0;const ids=new Set();
  for(const s of t.scenes){
    if(typeof s.id!=='string'||ids.has(s.id)||s.from!==cursor||!Number.isInteger(s.durationInFrames)||s.durationInFrames<1||!pathOK(s.audioSrc)||typeof s.title!=='string'||s.title.length>120)throw new Error('Invalid scene or media path.');
    ids.add(s.id);cursor+=s.durationInFrames;
    if(s.visualKind==='ai-generated-footage'){if(!pathOK(s.videoSrc))throw new Error('Missing footage.');footage+=s.durationInFrames;}
    else if(s.visualKind!=='motion-graphics')throw new Error('Unsupported visual.');
    if(!Array.isArray(s.captions)||!s.captions.length)throw new Error('Missing measured captions.');
    let end=0;for(const c of s.captions){if(!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<end||c.end<=c.start||c.end>s.durationInFrames/30||typeof c.text!=='string'||!c.text.trim()||c.text.length>140)throw new Error('Invalid caption cue.');end=c.end;}
    if(s.graphicSteps){if(!Array.isArray(s.graphicSteps)||s.graphicSteps.length>8)throw new Error('Too many diagram steps.');let at=-1;for(const step of s.graphicSteps){if(typeof step.label!=='string'||step.label.length>50||!Number.isFinite(step.at)||step.at<0||step.at<at||step.at>=s.durationInFrames/30)throw new Error('Invalid diagram cue.');at=step.at;}}
  }
  if(cursor!==t.durationInFrames)throw new Error('Timeline duration mismatch.');
  if(t.mode!=='graphics-diagnostic'&&(cursor<1800||footage<cursor/2))throw new Error('Product export requires 60–90 seconds and actual footage.');
  return t;
}
