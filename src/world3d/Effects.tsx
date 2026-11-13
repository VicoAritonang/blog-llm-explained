// Post-processing: bloom for anything emissive, filmic tone mapping, a soft
// vignette and SMAA. Only on the "tinggi" graphics setting.
// The kernel bloom is used on purpose: the mipmap variant blanked the frame on
// software renderers.
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { KernelSize, ToneMappingMode } from "postprocessing";

export function Effects() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom kernelSize={KernelSize.LARGE} intensity={0.55} luminanceThreshold={0.95} luminanceSmoothing={0.2} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.45} />
      <SMAA />
    </EffectComposer>
  );
}
