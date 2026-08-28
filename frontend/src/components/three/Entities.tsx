"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Line, Text } from "@react-three/drei";
import * as THREE from "three";

/**
 * The payments infrastructure: wireframe entities (banks, gateways, servers,
 * ledgers) orbiting the disc, each labelled and tethered to the core by a
 * connector line — the structure that makes the field read as a real system.
 */

interface Entity {
  label: string;
  angle: number; // radians around the disc
  radius: number;
  y: number;
  size: number;
}

const ENTITIES: Entity[] = [
  { label: "PAYMENT GATEWAY", angle: 0.3, radius: 40, y: 7, size: 3.4 },
  { label: "ACQUIRING BANK", angle: 1.1, radius: 46, y: 2, size: 4.0 },
  { label: "ISSUING BANK", angle: 2.0, radius: 42, y: 9, size: 3.0 },
  { label: "UPI SWITCH", angle: 2.8, radius: 38, y: 3, size: 2.6 },
  { label: "CORE LEDGER", angle: 3.7, radius: 47, y: 6, size: 3.6 },
  { label: "RISK ENGINE", angle: 4.5, radius: 40, y: 11, size: 2.8 },
  { label: "SETTLEMENT", angle: 5.2, radius: 44, y: 1, size: 3.2 },
  { label: "FRAUD DETECTION", angle: 5.9, radius: 39, y: 8, size: 2.4 },
];

function EntityNode({ entity }: { entity: Entity }) {
  const pos = useMemo<[number, number, number]>(
    () => [
      Math.cos(entity.angle) * entity.radius,
      entity.y,
      Math.sin(entity.angle) * entity.radius,
    ],
    [entity]
  );

  const edges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(entity.size, entity.size, entity.size)),
    [entity.size]
  );

  return (
    <group>
      {/* connector from core to entity */}
      <Line
        points={[[0, 0, 0], pos]}
        color="#0e3a6e"
        lineWidth={1}
        transparent
        opacity={0.35}
      />

      {/* wireframe box */}
      <group position={pos}>
        <lineSegments>
          <primitive object={edges} attach="geometry" />
          <lineBasicMaterial color="#9bd0ff" transparent opacity={0.4} />
        </lineSegments>

        {/* label */}
        <Billboard position={[0, entity.size / 2 + 1.6, 0]}>
          <Text
            fontSize={0.95}
            color="#8a8f98"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.18}
            outlineWidth={0}
          >
            {entity.label}
          </Text>
        </Billboard>
      </group>
    </group>
  );
}

export default function Entities({ progress }: { progress: RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    // entities drift slowly around the core; fade up out of the enter beat
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.012;
      const vis = THREE.MathUtils.smoothstep(progress.current, 0.05, 0.16);
      groupRef.current.visible = vis > 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      {ENTITIES.map((e) => (
        <EntityNode key={e.label} entity={e} />
      ))}
    </group>
  );
}
