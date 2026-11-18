/**
 * Snoozr - Starry Night 3D Experience (Three.js)
 * Inspired by Vincent van Gogh's The Starry Night combined with realistic celestial physics.
 * 
 * Features:
 * - Photorealistic 3D Moon with procedural lunar craters, basaltic Maria, and ray systems
 * - Physically-based directional sunlight creating crisp crater shadows along the lunar terminator
 * - Realistic Earthshine ("Da Vinci Glow") softly illuminating the dark limb
 * - 3D Van Gogh Celestial Swirl (turbulent galactic vortex)
 * - Layered Twinkling Star Field with realistic magnitudes and chromatic variations
 * - Dynamic Shooting Stars / Meteors with glowing fading particle trails
 * - Interactive Mouse Inertia Parallax & Cosmic Particle Turbulence
 */

(function () {
    'use strict';

    function isWebGLAvailable() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    if (!isWebGLAvailable()) {
        console.warn('WebGL not available; fallback to CSS starfield.');
        return;
    }

    const container = document.getElementById('starry-canvas-container');
    if (!container) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060919, 0.0015);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2500);
    camera.position.z = 450;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // --- Mouse & Interaction State ---
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - windowHalfX) * 0.12;
        mouseY = (e.clientY - windowHalfY) * 0.12;
    }, { passive: true });

    // --- Texture Generators ---
    function createStarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 235, 180, 0.85)');
        gradient.addColorStop(0.5, 'rgba(143, 148, 251, 0.4)');
        gradient.addColorStop(1, 'rgba(10, 15, 45, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        return new THREE.CanvasTexture(canvas);
    }

    function createCoronaTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(255, 230, 150, 0.85)');
        gradient.addColorStop(0.25, 'rgba(255, 195, 75, 0.45)');
        gradient.addColorStop(0.55, 'rgba(78, 130, 220, 0.18)');
        gradient.addColorStop(0.85, 'rgba(40, 70, 160, 0.05)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);

        return new THREE.CanvasTexture(canvas);
    }

    // =========================================================================
    // PHOTOREALISTIC PROCEDURAL LUNAR TEXTURE ENGINE (Diffuse + Bump Maps)
    // =========================================================================
    function createRealisticMoonMaps() {
        const width = 1024;
        const height = 512;

        // 1. Diffuse (Color / Albedo) Canvas
        const diffCanvas = document.createElement('canvas');
        diffCanvas.width = width;
        diffCanvas.height = height;
        const diffCtx = diffCanvas.getContext('2d');

        // 2. Bump (Topography / Elevation) Canvas
        const bumpCanvas = document.createElement('canvas');
        bumpCanvas.width = width;
        bumpCanvas.height = height;
        const bumpCtx = bumpCanvas.getContext('2d');

        // Base Lunar Highlands (Fine Regolith)
        diffCtx.fillStyle = '#b6b0a2';
        diffCtx.fillRect(0, 0, width, height);
        bumpCtx.fillStyle = '#808080'; // neutral height
        bumpCtx.fillRect(0, 0, width, height);

        // High frequency regolith noise
        const diffImgData = diffCtx.getImageData(0, 0, width, height);
        const bumpImgData = bumpCtx.getImageData(0, 0, width, height);
        const diffData = diffImgData.data;
        const bumpData = bumpImgData.data;

        for (let i = 0; i < diffData.length; i += 4) {
            const noise = (Math.random() - 0.5) * 22;
            diffData[i] = Math.min(255, Math.max(0, diffData[i] + noise));
            diffData[i + 1] = Math.min(255, Math.max(0, diffData[i + 1] + noise));
            diffData[i + 2] = Math.min(255, Math.max(0, diffData[i + 2] + noise * 0.8));

            const bNoise = (Math.random() - 0.5) * 16;
            bumpData[i] = Math.min(255, Math.max(0, 128 + bNoise));
            bumpData[i + 1] = bumpData[i];
            bumpData[i + 2] = bumpData[i];
        }
        diffCtx.putImageData(diffImgData, 0, 0);
        bumpCtx.putImageData(bumpImgData, 0, 0);

        // --- Major Lunar Maria (Dark Basaltic Volcanic Plains) ---
        const maria = [
            { x: 320, y: 190, rx: 110, ry: 90, opacity: 0.72 },   // Oceanus Procellarum
            { x: 470, y: 160, rx: 75, ry: 65, opacity: 0.68 },    // Mare Imbrium
            { x: 570, y: 180, rx: 65, ry: 55, opacity: 0.70 },    // Mare Serenitatis
            { x: 640, y: 220, rx: 70, ry: 60, opacity: 0.69 },    // Mare Tranquillitatis
            { x: 740, y: 190, rx: 45, ry: 40, opacity: 0.75 },    // Mare Crisium
            { x: 420, y: 260, rx: 80, ry: 55, opacity: 0.65 },    // Mare Nubium
            { x: 520, y: 250, rx: 50, ry: 45, opacity: 0.66 }     // Mare Vaporum
        ];

        maria.forEach(m => {
            const grad = diffCtx.createRadialGradient(m.x, m.y, m.rx * 0.1, m.x, m.y, m.rx);
            grad.addColorStop(0, `rgba(50, 48, 44, ${m.opacity})`);
            grad.addColorStop(0.65, `rgba(65, 62, 58, ${m.opacity * 0.8})`);
            grad.addColorStop(1, 'rgba(182, 176, 162, 0)');

            diffCtx.fillStyle = grad;
            diffCtx.beginPath();
            diffCtx.ellipse(m.x, m.y, m.rx, m.ry, Math.PI / 12, 0, Math.PI * 2);
            diffCtx.fill();

            // Maria are lower elevation in bump map
            const bGrad = bumpCtx.createRadialGradient(m.x, m.y, m.rx * 0.1, m.x, m.y, m.rx);
            bGrad.addColorStop(0, 'rgba(80, 80, 80, 0.75)');
            bGrad.addColorStop(1, 'rgba(128, 128, 128, 0)');
            bumpCtx.fillStyle = bGrad;
            bumpCtx.beginPath();
            bumpCtx.ellipse(m.x, m.y, m.rx, m.ry, Math.PI / 12, 0, Math.PI * 2);
            bumpCtx.fill();
        });

        // --- Major Impact Craters with Ray Systems & Central Peaks ---
        function stampCrater(ctxDiff, ctxBump, cx, cy, r, hasRays) {
            // 1. Ray System (like Tycho / Copernicus)
            if (hasRays) {
                const rayCount = 18;
                ctxDiff.strokeStyle = 'rgba(240, 235, 225, 0.45)';
                ctxDiff.lineWidth = 1.2;
                for (let i = 0; i < rayCount; i++) {
                    const angle = (i / rayCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
                    const rayLen = r * (4 + Math.random() * 8);
                    ctxDiff.beginPath();
                    ctxDiff.moveTo(cx, cy);
                    ctxDiff.lineTo(cx + Math.cos(angle) * rayLen, cy + Math.sin(angle) * rayLen);
                    ctxDiff.stroke();
                }
            }

            // 2. Raised Crater Rim (Bright in Diffuse & Bump)
            ctxDiff.strokeStyle = 'rgba(235, 230, 218, 0.9)';
            ctxDiff.lineWidth = Math.max(1.5, r * 0.22);
            ctxDiff.beginPath();
            ctxDiff.arc(cx, cy, r, 0, Math.PI * 2);
            ctxDiff.stroke();

            ctxBump.strokeStyle = 'rgba(230, 230, 230, 0.9)';
            ctxBump.lineWidth = Math.max(1.5, r * 0.25);
            ctxBump.beginPath();
            ctxBump.arc(cx, cy, r, 0, Math.PI * 2);
            ctxBump.stroke();

            // 3. Shadowed Crater Floor (Dark depression in Bump)
            const floorGrad = ctxDiff.createRadialGradient(cx, cy, 0, cx, cy, r * 0.85);
            floorGrad.addColorStop(0, 'rgba(95, 92, 85, 0.85)');
            floorGrad.addColorStop(1, 'rgba(120, 115, 105, 0.6)');
            ctxDiff.fillStyle = floorGrad;
            ctxDiff.beginPath();
            ctxDiff.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
            ctxDiff.fill();

            const bumpFloorGrad = ctxBump.createRadialGradient(cx, cy, 0, cx, cy, r * 0.85);
            bumpFloorGrad.addColorStop(0, 'rgba(40, 40, 40, 0.9)');
            bumpFloorGrad.addColorStop(1, 'rgba(100, 100, 100, 0.5)');
            ctxBump.fillStyle = bumpFloorGrad;
            ctxBump.beginPath();
            ctxBump.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
            ctxBump.fill();

            // 4. Central Peak (Rebound Mountain in middle)
            if (r > 10) {
                ctxDiff.fillStyle = 'rgba(245, 240, 230, 0.85)';
                ctxDiff.beginPath();
                ctxDiff.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
                ctxDiff.fill();

                ctxBump.fillStyle = 'rgba(220, 220, 220, 0.95)';
                ctxBump.beginPath();
                ctxBump.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
                ctxBump.fill();
            }
        }

        // Famous Lunar Craters
        stampCrater(diffCtx, bumpCtx, 490, 360, 28, true);   // Tycho (prominent southern rays)
        stampCrater(diffCtx, bumpCtx, 390, 190, 22, true);   // Copernicus (prominent ray system)
        stampCrater(diffCtx, bumpCtx, 340, 175, 14, true);   // Kepler
        stampCrater(diffCtx, bumpCtx, 460, 105, 20, false);  // Plato (dark floor crater)
        stampCrater(diffCtx, bumpCtx, 480, 385, 24, false);  // Clavius
        stampCrater(diffCtx, bumpCtx, 440, 150, 16, false);  // Archimedes
        stampCrater(diffCtx, bumpCtx, 290, 140, 13, true);   // Aristarchus (brightest feature)

        // Scatter 80 micro craters
        for (let i = 0; i < 85; i++) {
            const rx = Math.random() * width;
            const ry = Math.random() * height;
            const rSize = Math.random() * 6 + 2.5;
            stampCrater(diffCtx, bumpCtx, rx, ry, rSize, Math.random() > 0.85);
        }

        const diffTex = new THREE.CanvasTexture(diffCanvas);
        const bumpTex = new THREE.CanvasTexture(bumpCanvas);
        diffTex.wrapS = THREE.RepeatWrapping;
        bumpTex.wrapS = THREE.RepeatWrapping;

        return { diffTex, bumpTex };
    }

    const starTexture = createStarTexture();
    const coronaTexture = createCoronaTexture();
    const { diffTex: moonDiffTex, bumpTex: moonBumpTex } = createRealisticMoonMaps();

    // =========================================================================
    // 1. VAN GOGH SWIRLING COSMIC VORTEX (Points)
    // =========================================================================
    const swirlCount = 4200;
    const swirlGeometry = new THREE.BufferGeometry();
    const swirlPositions = new Float32Array(swirlCount * 3);
    const swirlColors = new Float32Array(swirlCount * 3);
    const swirlSizes = new Float32Array(swirlCount);
    const swirlAngles = new Float32Array(swirlCount);
    const swirlRadii = new Float32Array(swirlCount);
    const swirlSpeeds = new Float32Array(swirlCount);

    const palette = [
        new THREE.Color(0xFFE57F), // Luminous Gold
        new THREE.Color(0xFFA000), // Amber Gold
        new THREE.Color(0x82B1FF), // Ethereal Cyan
        new THREE.Color(0x7C4DFF), // Cosmic Violet
        new THREE.Color(0x448AFF), // Cobalt Ultramarine
        new THREE.Color(0xFFFFFF)  // Starlight White
    ];

    for (let i = 0; i < swirlCount; i++) {
        const armIndex = i % 3;
        const armOffset = (armIndex * 2 * Math.PI) / 3;
        const radius = Math.pow(Math.random(), 1.5) * 550 + 20;
        const angle = Math.log(radius * 0.1) * 3.5 + armOffset + (Math.random() - 0.5) * 0.8;
        const zSpread = (Math.random() - 0.5) * 120 + Math.sin(radius * 0.03) * 40;

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * (radius * 0.65) + 60;
        const z = zSpread - 100;

        swirlPositions[i * 3] = x;
        swirlPositions[i * 3 + 1] = y;
        swirlPositions[i * 3 + 2] = z;

        swirlAngles[i] = angle;
        swirlRadii[i] = radius;
        swirlSpeeds[i] = (0.0008 + (600 - radius) * 0.000003) * (i % 2 === 0 ? 1 : 1.15);

        const chosenColor = palette[Math.floor(Math.random() * palette.length)].clone();
        chosenColor.offsetHSL((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.1);
        swirlColors[i * 3] = chosenColor.r;
        swirlColors[i * 3 + 1] = chosenColor.g;
        swirlColors[i * 3 + 2] = chosenColor.b;

        swirlSizes[i] = (Math.random() * 5 + 3) * (window.devicePixelRatio > 1 ? 1 : 1.4);
    }

    swirlGeometry.setAttribute('position', new THREE.BufferAttribute(swirlPositions, 3));
    swirlGeometry.setAttribute('color', new THREE.BufferAttribute(swirlColors, 3));
    swirlGeometry.setAttribute('size', new THREE.BufferAttribute(swirlSizes, 1));

    const swirlMaterial = new THREE.PointsMaterial({
        size: 5.5,
        vertexColors: true,
        map: starTexture,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const swirlMesh = new THREE.Points(swirlGeometry, swirlMaterial);
    scene.add(swirlMesh);

    // =========================================================================
    // 2. REALISTIC BACKGROUND STARFIELD (2,800 Stars)
    // =========================================================================
    const bgStarCount = 2800;
    const bgGeometry = new THREE.BufferGeometry();
    const bgPositions = new Float32Array(bgStarCount * 3);
    const bgColors = new Float32Array(bgStarCount * 3);

    for (let i = 0; i < bgStarCount; i++) {
        const x = (Math.random() - 0.5) * 1800;
        const y = (Math.random() - 0.5) * 1400;
        const z = -Math.random() * 900 - 100;

        bgPositions[i * 3] = x;
        bgPositions[i * 3 + 1] = y;
        bgPositions[i * 3 + 2] = z;

        const temp = Math.random();
        let starColor;
        if (temp > 0.85) starColor = new THREE.Color(0xFFF4D4);
        else if (temp > 0.4) starColor = new THREE.Color(0xFFFFFF);
        else if (temp > 0.15) starColor = new THREE.Color(0xCAE9FF);
        else starColor = new THREE.Color(0xFFD166);

        bgColors[i * 3] = starColor.r;
        bgColors[i * 3 + 1] = starColor.g;
        bgColors[i * 3 + 2] = starColor.b;
    }

    bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
    bgGeometry.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));

    const bgStarMaterial = new THREE.PointsMaterial({
        size: 3.2,
        vertexColors: true,
        map: starTexture,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const bgStarMesh = new THREE.Points(bgGeometry, bgStarMaterial);
    scene.add(bgStarMesh);

    // =========================================================================
    // 3. PHOTOREALISTIC 3D LUNAR SPHERE & CELESTIAL LIGHTING
    // =========================================================================
    const moonGroup = new THREE.Group();
    moonGroup.position.set(245, 125, -20);
    // Real moon axial tilt (~6.68 degrees)
    moonGroup.rotation.z = 0.116;

    // Ambient Starlight Lighting
    const ambientLight = new THREE.AmbientLight(0x0e1730, 0.65);
    scene.add(ambientLight);

    // Primary Sunlight: Direct beam hitting from the right creating realistic crescent phase & crater relief
    const sunLight = new THREE.DirectionalLight(0xfff3d6, 3.4);
    sunLight.position.set(380, 160, 200);
    sunLight.target = moonGroup;
    scene.add(sunLight);

    // Earthshine ("Da Vinci Glow"): Subtle bluish glow reflected from Earth onto lunar nightside
    const earthshineLight = new THREE.DirectionalLight(0x3e659c, 0.45);
    earthshineLight.position.set(-200, -80, -100);
    earthshineLight.target = moonGroup;
    scene.add(earthshineLight);

    // High-poly Lunar Sphere
    const moonRadius = 44;
    const moonGeo = new THREE.SphereGeometry(moonRadius, 64, 64);
    const moonMat = new THREE.MeshStandardMaterial({
        map: moonDiffTex,
        bumpMap: moonBumpTex,
        bumpScale: 2.2, // Realistic topography along the terminator line
        roughness: 0.88, // Lunar regolith scattering
        metalness: 0.04
    });

    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moonMesh);

    // Atmospheric Corona / Lunar Starlight Halos
    const innerCoronaGeo = new THREE.PlaneGeometry(160, 160);
    const innerCoronaMat = new THREE.MeshBasicMaterial({
        map: coronaTexture,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const innerCorona = new THREE.Mesh(innerCoronaGeo, innerCoronaMat);
    innerCorona.position.set(10, 0, -2);
    moonGroup.add(innerCorona);

    const outerCoronaGeo = new THREE.PlaneGeometry(280, 280);
    const outerCoronaMat = new THREE.MeshBasicMaterial({
        map: coronaTexture,
        color: 0xFFA000,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const outerCorona = new THREE.Mesh(outerCoronaGeo, outerCoronaMat);
    outerCorona.position.set(10, 0, -4);
    moonGroup.add(outerCorona);

    scene.add(moonGroup);

    // =========================================================================
    // 4. SHOOTING STARS / METEORS SYSTEM
    // =========================================================================
    const meteors = [];
    const maxMeteors = 3;

    class Meteor {
        constructor() {
            this.geometry = new THREE.BufferGeometry();
            const points = [];
            this.trailLength = 24;
            for (let i = 0; i < this.trailLength; i++) {
                points.push(new THREE.Vector3(0, 0, 0));
            }
            this.geometry.setFromPoints(points);

            this.material = new THREE.LineBasicMaterial({
                color: 0xFFE082,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                linewidth: 2
            });

            this.line = new THREE.Line(this.geometry, this.material);
            scene.add(this.line);
            this.reset();
        }

        reset() {
            this.active = false;
            this.waitTime = Math.random() * 180 + 90;
            this.pos = new THREE.Vector3(
                (Math.random() - 0.5) * 600 - 100,
                Math.random() * 200 + 150,
                (Math.random() - 0.5) * 200 - 50
            );
            this.vel = new THREE.Vector3(
                -(Math.random() * 8 + 12),
                -(Math.random() * 5 + 7),
                (Math.random() - 0.5) * 2
            );
            this.history = [];
            this.life = 0;
            this.maxLife = 40 + Math.random() * 20;
            this.material.opacity = 0;
        }

        update() {
            if (!this.active) {
                this.waitTime--;
                if (this.waitTime <= 0) {
                    this.active = true;
                }
                return;
            }

            this.life++;
            this.pos.add(this.vel);
            this.history.unshift(this.pos.clone());

            if (this.history.length > this.trailLength) {
                this.history.pop();
            }

            const positions = this.geometry.attributes.position.array;
            for (let i = 0; i < this.history.length; i++) {
                positions[i * 3] = this.history[i].x;
                positions[i * 3 + 1] = this.history[i].y;
                positions[i * 3 + 2] = this.history[i].z;
            }
            this.geometry.attributes.position.needsUpdate = true;

            if (this.life < 10) {
                this.material.opacity = (this.life / 10) * 0.9;
            } else if (this.life > this.maxLife - 15) {
                this.material.opacity = Math.max(0, ((this.maxLife - this.life) / 15) * 0.9);
            }

            if (this.life >= this.maxLife) {
                this.reset();
            }
        }
    }

    for (let i = 0; i < maxMeteors; i++) {
        meteors.push(new Meteor());
    }

    // =========================================================================
    // 5. ANIMATION LOOP
    // =========================================================================
    let clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // Smooth camera parallax following cursor
        targetCameraX += (mouseX - targetCameraX) * 0.05;
        targetCameraY += (-mouseY - targetCameraY) * 0.05;
        camera.position.x = targetCameraX;
        camera.position.y = targetCameraY;
        camera.lookAt(0, 0, 0);

        // Update Galactic Vortex Swirl
        const positions = swirlGeometry.attributes.position.array;
        for (let i = 0; i < swirlCount; i++) {
            swirlAngles[i] += swirlSpeeds[i];
            const r = swirlRadii[i];
            const a = swirlAngles[i];

            const wave = Math.sin(elapsedTime * 1.5 + r * 0.02) * 8;
            positions[i * 3] = Math.cos(a) * r;
            positions[i * 3 + 1] = Math.sin(a) * (r * 0.65) + 60 + wave;
        }
        swirlGeometry.attributes.position.needsUpdate = true;
        swirlMesh.rotation.z = Math.sin(elapsedTime * 0.1) * 0.05;

        // Majestic Slow Lunar Rotation showcasing craters & topography
        moonMesh.rotation.y = elapsedTime * 0.025;

        // Gentle atmospheric corona pulsation
        const moonPulse = 1 + Math.sin(elapsedTime * 2.2) * 0.04;
        innerCorona.scale.set(moonPulse, moonPulse, 1);
        outerCorona.scale.set(1 + Math.cos(elapsedTime * 1.7) * 0.06, 1 + Math.cos(elapsedTime * 1.7) * 0.06, 1);

        // Background twinkling
        bgStarMaterial.opacity = 0.72 + Math.sin(elapsedTime * 2.5) * 0.18;

        // Update Meteors
        for (let m of meteors) {
            m.update();
        }

        renderer.render(scene, camera);
    }

    animate();

    // =========================================================================
    // 6. RESIZE HANDLER
    // =========================================================================
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // =========================================================================
    // 7. BINAURAL NIGHT AMBIENCE GENERATOR
    // =========================================================================
    let audioCtx = null;
    let isPlaying = false;
    let gainNode = null;

    window.toggleNightAmbience = function () {
        const btn = document.getElementById('night-audio-toggle');
        const icon = document.getElementById('night-audio-icon');

        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();

            const bufferSize = audioCtx.sampleRate * 2;
            const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
                b6 = white * 0.115926;
            }

            const whiteNoise = audioCtx.createBufferSource();
            whiteNoise.buffer = noiseBuffer;
            whiteNoise.loop = true;

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(320, audioCtx.currentTime);

            gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);

            whiteNoise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            whiteNoise.start();
        }

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (!isPlaying) {
            gainNode.gain.setTargetAtTime(0.08, audioCtx.currentTime, 1);
            isPlaying = true;
            if (btn) btn.classList.add('active');
            if (icon) icon.className = 'bi bi-volume-up-fill';
        } else {
            gainNode.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.5);
            isPlaying = false;
            if (btn) btn.classList.remove('active');
            if (icon) icon.className = 'bi bi-volume-mute-fill';
        }
    };
})();
