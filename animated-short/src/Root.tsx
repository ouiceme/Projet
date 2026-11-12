import React from "react";
import { Composition } from "remotion";
import { MolassesShort } from "./videos/molasses/Molasses";
import { DunningShort } from "./videos/dk/Dunning";
import { LegoShort } from "./videos/lego/Lego";

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
  </>
);
