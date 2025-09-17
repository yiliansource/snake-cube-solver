import { Vector3 } from "three";

export class CubeGraph<T> {
    constructor(entries: [Vector3, T][] = []) {
        this.nodes = new Map<string, T>(entries.map(([k, v]) => [k.toArray().join(","), v]));
    }

    private nodes: Map<string, T>;

    clone(): CubeGraph<T> {
        const g = new CubeGraph<T>();
        g.nodes = new Map<string, T>(this.nodes);
        return g;
    }

    get(v: Vector3): T | undefined {
        return this.nodes.get(v.toArray().join(","));
    }

    has(v: Vector3): boolean {
        return Boolean(this.get(v));
    }

    set(v: Vector3, t: T) {
        this.nodes.set(v.toArray().join(","), t);
    }

    entries(): [Vector3, T][] {
        return Array.from(this.nodes.entries()).map(([k, v]) => [new Vector3(...k.split(",").map(Number)), v]);
    }
}
