import React from "react";
import { Composition } from "remotion";
import { MolassesShort } from "./videos/molasses/Molasses";
import { DunningShort } from "./videos/dk/Dunning";
import { LegoShort } from "./videos/lego/Lego";
import { Lego4Short, LEGO4_FRAMES } from "./videos/lego4/Lego4";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";

export const Root: React.FC = () => (
  <>
    <Composition
      id="MolassesShort"
      component={MolassesShort}
      durationInFrames={2004}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="DunningShort"
      component={DunningShort}
      durationInFrames={2518}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="LegoShort"
      component={LegoShort}
      durationInFrames={2601}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Lego4Short" component={Lego4Short} durationInFrames={LEGO4_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
