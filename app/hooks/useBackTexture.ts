import { useEffect, useRef } from "react";
import { TextureLoader, MeshStandardMaterial, LinearFilter, RepeatWrapping } from "three";
import type { Mesh, Texture } from "three";
import { COLOR_COMMON_GLSL, COLOR_FRAGMENT_GLSL } from "../lib/shaders";

interface BackTextureOptions {
  saturation: number;
  contrast: number;
}

export function useBackTexture(
  bottomFaceRef: React.RefObject<Mesh | null>,
  imagePath: string,
  { saturation, contrast }: BackTextureOptions
) {
  const textureRef = useRef<Texture | null>(null);

  useEffect(() => {
    if (!bottomFaceRef.current) return;

    const loader = new TextureLoader();

    loader.load(
      imagePath,
      (texture) => {
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        const repeat = 0.95;
        texture.repeat.set(-repeat, repeat);
        const offset = (1 - repeat) / 2;
        texture.offset.set(1 - offset, offset);
        textureRef.current = texture;

        if (!bottomFaceRef.current?.material) return;
        const material = bottomFaceRef.current.material as MeshStandardMaterial;
        material.map = texture;

        material.onBeforeCompile = (shader) => {
          shader.uniforms.saturation ??= { value: saturation };
          shader.uniforms.contrast ??= { value: contrast };

          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <common>",
            COLOR_COMMON_GLSL
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <color_fragment>",
            COLOR_FRAGMENT_GLSL
          );
        };

        material.needsUpdate = true;
      },
      undefined,
      () => {}
    );

    return () => {
      if (textureRef.current) textureRef.current.dispose();
    };
  }, [saturation, contrast, imagePath]);
}
