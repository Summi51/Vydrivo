// Legacy compositions below are fixed demos, not the topic-to-video workflow.
import {validateRenderTimeline} from './timeline-validation.mjs';
import {StoryboardVideo} from './StoryboardVideo.jsx';
import { Composition, staticFile } from "remotion";
import { FootageCaption } from "./FootageCaption.jsx";
import { RamStorage } from "./RamStorage.jsx";
import { NabiPak } from "./NabiPak.jsx";
import { WaterCycle } from "./WaterCycle.jsx";
import { SolarSystem } from "./SolarSystem.jsx";
import { VydrivoExplainerEN, VydrivoExplainerHI } from "./VydrivoExplainer.jsx";
import { GraphicsExplainer } from "./GraphicsExplainer.jsx";
import { ReelExplainer } from "./ReelExplainer.jsx";
import { HeroExplainer } from "./HeroExplainer.jsx";
import { LandingHero } from "./LandingHero.jsx";

export const RemotionRoot = () => (
  <>
    <Composition id="StoryboardVideo" component={StoryboardVideo} fps={30} width={1080} height={1920} durationInFrames={1}
      calculateMetadata={({props})=>{if(!props.timeline)return {durationInFrames:1};validateRenderTimeline(props.timeline);return {durationInFrames:props.timeline.durationInFrames};}} />
    <Composition id="SolarSystem" component={SolarSystem} fps={30} width={1080} height={1920} durationInFrames={1}
      calculateMetadata={({props})=>({durationInFrames:Math.max(1,Math.ceil(Number(props.durationInFrames)||1))})} />
    <Composition
      id="WaterCycle"
      component={WaterCycle}
      durationInFrames={1320}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ audioSrc: staticFile("water-cycle.mp3") }}
    />
    <Composition
      id="RamStorage"
      component={RamStorage}
      durationInFrames={1004}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ audioSrc: staticFile("ram-storage.mp3") }}
    />
    <Composition
      id="FootageCaption"
      component={FootageCaption}
      durationInFrames={153}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ audioSrc: staticFile("lake-sun.mp3"), videoSrc: staticFile("lake-sun.mp4") }}
    />
    <Composition
      id="NabiPak"
      component={NabiPak}
      durationInFrames={570}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ audioSrc: staticFile("nabi-pak.mp3") }}
    />
    <Composition id="VydrivoExplainerEN" component={VydrivoExplainerEN} durationInFrames={2250} fps={30} width={1080} height={1920} />
    <Composition id="VydrivoExplainerHI" component={VydrivoExplainerHI} durationInFrames={2250} fps={30} width={1080} height={1920} />
    <Composition id="GraphicsExplainer" component={GraphicsExplainer} durationInFrames={2250} fps={30} width={1080} height={1920} />
    <Composition id="ReelExplainer" component={ReelExplainer} durationInFrames={1} fps={30} width={1080} height={1920}
      calculateMetadata={({props}) => ({durationInFrames: Math.max(1, Number(props?.durationInFrames) || 1)})} />
    <Composition id="HeroExplainer" component={HeroExplainer} durationInFrames={210} fps={30} width={1080} height={1920} />
    <Composition id="LandingHeroMobile" component={LandingHero} durationInFrames={240} fps={30} width={1080} height={1920} />
  </>
);
