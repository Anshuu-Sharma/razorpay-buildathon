"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import ParticleField from "./ParticleField";
import Entities from "./Entities";
import { RadarRings, RadialSpokes } from "./Structure";

const CORE = new THREE.Vector3(0, 0, 0);

// Camera journey: enter → top-down radar → tilt into leak → below → engine →
// ascent → 3/4 galaxy hero.
const KEYS: { p: number; pos: [number, number, number]; look: [number, number, number] }[] = [
  { p: 0.0, pos: [0, 34, 58], look: [0, 0, 0] },
  { p: 0.14, pos: [0, 56, 5], look: [0, 0, 0] },
  { p: 0.3, pos: [0, 24, 44], look: [0, -3, 0] },
  { p: 0.44, pos: [0, 12, 44], look: [0, -2, 0] },
  { p: 0.58, pos: [0, 7, 34], look: [0, 0, 0] },
  { p: 0.72, pos: [0, 10, 42], look: [0, 3, 0] },
  { p: 0.86, pos: [0, 16, 48], look: [0, 3, 0] },
  { p: 1.0, pos: [0, 14, 54], look: [0, 3, 0] },
];

const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

function CameraRig({ progress }: { progress: RefObject<number> }) {
  const { camera } = useThree();
  const smoothed = useRef(0);
  const pos = useMemo(() => new THREE.Vector3(...KEYS[0].pos), []);
  const look = useMemo(() => new THREE.Vector3(...KEYS[0].look), []);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    smoothed.current += (progress.current - smoothed.current) * Math.min(1, delta * 2.5);
    const p = smoothed.current;

    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const k0 = KEYS[i];
    const k1 = KEYS[i + 1];
    const t = smootherstep(Math.min(1, Math.max(0, (p - k0.p) / (k1.p - k0.p))));

    a.set(...k0.pos);
    b.set(...k1.pos);
    pos.lerpVectors(a, b, t);
    a.set(...k0.look);
    b.set(...k1.look);
    look.lerpVectors(a, b, t);

    const time = performance.now() * 0.0004;
    camera.position.set(
      pos.x + Math.sin(time) * 0.5,
      pos.y + Math.cos(time * 0.8) * 0.35,
      pos.z
    );
    camera.lookAt(look);
  });

  return null;
}

function Core({ progress }: { progress: RefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const ignite = THREE.MathUtils.smoothstep(progress.current, 0.5, 0.72);
    const scale = 0.6 + ignite * 0.9;
    if (meshRef.current) meshRef.current.scale.setScalar(scale);
    if (haloRef.current) haloRef.current.scale.setScalar(scale * 2.4);
    if (lightRef.current) lightRef.current.intensity = 6 + ignite * 26;
    if (matRef.current) matRef.current.opacity = 0.5 + ignite * 0.5;
    if (haloMatRef.current) haloMatRef.current.opacity = 0.1 + ignite * 0.2;
  });

  return (
    <group position={CORE}>
      {/* soft additive halo (fakes bloom around the core) */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color="#025ee8"
          transparent
          opacity={0.18}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* bright core */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial ref={matRef} color="#dbe8ff" transparent toneMapped={false} />
      </mesh>
      <pointLight ref={lightRef} color="#025ee8" distance={90} decay={1.4} />
    </group>
  );
}

export default function Scene({ progress }: { progress: RefObject<number> }) {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 46, 130]} />
      <ambientLight intensity={0.15} />

      <CameraRig progress={progress} />

      <RadarRings />
      <RadialSpokes progress={progress} />
      <ParticleField progress={progress} />
      <Entities progress={progress} />
      <Core progress={progress} />
    </>
  );
}
