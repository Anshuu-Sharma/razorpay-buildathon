"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/lib/prng";

/**
 * The galaxy disc — the heart of the world.
 *
 * Particles are distributed as a rotating disc (concentric rings + a dense
 * central bulge) that spins differentially like a galaxy, so payments visibly
 * stream around the core. A share are "failing": on scroll they flare red and
 * fall off the disc (the leak), then most are lifted back as recovered blue
 * light (the ascent). Colour carries cyan / violet / amber accent nodes so the
 * field reads as a live system, not two flat colours.
 */

const DISC_RADIUS = 46;
const RINGS = [11, 18, 25, 32, 39];

const vertexShader = /* glsl */ `
  attribute float aSeed;
  attribute float aType;   // 0 = healthy, 1 = failing
  uniform float uTime;
  uniform float uProgress;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float r = length(p.xz);

    // differential rotation: inner particles orbit faster (galaxy shear)
    float ang = uTime * (0.03 + 0.55 / (r + 3.0));
    float s = sin(ang), c = cos(ang);
    vec3 rp = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);

    // subtle vertical breathing
    rp.y += sin(uTime * 0.4 + aSeed * 6.2831) * 0.12;

    // leak: failing particles detach and fall below the disc
    float leak = smoothstep(0.24, 0.5, uProgress) * aType;
    float sink = leak * (8.0 + aSeed * 18.0);

    // recovery: ~70% of failing particles are lifted back by the engine
    float caught = step(aSeed, 0.72);
    float recover = smoothstep(0.55, 0.82, uProgress) * aType * caught;
    float rise = recover * (sink + 12.0 + aSeed * 6.0);

    rp.y -= sink;
    rp.y += rise;

    vec4 mv = modelViewMatrix * vec4(rp, 1.0);
    gl_Position = projectionMatrix * mv;

    // occasional brighter "hub" particles; most are fine dust
    float big = step(0.965, aSeed);
    float size = mix(1.0, 1.5, aType) + big * 1.6;
    gl_PointSize = size * (300.0 / -mv.z);

    // base white→blue, with sparse accent nodes
    vec3 col = mix(vec3(0.82, 0.88, 1.0), vec3(0.03, 0.28, 0.72), aSeed * 0.7);
    if (aSeed > 0.955)      col = vec3(0.00, 0.90, 1.00); // cyan
    else if (aSeed > 0.905) col = vec3(0.55, 0.20, 0.90); // violet
    else if (aSeed > 0.865) col = vec3(1.00, 0.62, 0.16); // amber

    vec3 failing = vec3(1.0, 0.27, 0.27);
    vec3 recovered = vec3(0.03, 0.45, 1.0);
    vColor = col;
    if (aType > 0.5) {
      vColor = mix(col, failing, leak);
      vColor = mix(vColor, recovered, recover);
    }

    float dead = (1.0 - caught) * leak * (1.0 - recover);
    vAlpha = (0.5 + aSeed * 0.4) * (1.0 - dead * 0.85);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    // soft radial falloff = a fake glow now that postprocessing bloom is gone
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float core = smoothstep(0.5, 0.0, d);
    float glow = pow(core, 2.2);
    float a = glow * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor + core * 0.15, a);
  }
`;

export default function ParticleField({
  progress,
  count = 24000,
}: {
  progress: RefObject<number>;
  count?: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const smoothed = useRef(0);

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const types = new Float32Array(count);
    const rand = mulberry32(0xa11ce);

    for (let i = 0; i < count; i++) {
      const t = rand();
      let radius: number;
      if (t < 0.22) {
        // snap a portion onto concentric rings for visible structure
        const ring = RINGS[(rand() * RINGS.length) | 0];
        radius = ring + (rand() - 0.5) * 2.4;
      } else {
        // area-uniform disc with a denser core
        radius = Math.pow(rand(), 0.65) * DISC_RADIUS;
      }
      const theta = rand() * Math.PI * 2;
      // thin disc, thicker central bulge
      const thickness = 1.2 + 5.0 * Math.exp(-radius / 9);
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = (rand() - 0.5) * thickness;
      positions[i * 3 + 2] = Math.sin(theta) * radius;

      seeds[i] = rand();
      types[i] = rand() < 0.38 ? 1 : 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute("aType", new THREE.BufferAttribute(types, 1));

    return {
      geometry: geo,
      uniforms: { uTime: { value: 0 }, uProgress: { value: 0 } },
    };
  }, [count]);

  useFrame((_, delta) => {
    smoothed.current += (progress.current - smoothed.current) * Math.min(1, delta * 3);
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta;
      matRef.current.uniforms.uProgress.value = smoothed.current;
    }
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
