'use client';

import { useEffect, useRef, useState } from 'react';
// import { useRouter } from 'next/navigation'; // REMOVED: No longer used for redirection

// --- Definiciones de Tipos ---
interface GameObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'town_center' | 'berries' | 'tree' | 'gold_mine' | 'villager';
  image?: HTMLImageElement;
  targetX?: number | null;
  targetY?: number | null;
  isMoving?: boolean;
  resourceCarrying?: 'gold' | 'wood' | null;
  isCollecting?: boolean;
  collectionProgress?: number;
  isSpawned?: boolean;
  targetId?: string | null;
}

interface LoadedImages {
  town_center?: HTMLImageElement;
  villager?: HTMLImageElement;
  gold_mine?: HTMLImageElement;
  tree?: HTMLImageElement;
  berries?: HTMLImageElement;
  background?: HTMLImageElement;
}

// --- Constantes del Juego ---
const CAPTCHA_INITIAL_TIME = 40;
const CAPTCHA_TIMEOUT_MS = CAPTCHA_INITIAL_TIME * 1000;
const VILLAGER_SPEED = 1.5;
const COLLECTION_TIME = 80;
const VILLAGER_SIZE = 30;
const TOWN_CENTER_SIZE = 100;
const RESOURCE_SPRITE_SIZE = 50;

// --- Rutas de los Assets ---
const imagePaths = {
  town_center: '/centro_urbano.JPG',
  villager: '/aldeano.jpg',
  gold_mine: '/oro.jpg',
  tree: '/arbol.jpg',
  berries: '/berries.jpg',
  background: '/background.jpg',
};

