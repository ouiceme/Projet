import React from "react";
import { Composition } from "remotion";
import { MolassesShort } from "./videos/molasses/Molasses";

export const Root: React.FC = () => (
  <Composition
    id="MolassesShort"
    component={MolassesShort}
    durationInFrames={2004}
    fps={30}
    width={1080}
    height={1920}
  />
);
