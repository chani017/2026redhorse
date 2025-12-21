"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { Mesh, Vector3, Quaternion, Camera, VideoTexture, MeshStandardMaterial, LinearFilter, DoubleSide, Group, Object3D, BufferGeometry, RepeatWrapping, TextureLoader, Texture } from "three";
import Hls from "hls.js";

interface DiskProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

function Disk({ videoRef }: DiskProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const topFaceRef = useRef<Mesh>(null);
  const bottomFaceRef = useRef<Mesh>(null);
  const textureRef = useRef<VideoTexture | null>(null);
  const textureBackRef = useRef<Texture | null>(null);
  const scaleRef = useRef(1.0); // 확대/축소 값
  
  // 채도 값 조절 (여기서 수치를 변경하세요)
  // 1.0 = 원본, 0.0 = 흑백, >1.0 = 채도 증가
  const SATURATION = 2;
  
  // 대비 값 조절 (여기서 수치를 변경하세요)
  // 1.0 = 원본, >1.0 = 대비 증가, <1.0 = 대비 감소
  const CONTRAST = 1.0;
  
  // 색조 값 조절 (여기서 수치를 변경하세요)
  // 0.0 = 원본, 양수/음수 = 색조 회전 (도 단위, -180 ~ 180)
  const HUE = -5.0;
  
  // 확대/축소 최소/최대값
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3.0;
  const ZOOM_SPEED = 0.1; // 확대/축소 속도
  
  // 초기 회전값 및 scale 설정
  // 현재 로컬 웹에서 설정한 각도를 기본값으로 설정하세요
  // P 키를 눌러 현재 각도를 확인한 후, 아래 값으로 교체하세요
  useEffect(() => {
    if (groupRef.current) {
      // 기본값: 원하는 각도로 수정하세요
      groupRef.current.rotation.set(
        0.91,  // x축 회전 (라디안)
        0.11,  // y축 회전 (라디안)
        0.35   // z축 회전 (라디안)
      );
      // 초기 scale 설정
      groupRef.current.scale.set(scaleRef.current, scaleRef.current, scaleRef.current);
    }
  }, []);

  // 상단 비디오 텍스처 설정
  useEffect(() => {
    if (!videoRef.current || !topFaceRef.current) return;

    const video = videoRef.current;
    const videoUrl = video.src;
    
    // 비디오 속성 설정
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    
    // VideoTexture 생성 (비디오가 로드되기 전에 생성)
    const texture = new VideoTexture(video);
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    const repeatValue = 0.95;
    texture.repeat.set(repeatValue, repeatValue);
    const offsetValue = (1 - repeatValue) / 2;
    texture.offset.set(offsetValue, offsetValue);
    textureRef.current = texture;
    
    // HLS 형식인지 확인하고 hls.js로 로드
    let hls: Hls | null = null;
    
    if (videoUrl.includes('.m3u8')) {
      // HLS 형식인 경우 hls.js 사용
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
          console.log("Mux 비디오 매니페스트 파싱 완료");
          video.play().catch((err) => {
            console.error("비디오 재생 실패:", err);
          });
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS 오류:", data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error("네트워크 오류, 재시도 중...");
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error("미디어 오류, 복구 시도 중...");
                hls?.recoverMediaError();
                break;
              default:
                console.error("치명적 오류, 재생 불가");
                hls?.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari 네이티브 HLS 지원
        video.src = videoUrl;
        video.addEventListener('loadedmetadata', () => {
          console.log("Safari HLS 비디오 로드 완료");
          video.play().catch((err) => {
            console.error("비디오 재생 실패:", err);
          });
        });
      } else {
        console.error("HLS를 지원하지 않는 브라우저입니다.");
      }
    } else {
      // 일반 MP4 형식
      video.src = videoUrl;
      video.load();
    }

    // 비디오 로드 및 재생
    const handleCanPlay = () => {
      console.log("비디오 재생 준비 완료");
      video.play().catch((err) => {
        console.error("비디오 재생 실패:", err);
      });
    };

    const handleLoadedData = () => {
      console.log("비디오 데이터 로드 완료");
      // 비디오가 로드된 후 텍스처를 재질에 적용
      if (topFaceRef.current && topFaceRef.current.material) {
        const material = topFaceRef.current.material as MeshStandardMaterial;
        material.map = texture;
        
        // 채도, 대비, 색조 조절을 위한 셰이더 수정
        material.onBeforeCompile = (shader) => {
          if (!shader.uniforms.saturation) {
            shader.uniforms.saturation = { value: SATURATION };
          }
          if (!shader.uniforms.contrast) {
            shader.uniforms.contrast = { value: CONTRAST };
          }
          if (!shader.uniforms.hue) {
            shader.uniforms.hue = { value: HUE };
          }
          
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `
            #include <common>
            uniform float saturation;
            uniform float contrast;
            uniform float hue;
            
            // RGB to HSV 변환
            vec3 rgb2hsv(vec3 c) {
              vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
              vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
              vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
              
              float d = q.x - min(q.w, q.y);
              float e = 1.0e-10;
              return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
            }
            
            // HSV to RGB 변환
            vec3 hsv2rgb(vec3 c) {
              vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
              vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
              return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
            }
            `
          );
          
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>
            
            // 대비 조절
            diffuseColor.rgb = (diffuseColor.rgb - vec3(0.5)) * contrast + vec3(0.5);
            
            // 색조 조절 (RGB -> HSV -> Hue 조절 -> RGB)
            vec3 hsv = rgb2hsv(diffuseColor.rgb);
            hsv.x = mod(hsv.x + hue / 360.0, 1.0);
            diffuseColor.rgb = hsv2rgb(hsv);
            
            // 채도 조절
            float gray = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            diffuseColor.rgb = mix(vec3(gray), diffuseColor.rgb, saturation);
            `
          );
        };
        
        material.needsUpdate = true;
      }
    };
    
    const handleError = (e: Event) => {
      console.error("비디오 로드 오류:", e);
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleError);
    
    // 비디오 로드 시작 (HLS가 아닌 경우)
    if (!videoUrl.includes('.m3u8')) {
      video.load();
    }

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);
      if (hls) {
        hls.destroy();
      }
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
  }, [videoRef, SATURATION, CONTRAST, HUE]);

  // 하단 이미지 텍스처 설정
  useEffect(() => {
    if (!bottomFaceRef.current) return;

    const loader = new TextureLoader();
    
    // 이미지 텍스처 로드
    loader.load(
      '/horse_back.png', // public 폴더에 horse_back.png 파일을 넣으세요
      (texture) => {
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        const repeatValue = 0.95;
        // 좌우 반전을 위해 repeat의 x 값을 음수로 설정
        texture.repeat.set(-repeatValue, repeatValue);
        // 음수 repeat를 사용할 때는 offset 계산이 달라짐
        // x축은 음수이므로 offset도 반대로 계산
        const offsetValue = (1 - repeatValue) / 2;
        texture.offset.set(1 - offsetValue, offsetValue); // x축은 반대로, y축은 정상
        textureBackRef.current = texture;

        // 이미지가 로드된 후 텍스처를 재질에 적용
        if (bottomFaceRef.current && bottomFaceRef.current.material) {
          const material = bottomFaceRef.current.material as MeshStandardMaterial;
          material.map = texture;
          
          // 채도 및 대비 조절을 위한 셰이더 수정 (색조는 상단면에만 적용)
          material.onBeforeCompile = (shader) => {
            if (!shader.uniforms.saturation) {
              shader.uniforms.saturation = { value: SATURATION };
            }
            if (!shader.uniforms.contrast) {
              shader.uniforms.contrast = { value: CONTRAST };
            }
            
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <common>',
              `
              #include <common>
              uniform float saturation;
              uniform float contrast;
              `
            );
            
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <color_fragment>',
              `
              #include <color_fragment>
              
              // 대비 조절
              diffuseColor.rgb = (diffuseColor.rgb - vec3(0.5)) * contrast + vec3(0.5);
              
              // 채도 조절
              float gray = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
              diffuseColor.rgb = mix(vec3(gray), diffuseColor.rgb, saturation);
              `
            );
          };
          
          material.needsUpdate = true;
        }
      },
      undefined,
      (error) => {
        console.error("하단 이미지 로드 실패:", error);
      }
    );

    return () => {
      if (textureBackRef.current) {
        textureBackRef.current.dispose();
      }
    };
  }, [SATURATION, CONTRAST]);

  // 확대/축소 이벤트 리스너
  useEffect(() => {
    let initialDistance = 0;
    let initialScale = 1.0;
    let touches: Touch[] = [];

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // 휠 방향에 따라 확대/축소
      const delta = e.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
      scaleRef.current = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current + delta));
      
      // 그룹의 scale 업데이트
      if (groupRef.current) {
        groupRef.current.scale.set(scaleRef.current, scaleRef.current, scaleRef.current);
      }
    };

    // 두 터치 포인트 사이의 거리 계산
    const getDistance = (touch1: Touch, touch2: Touch) => {
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      touches = Array.from(e.touches);
      
      // 두 개의 터치 포인트가 있을 때만 핀치 제스처 시작
      if (touches.length === 2) {
        initialDistance = getDistance(touches[0], touches[1]);
        initialScale = scaleRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      
      touches = Array.from(e.touches);
      
      // 두 개의 터치 포인트가 있을 때만 핀치 제스처 처리
      if (touches.length === 2 && initialDistance > 0) {
        const currentDistance = getDistance(touches[0], touches[1]);
        const scaleRatio = currentDistance / initialDistance;
        
        // 초기 scale에 비율을 곱하여 새로운 scale 계산
        const newScale = initialScale * scaleRatio;
        scaleRef.current = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
        
        // 그룹의 scale 업데이트
        if (groupRef.current) {
          groupRef.current.scale.set(scaleRef.current, scaleRef.current, scaleRef.current);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touches = Array.from(e.touches);
      
      // 터치 포인트가 2개 미만이면 핀치 제스처 종료
      if (touches.length < 2) {
        initialDistance = 0;
        initialScale = scaleRef.current;
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: false });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  // 비디오 프레임 업데이트
  useFrame(() => {
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
    // 이미지는 업데이트할 필요 없음
  });

  // 원기둥의 상단 면을 투명하게 만들기
  useEffect(() => {
    if (!meshRef.current) return;

    const geometry = meshRef.current.geometry as BufferGeometry;
    
    if (geometry.groups && geometry.groups.length >= 3) {
      const materials = [
        new MeshStandardMaterial({ color: "#f7eeee" }), // 측면
        new MeshStandardMaterial({ transparent: true, opacity: 0 }), // 상단
        new MeshStandardMaterial({ transparent: true, opacity: 0 }), // 하단
      ];
      meshRef.current.material = materials;
    }
  }, []);

  return (
    <group ref={groupRef} position={[0, 0.2, 0]}>
      {/* 원기둥 본체 (측면과 하단만 표시, 상단은 투명) */}
      <mesh ref={meshRef}>
        <cylinderGeometry 
          args={[
            2,    // 상단 반지름
            2,    // 하단 반지름
            0.05,  // 높이 (두께) - 이 값을 조절하면 두께가 변경됩니다
            128    // 세그먼트 수 (원의 부드러움)
          ]} 
        />
        <meshStandardMaterial color="#f7eeee" />
      </mesh>
      {/* 상단 면 (비디오 표시) - 원기둥의 상단에 수평으로 배치, 가운데 구멍 */}
      <mesh 
        ref={topFaceRef}
        position={[0, 0.025, 0]} // 원기둥의 상단 위치 (높이 0.05의 절반인 0.025)
        rotation={[-Math.PI / 2, 0, 0]} // X축으로 -90도 회전하여 수평으로 배치
      >
        <ringGeometry args={[0.062, 2, 128]} /> {/* 내부 반지름 0.05 (작은 구멍), 외부 반지름 2 */}
        <meshStandardMaterial 
          side={DoubleSide} // 양면 모두 표시
        />
      </mesh>
      {/* 하단 면 (비디오 표시) - 원기둥의 하단에 수평으로 배치, 가운데 구멍 */}
      <mesh 
        ref={bottomFaceRef}
        position={[0, -0.025, 0]} // 원기둥의 하단 위치 (높이 0.05의 절반인 -0.025)
        rotation={[-Math.PI / 2, 0, 0]} // X축으로 -90도 회전하여 수평으로 배치
      >
        <ringGeometry args={[0.062, 2, 128]} /> {/* 내부 반지름 0.062 (작은 구멍), 외부 반지름 2 */}
        <meshStandardMaterial 
          side={DoubleSide} // 양면 모두 표시
        />
      </mesh>
      {/* 구멍 내부 터널 벽 - 작은 실린더로 구멍의 내부 벽면을 채움 (위아래 면은 투명) */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry 
          args={[
            0.062,  // 상단 반지름 (구멍 반지름과 동일)
            0.062,  // 하단 반지름 (구멍 반지름과 동일)
            0.05,   // 높이 (원기둥의 두께와 동일)
            128,    // 세그먼트 수
            1,      // heightSegments
            true    // openEnded: true (상단과 하단 면을 열어서 투명하게)
          ]} 
        />
        <meshStandardMaterial 
          color="#f7eeee" 
          side={DoubleSide} // 양면 모두 표시
        />
      </mesh>
    </group>
  );
}

function RotationControls() {
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const rotationVelocity = useRef(new Vector3(0, 0, 0));
  const diskRef = useRef<Object3D | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const activePointersRef = useRef<Set<number>>(new Set()); // 활성 포인터 ID 추적
  const { camera, size, scene } = useThree();

  // 관성 효과 강도 조절 (여기서 수치를 변경하세요)
  const INERTIA_STRENGTH = 0.3; // 초기 관성 속도 (값이 클수록 더 강한 관성)
  const INERTIA_DAMPING = 0.98; // 관성 감쇠율 (값이 클수록 더 오래 지속, 0.95~0.99 권장)

  // 참조 업데이트
  useEffect(() => {
    cameraRef.current = camera;
    sizeRef.current = { width: size.width, height: size.height };
  }, [camera, size]);

  // Disk 그룹 참조 찾기 (원기둥이 포함된 그룹)
  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof Group && object.children.length > 0) {
        // 원기둥 메시를 포함하는 그룹 찾기
        const hasCylinder = object.children.some(
          (child) => child instanceof Mesh && child.geometry.type === "CylinderGeometry"
        );
        if (hasCylinder) {
          diskRef.current = object;
        }
      }
    });
  }, [scene]);

  // 현재 각도를 콘솔에 출력하는 기능 (P 키로 현재 각도 확인)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        if (diskRef.current) {
          const rotation = diskRef.current.rotation;
          console.log('현재 원반 각도 (라디안):', {
            x: rotation.x,
            y: rotation.y,
            z: rotation.z
          });
          console.log('현재 원반 각도 (도):', {
            x: (rotation.x * 180) / Math.PI,
            y: (rotation.y * 180) / Math.PI,
            z: (rotation.z * 180) / Math.PI
          });
          console.log('코드에 사용할 값:');
          console.log(`meshRef.current.rotation.set(${rotation.x}, ${rotation.y}, ${rotation.z});`);
        }
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);

  // 전역 이벤트 리스너 등록
  useEffect(() => {
    const handleGlobalPointerDown = (e: PointerEvent) => {
      // 활성 포인터 추가
      activePointersRef.current.add(e.pointerId);
      
      // 단일 터치일 때만 회전 활성화 (두 개 이상의 터치 포인트가 있으면 회전 비활성화)
      if (activePointersRef.current.size === 1) {
        isDraggingRef.current = true;
        previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
        rotationVelocity.current.set(0, 0, 0);
      } else {
        // 두 개 이상의 터치 포인트가 있으면 회전 비활성화
        isDraggingRef.current = false;
        rotationVelocity.current.set(0, 0, 0);
      }
    };

    const handleGlobalPointerMove = (e: PointerEvent) => {
      // 단일 터치일 때만 회전 처리
      if (activePointersRef.current.size !== 1) {
        isDraggingRef.current = false;
        return;
      }
      
      if (!isDraggingRef.current || !diskRef.current || !cameraRef.current) return;

      const deltaX = (e.clientX - previousMousePositionRef.current.x) / sizeRef.current.width;
      const deltaY = (e.clientY - previousMousePositionRef.current.y) / sizeRef.current.height;

      // 카메라의 방향 벡터 계산
      const cameraDirection = new Vector3();
      cameraRef.current.getWorldDirection(cameraDirection);
      
      // 카메라의 오른쪽과 위쪽 벡터 계산
      const cameraRight = new Vector3();
      cameraRight.crossVectors(cameraDirection, cameraRef.current.up).normalize();
      const cameraUp = new Vector3();
      cameraUp.crossVectors(cameraRight, cameraDirection).normalize();

      // 마우스 움직임을 3D 공간의 회전 벡터로 변환
      const rotationAxis = new Vector3();
      rotationAxis.addScaledVector(cameraRight, deltaY); // 위아래 방향 반전
      rotationAxis.addScaledVector(cameraUp, deltaX);
      
      // 회전 각도 계산
      const angle = rotationAxis.length() * 2;
      if (angle > 0.0001) {
        rotationAxis.normalize();
        
        // Quaternion을 사용하여 회전 적용
        const quaternion = new Quaternion().setFromAxisAngle(rotationAxis, angle);
        diskRef.current.quaternion.multiplyQuaternions(quaternion, diskRef.current.quaternion);
        
        // 관성 효과를 위한 속도 저장
        rotationVelocity.current.copy(rotationAxis.multiplyScalar(angle * INERTIA_STRENGTH));
      }

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
      // 활성 포인터 제거
      activePointersRef.current.delete(e.pointerId);
      
      // 모든 포인터가 제거되면 회전 비활성화
      if (activePointersRef.current.size === 0) {
        isDraggingRef.current = false;
      } else if (activePointersRef.current.size === 1) {
        // 다시 단일 터치가 되면 회전 활성화 (하지만 드래그는 시작하지 않음)
        // 다음 pointerdown에서 활성화됨
        isDraggingRef.current = false;
      } else {
        // 여전히 두 개 이상의 터치 포인트가 있으면 회전 비활성화
        isDraggingRef.current = false;
      }
    };
    
    const handleGlobalPointerCancel = (e: PointerEvent) => {
      // 포인터 취소 시에도 동일하게 처리
      activePointersRef.current.delete(e.pointerId);
      if (activePointersRef.current.size === 0) {
        isDraggingRef.current = false;
      } else if (activePointersRef.current.size === 1) {
        isDraggingRef.current = false;
      } else {
        isDraggingRef.current = false;
      }
    };

    window.addEventListener("pointerdown", handleGlobalPointerDown);
    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerCancel);

    return () => {
      window.removeEventListener("pointerdown", handleGlobalPointerDown);
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerCancel);
    };
  }, []);

  // 관성 효과
  useFrame(() => {
    if (!diskRef.current) return;

    if (!isDraggingRef.current && rotationVelocity.current.length() > 0.0001) {
      const angle = rotationVelocity.current.length();
      const axis = rotationVelocity.current.clone().normalize();
      
      const quaternion = new Quaternion().setFromAxisAngle(axis, angle);
      diskRef.current.quaternion.multiplyQuaternions(quaternion, diskRef.current.quaternion);
      
      // INERTIA_DAMPING 값 사용 (값이 클수록 더 오래 지속)
      rotationVelocity.current.multiplyScalar(INERTIA_DAMPING);
    } else if (!isDraggingRef.current) {
      rotationVelocity.current.set(0, 0, 0);
    }
  });

  return null;
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 스크롤 방지
  useEffect(() => {
    // 스크롤 방지 함수
    const preventScroll = (e: Event) => {
      e.preventDefault();
    };

    // 터치 이벤트로 인한 스크롤 방지
    document.addEventListener("touchmove", preventScroll, { passive: false });
    document.addEventListener("wheel", preventScroll, { passive: false });
    document.addEventListener("scroll", preventScroll, { passive: false });

    return () => {
      document.removeEventListener("touchmove", preventScroll);
      document.removeEventListener("wheel", preventScroll);
      document.removeEventListener("scroll", preventScroll);
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f10000]">
      {/* 비디오 요소를 Canvas 밖에 배치 */}
      <video
        ref={videoRef}
        src={`https://stream.mux.com/xQtxxKOx6bKL00GVU02dfY100L3t0000Lzuser9o4khqGunM.m3u8`} // Mux 비디오 스트리밍 URL (HLS)
        style={{ display: "none" }}
        crossOrigin="anonymous"
        loop
        muted
        playsInline
      />
      <Canvas
        camera={{ position: [0, 0, 18], fov: 25 }}
        style={{ width: "100vw", height: "100vh" }}
      >
        <ambientLight intensity={1} />
        <directionalLight position={[0, 3, 5]} intensity={1} />
        <Disk videoRef={videoRef} />
        <RotationControls />
      </Canvas>
    </div>
  );
}
