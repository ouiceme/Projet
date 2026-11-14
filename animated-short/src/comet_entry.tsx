// Development entry for the Comet short alone (stills while another render is bundling src/index.ts).
import React from "react";
import { Composition, registerRoot } from "remotion";
import { CometShort, COMET_FRAMES } from "./videos/comet/Comet";
registerRoot(() => <Composition id="CometShort" component={CometShort} durationInFrames={COMET_FRAMES} fps={30} width={1080} height={1920} />);
