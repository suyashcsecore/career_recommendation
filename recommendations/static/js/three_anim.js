// three_anim.js - "Infinity Loop" Particle Cloud
document.addEventListener("DOMContentLoaded", function() {
    const container = document.getElementById('hero-canvas');
    if (!container || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 1000);
    camera.position.z = 280;

    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // --- Generate Infinity Loop (Figure-8) Points ---
    const particleCount = 2500;
    const basePositions = new Float32Array(particleCount * 3);
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const color1 = new THREE.Color(0x2563EB); // Primary Blue
    const color2 = new THREE.Color(0x8B5CF6); // Purple
    const color3 = new THREE.Color(0x10B981); // Emerald Green
    
    for (let i = 0; i < particleCount; i++) {
        // Parametric equations for a 3D infinity loop (figure-8)
        const t = Math.random() * Math.PI * 2; 
        
        const radiusX = 90;
        const radiusY = 40;
        const radiusZ = 30;

        // Base center point along the infinity path
        const cx = Math.sin(t) * radiusX;
        const cy = Math.sin(2 * t) * radiusY; // Creates the figure-8 crossover
        const cz = Math.cos(t) * radiusZ;
        
        // Add random scatter to create a "cloud tube" look (exactly like the original Torus Knot)
        const tubeNoise = 18; // thickness of the cloud
        const px = cx + (Math.random() - 0.5) * tubeNoise;
        const py = cy + (Math.random() - 0.5) * tubeNoise;
        const pz = cz + (Math.random() - 0.5) * tubeNoise;

        // Store original position for animation
        basePositions[i * 3] = px;
        basePositions[i * 3 + 1] = py;
        basePositions[i * 3 + 2] = pz;

        positions[i * 3] = px;
        positions[i * 3 + 1] = py;
        positions[i * 3 + 2] = pz;

        // Mix colors based on position
        const mixedColor = new THREE.Color();
        const ratio = (px + 100) / 200; 
        
        if (Math.random() > 0.85) {
            mixedColor.copy(color3); // sprinkle green
        } else {
            mixedColor.lerpColors(color1, color2, ratio + (Math.random() * 0.2));
        }

        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }

    const particles = new THREE.BufferGeometry();
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle material (exact same as original)
    const pMaterial = new THREE.PointsMaterial({
        size: 3.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particleSystem = new THREE.Points(particles, pMaterial);
    coreGroup.add(particleSystem);

    // Inner glowing sphere
    const sphereGeo = new THREE.SphereGeometry(25, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
        color: 0x2563EB,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
    });
    const innerSphere = new THREE.Mesh(sphereGeo, sphereMat);
    coreGroup.add(innerSphere);

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - windowHalfX);
        mouseY = (e.clientY - windowHalfY);
    });

    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Parallax rotation based on mouse
        targetRotationY = mouseX * 0.001;
        targetRotationX = mouseY * 0.001;
        
        coreGroup.rotation.y += (targetRotationY - coreGroup.rotation.y) * 0.05;
        coreGroup.rotation.x += (targetRotationX - coreGroup.rotation.x) * 0.05;

        // Slow spin
        particleSystem.rotation.y = elapsedTime * 0.15;
        
        // Pulse inner sphere
        const scale = 1 + Math.sin(elapsedTime * 2) * 0.1;
        innerSphere.scale.set(scale, scale, scale);

        // Make particles gently undulate (exact same wave logic as original)
        const posAttribute = particleSystem.geometry.attributes.position;
        for (let i = 0; i < particleCount; i++) {
            const ix = i * 3;
            const iy = i * 3 + 1;
            const iz = i * 3 + 2;
            
            const offset = Math.sin(elapsedTime * 2 + basePositions[ix] * 0.05) * 2;
            
            posAttribute.array[ix] = basePositions[ix] + offset;
            posAttribute.array[iy] = basePositions[iy] + offset;
            posAttribute.array[iz] = basePositions[iz] + offset;
        }
        posAttribute.needsUpdate = true;

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
});
