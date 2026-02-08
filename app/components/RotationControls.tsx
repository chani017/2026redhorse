"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, Quaternion, Camera, Mesh, Group, Object3D } from "three";

const INERTIA_STRENGTH = 0.3;
const INERTIA_DAMPING = 0.98;

export default function RotationControls() {
  const isDraggingRef = useRef(false);
  const prevPosRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef(new Vector3(0, 0, 0));
  const diskRef = useRef<Object3D | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const pointersRef = useRef<Set<number>>(new Set());

  // 재사용 벡터·쿼터니언
  const dirRef = useRef(new Vector3());
  const rightRef = useRef(new Vector3());
  const upRef = useRef(new Vector3());
  const axisRef = useRef(new Vector3());
  const quatRef = useRef(new Quaternion());

  const { camera, size, scene } = useThree();

  useEffect(() => {
    cameraRef.current = camera;
    sizeRef.current = { width: size.width, height: size.height };
  }, [camera, size]);

  // 씬에서 디스크 그룹 탐색
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj instanceof Group && obj.children.some((c) => c instanceof Mesh && c.geometry.type === "CylinderGeometry")) {
        diskRef.current = obj;
      }
    });
  }, [scene]);

  // 포인터 이벤트
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      pointersRef.current.add(e.pointerId);
      if (pointersRef.current.size === 1) {
        isDraggingRef.current = true;
        prevPosRef.current = { x: e.clientX, y: e.clientY };
        velocityRef.current.set(0, 0, 0);
      } else {
        isDraggingRef.current = false;
        velocityRef.current.set(0, 0, 0);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (pointersRef.current.size !== 1) {
        isDraggingRef.current = false;
        return;
      }
      if (!isDraggingRef.current || !diskRef.current || !cameraRef.current) return;

      const dx = (e.clientX - prevPosRef.current.x) / sizeRef.current.width;
      const dy = (e.clientY - prevPosRef.current.y) / sizeRef.current.height;

      cameraRef.current.getWorldDirection(dirRef.current);
      rightRef.current.crossVectors(dirRef.current, cameraRef.current.up).normalize();
      upRef.current.crossVectors(rightRef.current, dirRef.current).normalize();

      axisRef.current.set(0, 0, 0).addScaledVector(rightRef.current, dy).addScaledVector(upRef.current, dx);

      const angle = axisRef.current.length() * 2;
      if (angle > 0.0001) {
        axisRef.current.normalize();
        quatRef.current.setFromAxisAngle(axisRef.current, angle);
        diskRef.current.quaternion.premultiply(quatRef.current);
        velocityRef.current.copy(axisRef.current).multiplyScalar(angle * INERTIA_STRENGTH);
      }

      prevPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onUp = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      isDraggingRef.current = false;
    };

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  // 관성 회전
  useFrame(() => {
    if (!diskRef.current) return;
    if (!isDraggingRef.current && velocityRef.current.length() > 0.0001) {
      const angle = velocityRef.current.length();
      quatRef.current.setFromAxisAngle(
        axisRef.current.copy(velocityRef.current).normalize(),
        angle
      );
      diskRef.current.quaternion.premultiply(quatRef.current);
      velocityRef.current.multiplyScalar(INERTIA_DAMPING);
    } else if (!isDraggingRef.current) {
      velocityRef.current.set(0, 0, 0);
    }
  });

  return null;
}
