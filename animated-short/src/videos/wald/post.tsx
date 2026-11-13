// Replacement for <EffectComposer> of @react-three/postprocessing (v3 needs React 19 / fiber 9; this project is on
// React 18 / fiber 8): drives the raw `postprocessing` composer from R3F's render loop (useFrame priority 1 takes
// over rendering). Same chain as the skill: RenderPass -> given passes; Effects in one array share one EffectPass.
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, EffectPass, RenderPass, Pass, Effect } from "postprocessing";

export type Chain = (Pass | Effect[])[];
export const usePost = (chain: Chain, multisampling = 4) => {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    gl.toneMapping = THREE.NoToneMapping;
    const c = new EffectComposer(gl, { multisampling, frameBufferType: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: false });
    c.addPass(new RenderPass(scene, camera));
    for (const p of chain) c.addPass(Array.isArray(p) ? new EffectPass(camera, ...p) : p);
    return c;
  }, [gl, scene, camera, chain, multisampling]);
  useEffect(() => { composer.setSize(size.width, size.height); }, [composer, size]);
  useEffect(() => () => composer.dispose(), [composer]);
  useFrame(() => { composer.render(); }, 1);
};
