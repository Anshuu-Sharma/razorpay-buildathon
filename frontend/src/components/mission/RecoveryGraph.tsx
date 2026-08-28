"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";

/**
 * The live recovery DAG. Five glowing nodes wired left-to-right; each ignites in
 * the class accent colour as its SSE audit event arrives, and edges light as the
 * downstream node is reached. Bloom does the heavy lifting on the glow.
 *
 * WAIT stays dark for classes that don't defer, so Class 3 (salary-cycle shift)
 * is visibly distinct — its Wait node is the only one that lights mid-flow.
 */

const NODES = [
  { key: "INGEST", label: "Ingest" },
  { key: "DIAGNOSE", label: "Diagnose" },
  { key: "WAIT", label: "Wait" },
  { key: "EXECUTE_INTERVENTION", label: "Execute" },
  { key: "RECONCILE", label: "Reconcile" },
] as const;

const X = [-6, -3, 0, 3, 6];
const DARK = "#0a0e14";

function Node({
  x,
  color,
  reached,
  active,
  label,
}: {
  x: number;
  color: string;
  reached: boolean;
  active: boolean;
  label: string;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    const target = reached ? (active ? 3.4 : 1.7) : 0.1;
    const mat = matRef.current;
    if (mat) {
      mat.emissiveIntensity +=
        (target - mat.emissiveIntensity) * Math.min(1, dt * 4);
    }
    const mesh = meshRef.current;
    if (mesh) {
      const pulse = active ? 1 + Math.sin(performance.now() * 0.006) * 0.08 : 1;
      mesh.scale.setScalar(mesh.scale.x + (pulse - mesh.scale.x) * Math.min(1, dt * 6));
    }
  });

  return (
    <group position={[x, 0, 0]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.55, 40, 40]} />
        <meshStandardMaterial
          ref={matRef}
          color={reached ? color : DARK}
          emissive={color}
          emissiveIntensity={0.1}
          roughness={0.35}
          metalness={0.15}
        />
      </mesh>
      {/* halo ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.015, 12, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={reached ? 0.9 : 0.12}
          transparent
          opacity={reached ? 0.7 : 0.2}
        />
      </mesh>
      <Html position={[0, -1.5, 0]} center distanceFactor={12} pointerEvents="none">
        <span
          className="wire-label whitespace-nowrap"
          style={{ color: reached ? "#f4f3ef" : "#4a4f57" }}
        >
          {label}
        </span>
      </Html>
    </group>
  );
}

function Edge({
  x1,
  x2,
  color,
  lit,
}: {
  x1: number;
  x2: number;
  color: string;
  lit: boolean;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, dt) => {
    const target = lit ? 1.5 : 0.05;
    const mat = matRef.current;
    if (mat) {
      mat.emissiveIntensity +=
        (target - mat.emissiveIntensity) * Math.min(1, dt * 3);
    }
  });
  const mid = (x1 + x2) / 2;
  const len = Math.abs(x2 - x1) - 1.3;
  return (
    <mesh position={[mid, 0, 0]}>
      <boxGeometry args={[len, 0.035, 0.035]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={0.05}
      />
    </mesh>
  );
}

export default function RecoveryGraph({
  reachedNodes,
  activeNode,
  accent,
}: {
  reachedNodes: string[];
  activeNode: string | null;
  accent: string;
}) {
  const reached = new Set(reachedNodes);

  return (
    <Canvas
      camera={{ position: [0, 0.4, 13], fov: 46 }}
      gl={{ antialias: true, alpha: true, failIfMajorPerformanceCaveat: false }}
      dpr={[1, 1.75]}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 4, 6]} intensity={12} distance={30} />

      {NODES.map((n, i) => (
        <Node
          key={n.key}
          x={X[i]}
          label={n.label}
          color={accent}
          reached={reached.has(n.key)}
          active={activeNode === n.key}
        />
      ))}
      {NODES.slice(0, -1).map((n, i) => (
        <Edge
          key={n.key}
          x1={X[i]}
          x2={X[i + 1]}
          color={accent}
          lit={reached.has(NODES[i + 1].key)}
        />
      ))}

      <EffectComposer>
        <Bloom
          intensity={1.3}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
