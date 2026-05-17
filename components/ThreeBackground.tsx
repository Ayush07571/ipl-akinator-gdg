'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 8;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // 3. Ambient & Directional Lighting (IPL Gold + Deep Stadium Lights)
    const ambientLight = new THREE.AmbientLight(0x0f0f2a, 1.8);
    scene.add(ambientLight);

    const goldLight = new THREE.DirectionalLight(0xf5a623, 3);
    goldLight.position.set(5, 5, 5);
    scene.add(goldLight);

    const blueLight = new THREE.DirectionalLight(0x1e3a8a, 4);
    blueLight.position.set(-5, -5, 2);
    scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0x8a2be2, 5, 20);
    purpleLight.position.set(0, 0, 5);
    scene.add(purpleLight);

    // 4. Detailed 3D Cricket Ball Group
    const ballGroup = new THREE.Group();

    // Ball Core (Sphere with wireframe overlay)
    const coreGeometry = new THREE.SphereGeometry(2, 32, 32);
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: 0x8a0e1c, // Deep leather cherry red
      shininess: 120,
      specular: 0xaaaaaa,
      flatShading: false,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    ballGroup.add(coreMesh);

    // Ball Wireframe Overlay (for that tech/akinator AI feel)
    const wireframeGeometry = new THREE.SphereGeometry(2.02, 24, 24);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xf5a623, // IPL gold wireframe
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const wireframeMesh = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    ballGroup.add(wireframeMesh);

    // Ball Seam (Torus wrapping the core)
    const seamGeometry = new THREE.TorusGeometry(2.01, 0.08, 8, 64);
    const seamMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff, // White stitched seam
      shininess: 60,
      specular: 0x444444,
    });
    const seamMesh = new THREE.Mesh(seamGeometry, seamMaterial);
    seamMesh.rotation.x = Math.PI / 2; // Position seam around the center
    ballGroup.add(seamMesh);

    // Stitching effect (two smaller toruses flanking the main seam)
    const seamGeomLeft = new THREE.TorusGeometry(1.97, 0.02, 4, 64);
    const seamMatLeft = new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.4 });
    const seamMeshLeft = new THREE.Mesh(seamGeomLeft, seamMatLeft);
    seamMeshLeft.rotation.x = Math.PI / 2;
    seamMeshLeft.position.y = 0.05;
    ballGroup.add(seamMeshLeft);

    const seamMeshRight = seamMeshLeft.clone();
    seamMeshRight.position.y = -0.05;
    ballGroup.add(seamMeshRight);

    scene.add(ballGroup);

    // 5. Floating Stadium Embers / Particle System
    const particleCount = 700;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      // Position
      positions[i] = (Math.random() - 0.5) * 22; // x
      positions[i + 1] = (Math.random() - 0.5) * 22; // y
      positions[i + 2] = (Math.random() - 0.5) * 22; // z

      // Color (IPL Gold/Yellow and Mystic Blue/Purple)
      const isGold = Math.random() > 0.45;
      if (isGold) {
        colors[i] = 0.96; // R
        colors[i + 1] = 0.65; // G
        colors[i + 2] = 0.14; // B
      } else {
        colors[i] = 0.23; // R
        colors[i + 1] = 0.51; // G
        colors[i + 2] = 0.96; // B
      }
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle texture (drawn dynamically inside a Canvas2D to prevent extra bundle files)
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      map: particleTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 6. Interactive Mouse Parallax
    let targetX = 0;
    let targetY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX - window.innerWidth / 2) / 120;
      mouseY = (event.clientY - window.innerHeight / 2) / 120;
    };

    window.addEventListener('mousemove', onMouseMove);

    // 7. Window Resize
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', onWindowResize);

    // 8. Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Spin the Cricket Ball
      ballGroup.rotation.y = elapsedTime * 0.18;
      ballGroup.rotation.x = elapsedTime * 0.08;
      ballGroup.rotation.z = Math.sin(elapsedTime * 0.04) * 0.15;

      // Make the ball float gently (Akinator levitation effect)
      ballGroup.position.y = Math.sin(elapsedTime * 0.4) * 0.35;

      // Spin particles (cosmic stadium atmosphere)
      particles.rotation.y = elapsedTime * 0.015;
      particles.rotation.x = elapsedTime * 0.008;

      // Smooth mouse parallax interpolation
      targetX += (mouseX - targetX) * 0.04;
      targetY += (mouseY - targetY) * 0.04;

      camera.position.x = targetX;
      camera.position.y = -targetY;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 9. Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onWindowResize);

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }

      // Dispose resources to prevent GPU leaks
      coreGeometry.dispose();
      coreMaterial.dispose();
      wireframeGeometry.dispose();
      wireframeMaterial.dispose();
      seamGeometry.dispose();
      seamMaterial.dispose();
      seamGeomLeft.dispose();
      seamMatLeft.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      particleTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none overflow-hidden bg-[#020208]"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, #0b0720 0%, #020208 100%)',
      }}
    />
  );
}
