// "Les trous sont au mauvais endroit" — le biais du survivant, Abraham Wald, 1943 (FR, 1080x1920, 30 fps).
// Built on the cartoon-3d-short pipeline copied from lego4: one inked three.js world (world.ts) posed per frame from
// story.ts, toon character cards (toon.ts / cast.ts), post chain InkPass -> lens blur -> [bloom + NEUTRAL tone map + grade].
// CLEAN render: no burned subtitles. Scale sheet (1 unit = 1 m): top of story.ts.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { usePost, Chain } from "./post";
import { TOTAL, FPS, shotAt, dofAt } from "./story";
import { Overlays } from "./cards";

export const WALD_FRAMES = TOTAL;

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const chain = useMemo<Chain>(() => [fx.ink, [fx.lens.pre], [fx.lens.main], [fx.bloom, fx.tone, fx.grade]], [fx]);
  usePost(chain);
  const cam = camera as THREE.PerspectiveCamera;
  world.update(shotAt(f).id, f, cam, scene);
  noInkFallback(world.root);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  fpt.set(...d.focus);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, "day");
  return <primitive object={world.root} dispose={null} />;
};

export const WaldShort: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#cfe3f2", overflow: "hidden" }}>
      <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }} camera={{ fov: 40, near: 0.2, far: 1500 }}>
        <Inner />
      </ThreeCanvas>
      <Overlays tau={f / FPS} />
      <Audio src={staticFile("voice_wald_fr.wav")} />
    </AbsoluteFill>
  );
};
