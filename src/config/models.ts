/**
 * Static manifest of the .glb files present in public/models/ (name without extension).
 * Add a name here when you drop <name>.glb into public/models/ (keep each under 300 KB);
 * <Model name="..."> then loads it instead of its procedural fallback. No runtime probing.
 * `npm run models:build` (Blender) produces the figure files below; Avatar falls back to the procedural figure if one fails to load.
 */
export const availableModels: readonly string[] = ['luna', 'mom', 'dad', 'julian', 'darian', 'rudolph', 'jinglebells'];
