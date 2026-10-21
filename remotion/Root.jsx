// Legacy compositions below are fixed demos, not the topic-to-video workflow.
import {validateRenderTimeline} from './timeline-validation.mjs';
import {StoryboardVideo} from './StoryboardVideo.jsx';
import { Composition, staticFile } from "remotion";
import { FootageCaption } from "./FootageCaption.jsx";
import { RamStorage } from "./RamStorage.jsx";
import { NabiPak } from "./NabiPak.jsx";
import { SnakeJoke } from "./SnakeJoke.jsx";
import { WaterCycle } from "./WaterCycle.jsx";

export const RemotionRoot = () => (
  <>
    <Composition id="StoryboardVideo" component={StoryboardVideo} fps={30} width={1080} height={1920} durationInFrames={1}
      calculateMetadata={({props})=>{if(!props.timeline)return {durationInFrames:1};validateRenderTimeline(props.timeline);return {durationInFrames:props.timeline.durationInFrames};}} />
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
      id="SnakeJoke"
      component={SnakeJoke}
      durationInFrames={685}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ audioSrc: staticFile("snake-joke.mp3") }}
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
  </>
);