export default function AgeOfEmpiresCaptcha() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [validated, setValidated] = useState<boolean>(false);
  const [timeoutExpired, setTimeoutExpired] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(CAPTCHA_INITIAL_TIME);
  // const router = useRouter(); // REMOVED: No longer used for redirection

  // Estados del juego
  const [goldCollected, setGoldCollected] = useState<number>(0);
  const [woodCollected, setWoodCollected] = useState<number>(0);
  const [villager, setVillager] = useState<GameObject | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>(['Saca un aldeano del Centro Urbano.']);
  const [images, setImages] = useState<LoadedImages>({});
  const [assetsLoaded, setAssetsLoaded] = useState<boolean>(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState<boolean>(false);

  const [particles, setParticles] = useState<
  { x: number; y: number; dx: number; dy: number; size: number; alpha: number }[]
>([]);


  // --- Definiciones de Objetos del Mapa ---
  // Moved these constants inside the component, they are fine here but need to be in useEffect dependencies
  const townCenterData: GameObject = {
    id: 'tc', x: 50, y: 50, width: TOWN_CENTER_SIZE, height: TOWN_CENTER_SIZE, type: 'town_center'
  };
  const berriesData: GameObject = {
    id: 'berries', x: 280, y: 30, width: RESOURCE_SPRITE_SIZE, height: RESOURCE_SPRITE_SIZE, type: 'berries'
  };
  const treeData: GameObject[] = [
    { id: 'tree1', x: 300, y: 80, width: RESOURCE_SPRITE_SIZE, height: RESOURCE_SPRITE_SIZE, type: 'tree' },
    { id: 'tree2', x: 320, y: 150, width: RESOURCE_SPRITE_SIZE, height: RESOURCE_SPRITE_SIZE, type: 'tree' },
    { id: 'tree3', x: 280, y: 220, width: RESOURCE_SPRITE_SIZE, height: RESOURCE_SPRITE_SIZE, type: 'tree' },
  ];
  const goldMineData: GameObject = {
    id: 'gold_mine', x: 150, y: 200, width: RESOURCE_SPRITE_SIZE * 1.5, height: RESOURCE_SPRITE_SIZE * 1.5, type: 'gold_mine'
  };

  const mapElements = [townCenterData, berriesData, goldMineData, ...treeData];

  // --- useEffect para cargar imágenes ---
  useEffect(() => {
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (error) => { // eslint-disable-next-line @typescript-eslint/no-unused-vars
          console.error(`Error al cargar la imagen local: ${src}`, error);
          reject(error);
        };
      });
    };

    const loadAllImages = async () => {
      try {
        const loaded: LoadedImages = {};
        if (imagePaths.town_center) loaded.town_center = await loadImage(imagePaths.town_center);
        if (imagePaths.villager) loaded.villager = await loadImage(imagePaths.villager);
        if (imagePaths.gold_mine) loaded.gold_mine = await loadImage(imagePaths.gold_mine);
        if (imagePaths.tree) loaded.tree = await loadImage(imagePaths.tree);
        if (imagePaths.berries) loaded.berries = await loadImage(imagePaths.berries);
        if (imagePaths.background) loaded.background = await loadImage(imagePaths.background);

        setImages(loaded);
        setAssetsLoaded(true);
      } catch (error) { // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setMessages(prev => [...prev, 'Error al cargar los assets. Revisa los nombres de archivo y la carpeta `public`.']);
        setAssetsLoaded(false);
      }
    };

    loadAllImages();
  }, []); // Empty dependency array means this runs once on mount


  const generateParticles = (count = 20) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const newParticles = Array.from({ length: count }).map(() => ({
    x: canvas.width / 2,
    y: canvas.height / 2,
    dx: (Math.random() - 0.5) * 2,
    dy: (Math.random() - 0.5) * 2,
    size: Math.random() * 2 + 1,
    alpha: 1,
  }));

  setParticles(newParticles);
};


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !assetsLoaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 300;

    let animationFrameId: number;

    // --- Funciones de Dibujo ---
    const drawObject = (obj: GameObject) => {
      if (obj.image) {
        ctx.drawImage(obj.image, obj.x, obj.y, obj.width, obj.height);
      } else {
        ctx.fillStyle = obj.type === 'town_center' ? 'brown' : obj.type === 'villager' ? 'orange' : 'gray';
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      }

      if (obj.type === 'villager') {
        if (selectedUnitId === obj.id) {
          ctx.strokeStyle = 'cyan';
          ctx.lineWidth = 2;
          ctx.strokeRect(obj.x - 2, obj.y - 2, obj.width + 4, obj.height + 4);
        }
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        if (obj.resourceCarrying === 'gold') {
          ctx.fillText('💎', obj.x + obj.width / 2, obj.y - 5);
        } else if (obj.resourceCarrying === 'wood') {
          ctx.fillText('🌳', obj.x + obj.width / 2, obj.y - 5);
        }
      }
    };

    if (showSuccessAnimation) {
  particles.forEach(p => {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = 'gold';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

    const drawScene = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (images.background) {
        ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#6B8E23';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      drawObject({ ...townCenterData, image: images.town_center });
      drawObject({ ...berriesData, image: images.berries });
      drawObject({ ...goldMineData, image: images.gold_mine });
      treeData.forEach(tree => drawObject({ ...tree, image: images.tree }));

      if (villager) {
        drawObject({ ...villager, image: images.villager });
      }
    };

    // --- Lógica del Juego ---
    const updateGame = () => {
      if (goldCollected >= 1 && woodCollected >= 1 && !validated) {
        setValidated(true);
        generateParticles(); // ← Llamada a generar partículas al validarse
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 3000); // Mostrar animación por 3 segundos
        return;
      }

      if (validated || timeoutExpired) return;

      if (villager && villager.isMoving && villager.targetX !== null && villager.targetY !== null) {
        const dx = villager.targetX - villager.x;
        const dy = villager.targetY - villager.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < VILLAGER_SPEED) {
          setVillager(prev => prev ? { ...prev, x: prev.targetX!, y: prev.targetY!, isMoving: false, targetX: null, targetY: null } : null);

          const targetElement = mapElements.find(el => el.id === villager.targetId);

          if (targetElement) {
            if (targetElement.type === 'gold_mine' && goldCollected < 1 && !villager.resourceCarrying) {
              setMessages(['Recolectando oro...']);
              setVillager(prev => prev ? { ...prev, isCollecting: true, collectionProgress: 0 } : null);
            } else if (targetElement.type === 'tree' && woodCollected < 1 && !villager.resourceCarrying) {
              setMessages(['Recolectando madera...']);
              setVillager(prev => prev ? { ...prev, isCollecting: true, collectionProgress: 0 } : null);
            } else if (targetElement.type === 'town_center') {
              if (villager.resourceCarrying === 'gold') {
                setGoldCollected(prev => prev + 1);
                setMessages(['¡Oro entregado! Ahora por madera.']);
                setVillager(prev => prev ? { ...prev, resourceCarrying: null } : null);
              } else if (villager.resourceCarrying === 'wood') {
                setWoodCollected(prev => prev + 1);
                setMessages(['¡Madera entregada!']);
                setVillager(prev => prev ? { ...prev, resourceCarrying: null } : null);
              } else {
                setMessages(['Aldeano inactivo en el TC.']);
              }
            } else if (villager.resourceCarrying && targetElement.type !== 'town_center') {
                setMessages(['¡Regresa al TC para entregar el recurso!']);
            } else {
                setMessages(['Aldeano inactivo.']);
            }
          }

        } else {
          setVillager(prev => prev ? {
            ...prev,
            x: prev.x + (dx / distance) * VILLAGER_SPEED,
            y: prev.y + (dy / distance) * VILLAGER_SPEED,
          } : null);
        }
      }

      if (villager && villager.isCollecting && villager.collectionProgress !== undefined) {
        setVillager(prev => prev ? { ...prev, collectionProgress: prev.collectionProgress! + 1 } : null);
        if (villager.collectionProgress >= COLLECTION_TIME) {
          const collectedResourceTarget = mapElements.find(el => el.id === villager.targetId);
          let newResourceCarrying: 'gold' | 'wood' | null = null;
          if (collectedResourceTarget?.type === 'gold_mine') newResourceCarrying = 'gold';
          if (collectedResourceTarget?.type === 'tree') newResourceCarrying = 'wood';

          setVillager(prev => prev ? { ...prev, isCollecting: false, resourceCarrying: newResourceCarrying, collectionProgress: 0 } : null);
          setMessages([`${newResourceCarrying === 'gold' ? 'Oro' : 'Madera'} recolectado. ¡Regresa al Centro Urbano!`]);
        }
      }
    };

    // --- Manejo de Eventos del Mouse ---
    const handleClick = (e: MouseEvent) => {
      if (validated || timeoutExpired || !assetsLoaded) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (!villager &&
          mouseX >= townCenterData.x && mouseX <= townCenterData.x + townCenterData.width &&
          mouseY >= townCenterData.y && mouseY <= townCenterData.y + townCenterData.height) {
        setVillager({
          id: 'villager1',
          x: townCenterData.x + townCenterData.width / 2 - VILLAGER_SIZE / 2,
          y: townCenterData.y + townCenterData.height / 2 - VILLAGER_SIZE / 2,
          width: VILLAGER_SIZE, height: VILLAGER_SIZE,
          type: 'villager',
          targetX: null, targetY: null,
          isMoving: false, resourceCarrying: null, isCollecting: false, collectionProgress: 0,
          isSpawned: true,
          image: images.villager
        });
        setMessages(['¡Aldeano creado! Haz clic en la mina de oro o un árbol.']);
        setSelectedUnitId('villager1');
        return;
      }

      if (villager &&
          mouseX >= villager.x && mouseX <= villager.x + villager.width &&
          mouseY >= villager.y && mouseY <= villager.y + villager.height) {
        setSelectedUnitId(villager.id);
        setMessages(['Aldeano seleccionado. Haz clic en un destino.']);
        return;
      }

      if (selectedUnitId === 'villager1' && villager && !villager.isCollecting) {
        const targetClicked = mapElements.find(obj =>
          mouseX >= obj.x && mouseX <= obj.x + obj.width &&
          mouseY >= obj.y && mouseY <= obj.y + obj.height
        );

        if (targetClicked) {
            setVillager(prev => prev ? {
                ...prev,
                targetX: targetClicked.x + targetClicked.width / 2 - VILLAGER_SIZE / 2,
                targetY: targetClicked.y + targetClicked.height / 2 - VILLAGER_SIZE / 2,
                isMoving: true,
                targetId: targetClicked.id
            } : null);
            const msg = `Moviendo aldeano a ${targetClicked.type === 'town_center' ? 'Centro Urbano' : targetClicked.type === 'gold_mine' ? 'Mina de Oro' : targetClicked.type}.`;
            setMessages([msg]);
        } else {
            setVillager(prev => prev ? {
                ...prev,
                targetX: mouseX - VILLAGER_SIZE / 2,
                targetY: mouseY - VILLAGER_SIZE / 2,
                isMoving: true,
                targetId: null
            } : null);
            setMessages(['Moviendo aldeano a una ubicación.']);
        }
      }
    };

    // --- Bucle Principal de Animación ---
    const animate = () => {
      updateGame();
      drawScene();
      animationFrameId = requestAnimationFrame(animate);
    };

    if (assetsLoaded) {
      animationFrameId = requestAnimationFrame(animate);
      canvas.addEventListener('click', handleClick);

      const intervalId = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(intervalId);
            setTimeoutExpired(true);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      const timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          setTimeoutExpired(true);
      }, CAPTCHA_TIMEOUT_MS);

      return () => {
        canvas.removeEventListener('click', handleClick);
        cancelAnimationFrame(animationFrameId);
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }
  }, [
    validated,
    timeoutExpired,
    villager,
    selectedUnitId,
    goldCollected,
    woodCollected,
    assetsLoaded,
    images,
    berriesData, // Added to dependency array
    goldMineData, // Added to dependency array
    mapElements,  // Added to dependency array
    townCenterData, // Added to dependency array
    treeData // Added to dependency array
  ]);

  // Removed redirection useEffect as it's no longer needed

  // Efecto para resetear el juego
  const resetGame = () => {
    setValidated(false);
    setTimeoutExpired(false);
    setTimeLeft(CAPTCHA_INITIAL_TIME);
    setGoldCollected(0);
    setWoodCollected(0);
    setVillager(null);
    setSelectedUnitId(null);
    setMessages(['Saca un aldeano del Centro Urbano.']);
    setShowSuccessAnimation(false); // Also hide animation on reset
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <h1>🏰 CAPTCHA: Mini Age of Empires</h1>
      <p>
        **Objetivo:** Saca un aldeano del Centro Urbano (TC) y haz que recolecte <b style={{color: 'gold'}}>1 de oro</b> de la mina y <b style={{color: 'green'}}>1 de madera</b> de un árbol. ¡Luego regresa al TC!
        {!assetsLoaded && <span style={{ color: 'orange', display: 'block', marginTop: '10px' }}>Cargando assets del juego...</span>}
        {timeLeft > 0 && !validated && !timeoutExpired && assetsLoaded && (
          <span style={{ marginLeft: '10px', fontWeight: 'bold', color: timeLeft <= 10 ? 'red' : 'inherit' }}>
            Tiempo restante: {timeLeft}s
          </span>
        )}
        {timeoutExpired && !validated && <span style={{ color: 'red' }}> ¡Tiempo agotado!</span>}
      </p>
      <div style={{ margin: '1rem auto', width: '400px', border: '2px solid #444', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            opacity: timeoutExpired || !assetsLoaded ? 0.5 : 1,
            pointerEvents: timeoutExpired || validated || !assetsLoaded ? 'none' : 'auto',
            cursor: 'default',
            backgroundColor: '#6B8E23'
          }}
        />
        <div style={{ position: 'absolute', bottom: '5px', left: '5px', color: 'white', fontSize: '12px', textAlign: 'left', pointerEvents: 'none' }}>
          {messages.map((msg, index) => (
            <p key={index} style={{ margin: '0' }}>{msg}</p>
          ))}
        </div>
      </div>

      {/* Mensaje de éxito con animación */}
      {showSuccessAnimation && (
        <div className="success-message" style={{ color: 'limegreen', fontSize: '1.5em', fontWeight: 'bold' }}>
          ✅ ¡CAPTCHA resuelto! ¡Victoria!
        </div>
      )}

      {validated && !showSuccessAnimation && <p style={{ color: 'limegreen' }}>✅ CAPTCHA validado: ¡Recursos entregados!</p>}
      {timeoutExpired && !validated && (
        <div>
          <p style={{ color: 'red' }}>❌ CAPTCHA fallido: ¡Tiempo agotado!</p>
          <button onClick={resetGame} style={{ padding: '10px 20px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Reiniciar
          </button>
        </div>
      )}
      {!validated && !timeoutExpired && assetsLoaded && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.9em' }}>
          Oro en TC: <b style={{color: 'gold'}}>{goldCollected} / 1</b> | Madera en TC: <b style={{color: 'green'}}>{woodCollected} / 1</b>
        </p>
      )}

      {/* Estilos CSS básicos para la animación (puedes ponerlos en un archivo CSS aparte) */}
      <style jsx>{`
        .success-message {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
          animation: pulse 1s infinite alternate;
        }

        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}