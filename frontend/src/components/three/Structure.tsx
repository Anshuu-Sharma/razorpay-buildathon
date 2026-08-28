"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/lib/prng";

/** Concentric radar rings on the disc plane — the "technical readout" look. */
export function RadarRings() {
  const groupRef = useRef<THREE.Group>(null);

  // Build the line objects once and keep them stable across renders.
  const rings = useMemo(() => {
    const radii = [12, 20, 28, 36, 44, 52];
    return radii.map((radius, i) => {
      const pts: THREE.Vector3[] = [];
      const seg = 128;
      for (let j = 0; j <= seg; j++) {
        const a = (j / seg) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: "#0e3a6e",
        transparent: true,
        opacity: 0.5 - i * 0.05,
      });
      return new THREE.Line(geo, mat);
    });
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.02;
  });

  return (
    <group ref={groupRef}>
      {rings.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

/** Radial spokes fanning out from the core — the sunburst in the reveal beats. */
export function RadialSpokes({ progress }: { progress: RefObject<number> }) {
  const matRef = useRef<THREE.LineBasicMaterial>(null);

  const geometry = useMemo(() => {
    const rand = mulberry32(0x5c0e);
    const count = 110;
    const positions = new Float32Array(count * 2 * 3);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const len = 18 + rand() * 34;
      const y = (rand() - 0.5) * 1.5;
      // from core outward
      positions[i * 6 + 0] = 0;
      positions[i * 6 + 1] = 0;
      positions[i * 6 + 2] = 0;
      positions[i * 6 + 3] = Math.cos(a) * len;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = Math.sin(a) * len;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame(() => {
    // spokes light up as the engine ignites, settle afterward
    const on = THREE.MathUtils.smoothstep(progress.current, 0.5, 0.72);
    if (matRef.current) matRef.current.opacity = on * 0.28;
  });

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        ref={matRef}
        color="#025ee8"
        transparent
        opacity={0}
        toneMapped={false}
      />
    </lineSegments>
  );
}
