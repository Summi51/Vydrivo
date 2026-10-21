import {ProcessGraphic} from './ProcessGraphic.jsx';
import {validateRenderTimeline} from './timeline-validation.mjs';
import {AbsoluteFill,Audio,OffthreadVideo,Sequence,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
const Scene = ({scene}) => {
  const frame=useCurrentFrame();const {fps}=useVideoConfig();const seconds=frame/fps;
  const caption=scene.captions.find(c=>seconds>=c.start&&seconds<c.end);
  return <AbsoluteFill style={{background:'#142438',color:'white',fontFamily:'Arial, sans-serif'}}>
    <Audio src={staticFile(scene.audioSrc)}/>
    {scene.visualKind==='ai-generated-footage' ? <OffthreadVideo src={staticFile(scene.videoSrc)} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <ProcessGraphic steps={scene.graphicSteps||[{label:scene.title,at:0}]}/>}
    <div style={{position:'absolute',top:90,left:70,right:70,fontSize:44,background:'#142438dd',padding:24}}>{scene.title}</div>
    {caption&&<div style={{position:'absolute',bottom:140,left:70,right:70,padding:30,fontSize:44,lineHeight:1.25,textAlign:'center',background:'#142438ee',borderRadius:20}}>{caption.text}</div>}
  </AbsoluteFill>;
};
export const StoryboardVideo=({timeline})=>{
  if(!timeline?.scenes?.length)throw new Error('Supply a compiled, reviewed storyboard timeline. No sample-content fallback.');
  validateRenderTimeline(timeline);
  return <AbsoluteFill>{timeline.mode==='graphics-diagnostic'&&<div style={{position:'absolute',zIndex:10,top:24,left:70,fontSize:20,color:'#91aabb'}}>GRAPHICS TEST · NOT AI FOOTAGE</div>}{timeline.scenes.map(scene=><Sequence key={scene.id} from={scene.from} durationInFrames={scene.durationInFrames}><Scene scene={scene}/></Sequence>)}</AbsoluteFill>;
};
