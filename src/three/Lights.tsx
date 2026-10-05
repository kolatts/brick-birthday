/** One hemisphere + one directional light: cheap, bright toy lighting. No shadow maps. */
export function Lights() {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#a8d4ff', 1.5]} />
      <directionalLight position={[8, 14, 6]} intensity={2.3} />
    </>
  );
}
