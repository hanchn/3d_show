import * as THREE from 'three';

class ShootingGame {
    constructor() {
        this.container = document.getElementById('game-container');
        this.scoreElement = document.getElementById('score');
        this.ammoElement = document.getElementById('ammo');
        
        // 游戏状态
        this.score = 0;
        this.ammo = 30;
        this.maxAmmo = 30;
        this.isReloading = false;
        
        // 游戏对象
        this.targets = [];
        this.bullets = [];
        this.fragments = [];
        
        // 输入控制
        this.keys = {};
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        
        this.clock = new THREE.Clock();
        
        this.init();
        this.setupEventListeners();
        this.animate();
    }
    
    init() {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // 天蓝色背景
        
        // 创建相机
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 2, 0);
        
        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // 添加光照
        this.setupLights();
        
        // 创建地面
        this.createGround();
        
        // 创建目标
        this.createTargets();
        
        // 定期生成新目标
        setInterval(() => {
            if (this.targets.length < 10) {
                this.createTarget();
            }
        }, 2000);
    }
    
    setupLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // 方向光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }
    
    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }
    
    createTargets() {
        for (let i = 0; i < 5; i++) {
            this.createTarget();
        }
    }
    
    createTarget() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6)
        });
        const target = new THREE.Mesh(geometry, material);
        
        // 随机位置
        target.position.set(
            (Math.random() - 0.5) * 50,
            Math.random() * 3 + 0.5,
            (Math.random() - 0.5) * 50
        );
        
        target.castShadow = true;
        target.receiveShadow = true;
        
        // 添加移动属性
        target.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                0,
                (Math.random() - 0.5) * 2
            ),
            health: 1
        };
        
        this.scene.add(target);
        this.targets.push(target);
    }
    
    createBullet(origin, direction) {
        if (this.ammo <= 0 || this.isReloading) return;
        
        this.ammo--;
        this.updateUI();
        
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(geometry, material);
        
        bullet.position.copy(origin);
        bullet.userData = {
            velocity: direction.clone().multiplyScalar(50),
            life: 2.0 // 2秒后消失
        };
        
        this.scene.add(bullet);
        this.bullets.push(bullet);
    }
    
    createFragments(position, color) {
        const fragmentCount = 15;
        
        for (let i = 0; i < fragmentCount; i++) {
            const geometry = new THREE.BoxGeometry(
                Math.random() * 0.2 + 0.05,
                Math.random() * 0.2 + 0.05,
                Math.random() * 0.2 + 0.05
            );
            const material = new THREE.MeshLambertMaterial({ color: color });
            const fragment = new THREE.Mesh(geometry, material);
            
            fragment.position.copy(position);
            fragment.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    Math.random() * 8 + 2,
                    (Math.random() - 0.5) * 10
                ),
                angularVelocity: new THREE.Vector3(
                    Math.random() * 10,
                    Math.random() * 10,
                    Math.random() * 10
                ),
                life: 3.0,
                gravity: -9.8
            };
            
            fragment.castShadow = true;
            this.scene.add(fragment);
            this.fragments.push(fragment);
        }
    }
    
    setupEventListeners() {
        // 键盘事件
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            
            if (event.code === 'KeyR') {
                this.reload();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
        
        // 鼠标事件
        document.addEventListener('mousemove', (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        });
        
        document.addEventListener('click', () => {
            this.shoot();
        });
        
        // 窗口大小调整
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // 锁定鼠标指针
        this.container.addEventListener('click', () => {
            this.container.requestPointerLock();
        });
    }
    
    handleMovement(deltaTime) {
        const moveSpeed = 10;
        const velocity = new THREE.Vector3();
        
        if (this.keys['KeyW']) velocity.z -= 1;
        if (this.keys['KeyS']) velocity.z += 1;
        if (this.keys['KeyA']) velocity.x -= 1;
        if (this.keys['KeyD']) velocity.x += 1;
        
        velocity.normalize().multiplyScalar(moveSpeed * deltaTime);
        this.camera.position.add(velocity);
    }
    
    shoot() {
        if (this.ammo <= 0 || this.isReloading) return;
        
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const direction = this.raycaster.ray.direction.clone();
        
        this.createBullet(this.camera.position.clone(), direction);
    }
    
    reload() {
        if (this.isReloading || this.ammo === this.maxAmmo) return;
        
        this.isReloading = true;
        setTimeout(() => {
            this.ammo = this.maxAmmo;
            this.isReloading = false;
            this.updateUI();
        }, 2000);
    }
    
    updateTargets(deltaTime) {
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            
            // 移动目标
            target.position.add(
                target.userData.velocity.clone().multiplyScalar(deltaTime)
            );
            
            // 旋转目标
            target.rotation.x += deltaTime;
            target.rotation.y += deltaTime * 0.5;
            
            // 边界检查
            if (Math.abs(target.position.x) > 25 || Math.abs(target.position.z) > 25) {
                target.userData.velocity.multiplyScalar(-1);
            }
            
            // 保持在地面上
            if (target.position.y < 0.5) {
                target.position.y = 0.5;
            }
        }
    }
    
    updateBullets(deltaTime) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // 移动子弹
            bullet.position.add(
                bullet.userData.velocity.clone().multiplyScalar(deltaTime)
            );
            
            // 减少生命值
            bullet.userData.life -= deltaTime;
            
            // 检查碰撞
            this.checkBulletCollisions(bullet, i);
            
            // 移除过期子弹
            if (bullet.userData.life <= 0) {
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
            }
        }
    }
    
    updateFragments(deltaTime) {
        for (let i = this.fragments.length - 1; i >= 0; i--) {
            const fragment = this.fragments[i];
            
            // 应用重力
            fragment.userData.velocity.y += fragment.userData.gravity * deltaTime;
            
            // 移动碎片
            fragment.position.add(
                fragment.userData.velocity.clone().multiplyScalar(deltaTime)
            );
            
            // 旋转碎片
            fragment.rotation.x += fragment.userData.angularVelocity.x * deltaTime;
            fragment.rotation.y += fragment.userData.angularVelocity.y * deltaTime;
            fragment.rotation.z += fragment.userData.angularVelocity.z * deltaTime;
            
            // 减少生命值
            fragment.userData.life -= deltaTime;
            
            // 地面碰撞
            if (fragment.position.y <= 0) {
                fragment.position.y = 0;
                fragment.userData.velocity.y *= -0.3; // 弹跳
                fragment.userData.velocity.x *= 0.8; // 摩擦
                fragment.userData.velocity.z *= 0.8;
            }
            
            // 移除过期碎片
            if (fragment.userData.life <= 0) {
                this.scene.remove(fragment);
                this.fragments.splice(i, 1);
            }
        }
    }
    
    checkBulletCollisions(bullet, bulletIndex) {
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            const distance = bullet.position.distanceTo(target.position);
            
            if (distance < 0.6) { // 碰撞检测
                // 创建碎片效果
                this.createFragments(target.position, target.material.color);
                
                // 移除目标和子弹
                this.scene.remove(target);
                this.scene.remove(bullet);
                this.targets.splice(i, 1);
                this.bullets.splice(bulletIndex, 1);
                
                // 增加分数
                this.score += 10;
                this.updateUI();
                
                // 显示击中效果
                this.showHitEffect();
                
                break;
            }
        }
    }
    
    showHitEffect() {
        const hitEffect = document.createElement('div');
        hitEffect.className = 'hit-effect';
        hitEffect.textContent = '+10';
        hitEffect.style.left = '50%';
        hitEffect.style.top = '45%';
        document.body.appendChild(hitEffect);
        
        setTimeout(() => {
            document.body.removeChild(hitEffect);
        }, 1000);
    }
    
    updateUI() {
        this.scoreElement.textContent = `得分: ${this.score}`;
        this.ammoElement.textContent = `弹药: ${this.ammo}${this.isReloading ? ' (重新装弹中...)' : ''}`;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // 处理移动
        this.handleMovement(deltaTime);
        
        // 更新游戏对象
        this.updateTargets(deltaTime);
        this.updateBullets(deltaTime);
        this.updateFragments(deltaTime);
        
        // 渲染场景
        this.renderer.render(this.scene, this.camera);
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    new ShootingGame();
});