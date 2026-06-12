import { Composition } from "remotion";
import { XMarketingVideo } from "./x-marketing-video";
import sampleProps from "./sample-props.json";

export function RemotionRoot() {
  return (
    <Composition
      id="XMarketingVideo"
      component={XMarketingVideo}
      durationInFrames={600}
      fps={30}
      width={1600}
      height={900}
      defaultProps={sampleProps}
    />
  );
}
