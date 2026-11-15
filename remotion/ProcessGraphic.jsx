import {AbsoluteFill,interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
// Reusable animated process diagram: labels and cue times are supplied as data.
export const ProcessGraphic=({steps=[]})=>{
  const f=useCurrentFrame(),{fps}=useVideoConfig(),time=f/fps;
  const active=Math.max(0,steps.findLastIndex(s=>time>=s.at));
  return <AbsoluteFill style={{background:'radial-gradient(ellipse at 70% 20%, #164862, #071629 75%)'}}>
    <svg viewBox="0 0 1080 1920" style={{position:'absolute',width:'100%',height:'100%'}}>
      {Array.from({length:24},(_,i)=><circle key={i} cx={(i*179)%1080} cy={(i*137-f*0.35+2400)%1920} r={2+i%4} fill="#5ef4db" opacity=".12"/>)}
      <circle cx="540" cy="830" r="350" fill="none" stroke="#163a50" strokeWidth="2"/>
      <circle cx="540" cy="830" r="325" fill="none" stroke="#51e6cc" strokeWidth="2" strokeDasharray="3 24" transform={`rotate(${f*.12} 540 830)`}/>
    </svg>
    <div style={{position:'absolute',top:300,left:90,right:90,color:'#60edd6',fontSize:25,letterSpacing:6}}>FOLLOW THE PROCESS</div>
    <div style={{position:'absolute',top:430,left:100,right:100,display:'grid',gap:26}}>{steps.map((s,i)=>{
      const entered=interpolate(f,[i*5,i*5+18],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
      return <div key={i} style={{opacity:entered,transform:`translateY(${(1-entered)*35}px)`,display:'flex',alignItems:'center',gap:30,padding:'27px 32px',borderRadius:24,border:`2px solid ${i===active?'#62f2d8':'#284557'}`,background:i===active?'#164b58':'#10283c',boxShadow:i===active?'0 0 45px #2bdabc22':'none'}}><div style={{fontSize:32,color:'#68edd5',fontWeight:800}}>{String(i+1).padStart(2,'0')}</div><div style={{fontSize:42,fontWeight:700,color:i===active?'white':'#99b5c8'}}>{s.label}</div><div style={{marginLeft:'auto',color:'#68edd5',fontSize:38}}>{i===active?'→':i<active?'✓':'·'}</div></div>;
    })}</div>
  </AbsoluteFill>;
};
