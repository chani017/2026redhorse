"use client";

import { Canvas } from "@react-three/fiber";
import { useRef } from "react";
import Disk from "./components/Disk";
import RotationControls from "./components/RotationControls";
import { usePreventScroll } from "./hooks/usePreventScroll";

const MUX_URL =
  "https://stream.mux.com/xQtxxKOx6bKL00GVU02dfY100L3t0000Lzuser9o4khqGunM.m3u8";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  usePreventScroll();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#000000]">
      <video
        ref={videoRef}
        src={MUX_URL}
        style={{ display: "none" }}
        crossOrigin="anonymous"
        loop
        muted
        playsInline
      />
      <Canvas
        camera={{ position: [0, 0, 18], fov: 25 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={1} />
        <directionalLight position={[0, 3, 5]} intensity={0.6} />
        <Disk videoRef={videoRef} />
        <RotationControls />
      </Canvas>
    </div>
  );
}
