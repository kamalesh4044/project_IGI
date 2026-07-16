import { Scene, Vector3, AbstractMesh, Ray, AnimationGroup, TransformNode } from "@babylonjs/core";

export class EnemyAI {
    private scene: Scene;
    private player: any;
    private enemies: any[] = [];
    private enemyMesh: AbstractMesh | null = null;
    private walkAnim: AnimationGroup | null = null;
    private idleAnim: AnimationGroup | null = null;

    constructor(scene: Scene, player: any) {
        this.scene = scene;
        this.player = player;
    }

    public async initialize() {
        const { SceneLoader } = await import("@babylonjs/core/Loading/sceneLoader");
        // We use a free GLB model from Babylon.js for the enemy
        try {
            const result = await SceneLoader.ImportMeshAsync("", "https://models.babylonjs.com/", "HVGirl.glb", this.scene);
            this.enemyMesh = result.meshes[0];
            this.enemyMesh.scaling = new Vector3(0.05, 0.05, 0.05); // Adjust scale for HVGirl
            this.enemyMesh.position = new Vector3(0, -100, 0); // Hide original
            
            // Extract animations if any
            if (result.animationGroups.length > 0) {
                this.idleAnim = result.animationGroups.find(a => a.name === "Idle") || result.animationGroups[0];
                this.walkAnim = result.animationGroups.find(a => a.name === "Walk") || result.animationGroups[1] || null;
                this.idleAnim.stop();
                if(this.walkAnim) this.walkAnim.stop();
            }

            this.spawnEnemies(5);
            
            // Start AI Loop
            this.scene.onBeforeRenderObservable.add(() => {
                this.updateAI();
            });

        } catch(e) {
            console.error("Failed to load enemy model", e);
            // Fallback to a box
            import("@babylonjs/core/Meshes/meshBuilder").then(({MeshBuilder}) => {
                this.enemyMesh = MeshBuilder.CreateBox("enemyFallback", {height: 2, width: 1, depth: 1}, this.scene);
                this.enemyMesh.position = new Vector3(0, -100, 0);
                this.spawnEnemies(5);
                this.scene.onBeforeRenderObservable.add(() => this.updateAI());
            });
        }
    }

    private spawnEnemies(count: number) {
        if (!this.enemyMesh) return;
        
        for (let i = 0; i < count; i++) {
            const clone = this.enemyMesh.instantiateHierarchy(null, { doNotInstantiate: true });
            if (!clone) continue;
            
            const root = clone as AbstractMesh;
            // Random position
            root.position = new Vector3((Math.random() - 0.5) * 40, 1, (Math.random() - 0.5) * 40);
            
            // Add physics so they can be shot and stand on ground
            // new PhysicsAggregate(root, PhysicsShapeType.CAPSULE, { mass: 1, friction: 0.2 }, this.scene);
            // Note: InstantiateHierarchy doesn't perfectly copy physics, we will just use basic movement for now
            
            this.enemies.push({
                mesh: root,
                state: "PATROL",
                targetPos: this.getRandomPosition(),
                speed: 0.03,
                health: 100
            });
        }
    }

    private getRandomPosition(): Vector3 {
        return new Vector3((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40);
    }

    private updateAI() {
        for (const enemy of this.enemies) {
            if (enemy.health <= 0) continue;

            const mesh = enemy.mesh as AbstractMesh;
            const distanceToPlayer = Vector3.Distance(mesh.position, this.player.position);

            // Simple vision cone / distance check
            if (distanceToPlayer < 15) {
                // Raycast to check line of sight
                const ray = new Ray(mesh.position, this.player.position.subtract(mesh.position).normalize(), distanceToPlayer);
                const hit = this.scene.pickWithRay(ray, (m) => m.name === "ground" || m.name.startsWith("box"));
                
                if (!hit || !hit.hit) {
                    enemy.state = "CHASE";
                } else {
                    enemy.state = "PATROL";
                }
            } else {
                enemy.state = "PATROL";
            }

            if (enemy.state === "CHASE") {
                // Move towards player
                const dir = this.player.position.subtract(mesh.position).normalize();
                dir.y = 0; // Keep on ground
                mesh.position.addInPlace(dir.scale(enemy.speed * 1.5));
                mesh.lookAt(new Vector3(this.player.position.x, mesh.position.y, this.player.position.z));
            } else if (enemy.state === "PATROL") {
                // Move towards patrol target
                const dir = enemy.targetPos.subtract(mesh.position).normalize();
                dir.y = 0;
                mesh.position.addInPlace(dir.scale(enemy.speed));
                mesh.lookAt(new Vector3(enemy.targetPos.x, mesh.position.y, enemy.targetPos.z));

                if (Vector3.Distance(mesh.position, enemy.targetPos) < 1) {
                    enemy.targetPos = this.getRandomPosition();
                }
            }
        }
    }
}
