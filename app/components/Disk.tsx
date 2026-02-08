"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Mesh,
  Group,
  MeshStandardMaterial,
  DoubleSide,
  BufferGeometry,
} from "three";
import { useVideoTexture } from "../hooks/useVideoTexture";
import { useBackTexture } from "../hooks/useBackTexture";
import { useZoom } from "../hooks/useZoom";

interface DiskProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const SATURATION = 1.1;
const CONTRAST = 2;
const HUE = -5.0;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const ZOOM_SPEED = 0.1;

export default function Disk({ videoRef }: DiskProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const topFaceRef = useRef<Mesh>(null);
  const bottomFaceRef = useRef<Mesh>(null);
  const scaleRef = useRef(1.0);

  // 커스텀 훅
  const textureRef = useVideoTexture(videoRef, topFaceRef, {
    saturation: SATURATION,
    contrast: CONTRAST,
    hue: HUE,
  });

  useBackTexture(bottomFaceRef, "/horse_back.png", {
    saturation: SATURATION,
    contrast: CONTRAST,
  });

  useZoom(groupRef, scaleRef, {
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    speed: ZOOM_SPEED,
  });

  // 초기 회전·스케일
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.set(0.91, 0.11, 0.35);
      groupRef.current.scale.set(scaleRef.current, scaleRef.current, scaleRef.current);
    }
  }, []);

  // 원기둥 상·하 면 투명 처리
  useEffect(() => {
    if (!meshRef.current) return;
    const geometry = meshRef.current.geometry as BufferGeometry;
    if (geometry.groups && geometry.groups.length >= 3) {
      meshRef.current.material = [
        new MeshStandardMaterial({ color: "#f7eeee" }),
        new MeshStandardMaterial({ transparent: true, opacity: 0 }),
        new MeshStandardMaterial({ transparent: true, opacity: 0 }),
      ];
    }
  }, []);

  // 비디오 텍스처 갱신
  useFrame(() => {
    if (textureRef.current) textureRef.current.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={[0, 0.2, 0]}>
      {/* 원기둥 본체 */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[2, 2, 0.05, 128]} />
        <meshStandardMaterial color="#f7eeee" />
      </mesh>

      {/* 상단 면 — 비디오 */}
      <mesh ref={topFaceRef} position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.062, 2, 128]} />
        <meshStandardMaterial side={DoubleSide} />
      </mesh>

      {/* 하단 면 — 이미지 */}
      <mesh ref={bottomFaceRef} position={[0, -0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.062, 2, 128]} />
        <meshStandardMaterial side={DoubleSide} />
      </mesh>

      {/* 구멍 내부 터널 */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.062, 0.062, 0.05, 128, 1, true]} />
        <meshStandardMaterial color="#f7eeee" side={DoubleSide} />
      </mesh>
    </group>
  );
}
