import { GameEngine } from "./core/Engine";
import { 
    Vector3, HemisphericLight, MeshBuilder, StandardMaterial, Color3, 
    UniversalCamera, PhysicsAggregate, PhysicsShapeType, Ray,
    PointerEventTypes, AbstractMesh
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Control, Button } from "@babylonjs/gui";
import { EnemyAI } from "./core/EnemyAI";
import "@babylonjs/loaders/glTF";

async function startGame() {
    const game = new GameEngine("renderCanvas");
    await game.initialize();
    const scene = game.scene;

    // Lighting
    const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // Ground & Environment
    const ground = MeshBuilder.CreateGround("ground", {width: 200, height: 200}, scene);
    const groundMat = new StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new Color3(0.2, 0.3, 0.2); 
    ground.material = groundMat;
    new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

    // Obstacles
    for (let i = 0; i < 20; i++) {
        const box = MeshBuilder.CreateBox("box" + i, {size: 2}, scene);
        box.position = new Vector3((Math.random() - 0.5) * 50, 1, (Math.random() - 0.5) * 50);
        new PhysicsAggregate(box, PhysicsShapeType.BOX, { mass: 1 }, scene);
    }

    // Player Camera
    const camera = new UniversalCamera("PlayerCamera", new Vector3(0, 2, 0), scene);
    camera.attachControl(game.canvas, true);
    
    // FPS WASD Keys
    camera.keysUp.push(87); 
    camera.keysDown.push(83); 
    camera.keysLeft.push(65); 
    camera.keysRight.push(68); 
    camera.speed = 0.3;
    camera.inertia = 0.2; 
    camera.angularSensibility = 2000; 

    // Gravity & Collision
    scene.gravity = new Vector3(0, -9.81 / 60, 0);
    scene.collisionsEnabled = true;
    camera.checkCollisions = true;
    camera.applyGravity = true;
    camera.ellipsoid = new Vector3(1, 1, 1);
    ground.checkCollisions = true;

    // Load Weapon Model
    let gunMesh: AbstractMesh | null = null;
    import("@babylonjs/core/Loading/sceneLoader").then(({ SceneLoader }) => {
        SceneLoader.ImportMeshAsync("", "/models/", "gun.glb", scene).then((result) => {
            const root = result.meshes[0];
            root.parent = camera;
            
            // Clear rotation quaternion from GLTF to allow Euler rotation
            root.rotationQuaternion = null;
            
            // Adjust to be in right hand
            root.scaling = new Vector3(0.05, 0.05, 0.05); // Scale down
            root.position = new Vector3(0.3, -0.3, 0.8); // Offset to bottom right
            root.rotation = new Vector3(0, -Math.PI / 2, 0); // Rotate 90 degrees (adjust as needed)
            
            gunMesh = root;
        }).catch(err => console.error("Error loading gun model:", err));
    });

    // Initialize Enemy AI
    const enemyAI = new EnemyAI(scene, camera);
    await enemyAI.initialize();

    // Mobile Virtual Joysticks & UI
    const isMobile = navigator.maxTouchPoints > 0;
    const adt = AdvancedDynamicTexture.CreateFullscreenUI("UI");

    if (isMobile) {
        // We simulate a left virtual joystick for WASD and right half of screen for look
        // Babylon's VirtualJoystick is a bit complex without the right imports, so we use a simple GUI approach or VirtualJoysticksCamera
        // Actually, Babylon has built-in VirtualJoystick support. We just need to add the inputs to the camera.
        camera.inputs.addVirtualJoystick();
        
        // Shoot Button for mobile
        const shootBtn = Button.CreateSimpleButton("shootBtn", "SHOOT");
        shootBtn.width = "100px";
        shootBtn.height = "100px";
        shootBtn.color = "white";
        shootBtn.cornerRadius = 50;
        shootBtn.background = "rgba(255, 0, 0, 0.5)";
        shootBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        shootBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        shootBtn.top = "-50px";
        shootBtn.left = "-50px";
        shootBtn.onPointerDownObservable.add(() => {
            shoot();
        });
        adt.addControl(shootBtn);
    } else {
        // Pointer Lock for PC
        game.canvas.addEventListener("click", () => {
            game.canvas.requestPointerLock();
        });

        scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN && document.pointerLockElement) {
                if (pointerInfo.event.button === 0) {
                    shoot();
                }
            }
        });
    }

    function shoot() {
        // Raycast
        const ray = new Ray(camera.position, camera.getForwardRay().direction, 100);
        const hit = scene.pickWithRay(ray);
        
        if (hit && hit.pickedMesh && hit.pickedMesh.name.startsWith("box")) {
            const aggregate = hit.pickedMesh.physicsBody;
            if (aggregate) {
                const forceDirection = ray.direction.scale(15);
                aggregate.applyImpulse(forceDirection, hit.pickedPoint || hit.pickedMesh.getAbsolutePosition());
            }
        }

        // Procedural Recoil
        if (gunMesh) {
            gunMesh.position.z -= 0.15;
            gunMesh.rotation.x -= 0.05;
            setTimeout(() => {
                if (gunMesh) {
                    gunMesh.position.z += 0.15;
                    gunMesh.rotation.x += 0.05;
                }
            }, 50);
        }
    }

    console.log("Game Engine Started");
}

startGame();
