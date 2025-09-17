import { Line, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useState, type JSX } from "react";
import { Vector3 } from "three";
import { CubeGraph } from "./lib/cube-graph";

const PreviewGraphCell = {
    Empty: 0,
    Fixed: 1,
    Pondering: 2,
} as const;
type PreviewGraphCell = (typeof PreviewGraphCell)[keyof typeof PreviewGraphCell];

function getUnitVector3s(): Vector3[] {
    const vs: Vector3[] = [];
    for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++)
            for (let k = -1; k <= 1; k++) {
                const v = new Vector3(i, j, k);
                if (v.lengthSq() === 1) {
                    vs.push(v);
                }
            }

    return vs;
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function App() {
    const [previewGraph, setPreviewGraph] = useState<CubeGraph<PreviewGraphCell> | null>(null);
    const [previewPath, setPreviewPath] = useState<Vector3[]>([]);

    const [isSolving, setIsSolving] = useState(false);
    const [snake, setSnake] = useState<number[]>("2,1,1,2,1,2,1,1,2,2,1,1,1,2,2,2,2".split(",").map(Number));

    const cubeSize = Math.cbrt(1 + snake.reduce((acc, cur) => acc + cur, 0));

    useEffect(() => {
        const graph = new CubeGraph<PreviewGraphCell>();
        setPreviewGraph(graph);
    }, []);

    const handleSnakeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (!/^(\d+,)*\d+$/.test(value)) {
            return;
        }

        setSnake(value.split(",").map(Number));
    };

    const runSolver = () => {
        setPreviewGraph(new CubeGraph());
        setIsSolving(true);

        const solve = async (
            graph: CubeGraph<boolean>,
            m: Vector3[],
            v: number[],
            a0: Vector3,
            d0: Vector3,
        ): Promise<null | Vector3[]> => {
            const a1 = a0.clone().add(d0.clone().multiplyScalar(v[0]));

            if (a1.toArray().some((c) => c < 0 || c >= cubeSize)) return null;

            for (let i = 1; i <= v[0]; i++) {
                if (graph.has(a0.clone().add(d0.clone().multiplyScalar(i)))) {
                    return null;
                }
            }

            for (let i = 1; i <= v[0]; i++) {
                graph.set(a0.clone().add(d0.clone().multiplyScalar(i)), true);
            }

            const v1 = v.slice(1);
            if (v1.length === 0) {
                setPreviewGraph(
                    new CubeGraph<PreviewGraphCell>(
                        graph
                            .entries()
                            .map<
                                [Vector3, PreviewGraphCell]
                            >(([k, v]) => [k, v ? PreviewGraphCell.Fixed : PreviewGraphCell.Empty]),
                    ),
                );

                const finalPath = [...m, a1];

                setPreviewPath(finalPath);
                return finalPath;
            }

            const nextDirections = getUnitVector3s().filter(
                (v) => !v.equals(d0) && !v.equals(d0.clone().multiplyScalar(-1)),
            );

            for (const d1 of nextDirections) {
                setPreviewGraph(
                    new CubeGraph<PreviewGraphCell>(
                        graph
                            .entries()
                            .map<
                                [Vector3, PreviewGraphCell]
                            >(([k, v]) => [k, v ? PreviewGraphCell.Fixed : PreviewGraphCell.Empty]),
                    ),
                );
                setPreviewPath(m);
                await delay(30);
                const steps = await solve(graph.clone(), [...m, a1], v1, a1, d1);
                if (steps) {
                    return steps;
                }
            }

            return null;
        };

        (async function () {
            const g = new CubeGraph<boolean>();
            const a0 = new Vector3(0, 0, 0);
            const d0 = new Vector3(1, 0, 0);
            g.set(a0, true);

            await solve(g, [a0], snake, a0, d0);

            setIsSolving(false);
        })();
    };

    return (
        <main className="flex flex-col max-w-xl mx-auto pt-8 pb-4">
            <h1 className="text-4xl mb-6">Snake Cube Solver</h1>
            <div className="flex flex-row gap-2">
                <label className="shrink-0">Snake Shape:</label>
                <input
                    type="text"
                    onChange={handleSnakeInput}
                    defaultValue={"2,1,1,2,1,2,1,1,2,2,1,1,1,2,2,2,2"}
                    className="border rounded-sm w-full px-1"
                />
            </div>
            <div className="flex flex-row gap-2 mb-4">
                <span>Cube Size:</span>
                <span>{cubeSize}</span>
                {!Number.isInteger(cubeSize) && <span className="font-bold text-red-400">!</span>}
            </div>
            <div className="flex flex-row mb-2">
                <button
                    role="button"
                    onClick={() => runSolver()}
                    disabled={isSolving || !Number.isInteger(cubeSize) || cubeSize < 2}
                    className="px-3 py-1 border rounded-md disabled:opacity-50"
                >
                    Solve
                </button>
            </div>
            <div className="h-96">
                <Canvas className="overflow-auto">
                    <ambientLight intensity={Math.PI / 2} />
                    <spotLight
                        position={[10, 10, 10]}
                        angle={0.15}
                        penumbra={1}
                        decay={0}
                        intensity={Math.PI}
                        castShadow={true}
                    />
                    <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} castShadow={true} />
                    {previewGraph &&
                        Array.from(previewGraph.entries())
                            .filter(([, v]) => v !== PreviewGraphCell.Empty)
                            .map(([k]) => (
                                <WoodenBlock
                                    key={k.toArray().join(",")}
                                    dark={(k.x + k.y + k.z) % 2 === 0}
                                    position={k}
                                />
                            ))}
                    {previewPath.length > 1 && (
                        <Line
                            points={previewPath}
                            color="green"
                            lineWidth={2}
                            renderOrder={9999}
                            depthTest={false}
                            depthWrite={false}
                        />
                    )}
                    <mesh
                        position={previewPath.length > 0 ? previewPath[previewPath.length - 1] : new Vector3(0, 0, 0)}
                        renderOrder={9999}
                    >
                        <sphereGeometry args={[0.15]} />
                        <meshStandardMaterial color="green" depthTest={false} depthWrite={false} />
                    </mesh>
                    <OrbitControls
                        target={new Vector3(cubeSize, cubeSize, cubeSize).multiplyScalar(1 / 2).addScalar(-0.5)}
                        minDistance={6}
                        maxDistance={8}
                        // lock vertical (polar) angle to a single elevation
                        minPolarAngle={(30 * Math.PI) / 180}
                        maxPolarAngle={(60 * Math.PI) / 180}
                        // Lock azimuthal (horizontal) angle to 45°
                        enablePan={false}
                        enableDamping
                        dampingFactor={0.08}
                        makeDefault
                    />
                </Canvas>
            </div>
        </main>
    );
}

export default App;

function WoodenBlock({ dark, ...props }: JSX.IntrinsicElements["mesh"] & { dark: boolean }) {
    const lightTextures = useTexture({
        map: "/textures/plywood_1k/plywood_diff_1k.jpg",
        normalMap: "/textures/plywood_1k/plywood_nor_gl_1k.jpg",
        roughnessMap: "/textures/plywood_1k/plywood_rough_1k.jpg",
    });
    const darkTextures = useTexture({
        map: "/textures/wood_table_worn_1k/wood_table_worn_diff_1k.jpg",
        normalMap: "/textures/wood_table_worn_1k/wood_table_worn_nor_gl_1k.jpg",
        roughnessMap: "/textures/wood_table_worn_1k/wood_table_worn_rough_1k.jpg",
    });

    return (
        <mesh {...props} castShadow={true} receiveShadow={true}>
            <boxGeometry args={[1, 1, 1]} />
            {dark ? <meshStandardMaterial {...darkTextures} /> : <meshStandardMaterial {...lightTextures} />}
        </mesh>
    );
}
