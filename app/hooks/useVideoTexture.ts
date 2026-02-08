import { useEffect, useRef } from "react";
import { VideoTexture, MeshStandardMaterial, LinearFilter, RepeatWrapping } from "three";
import type { Mesh } from "three";
import Hls from "hls.js";
import {
  COLOR_COMMON_WITH_HUE_GLSL,
  COLOR_FRAGMENT_WITH_HUE_GLSL,
} from "../lib/shaders";

interface VideoTextureOptions {
  saturation: number;
  contrast: number;
  hue: number;
}

export function useVideoTexture(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  topFaceRef: React.RefObject<Mesh | null>,
  { saturation, contrast, hue }: VideoTextureOptions
) {
  const textureRef = useRef<VideoTexture | null>(null);

  useEffect(() => {
    if (!videoRef.current || !topFaceRef.current) return;

    const video = videoRef.current;
    const videoUrl = video.src;

    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const texture = new VideoTexture(video);
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    const repeat = 0.95;
    texture.repeat.set(repeat, repeat);
    const offset = (1 - repeat) / 2;
    texture.offset.set(offset, offset);
    textureRef.current = texture;

    let hls: Hls | null = null;

    if (videoUrl.includes(".m3u8")) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: false,
          lowLatencyMode: false,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          },
        });
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls?.recoverMediaError();
                break;
              default:
                hls?.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = videoUrl;
        video.addEventListener("loadedmetadata", () => {
          video.play().catch(() => {});
        });
      }
    } else {
      video.src = videoUrl;
      video.load();
    }

    const handleCanPlay = () => {
      video.play().catch(() => {});
    };

    const handleLoadedData = () => {
      if (!topFaceRef.current?.material) return;
      const material = topFaceRef.current.material as MeshStandardMaterial;
      material.map = texture;

      material.onBeforeCompile = (shader) => {
        shader.uniforms.saturation ??= { value: saturation };
        shader.uniforms.contrast ??= { value: contrast };
        shader.uniforms.hue ??= { value: hue };

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          COLOR_COMMON_WITH_HUE_GLSL
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <color_fragment>",
          COLOR_FRAGMENT_WITH_HUE_GLSL
        );
      };

      material.needsUpdate = true;
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleLoadedData);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleLoadedData);
      if (hls) hls.destroy();
      if (textureRef.current) textureRef.current.dispose();
    };
  }, [videoRef, saturation, contrast, hue]);

  return textureRef;
}
