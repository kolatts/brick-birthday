export function Rotate() {
  return (
    <div
      className="screen center-col"
      data-testid="rotate-screen"
      style={{ zIndex: 1000, background: '#3A86FF', color: '#fff' }}
    >
      <div
        aria-hidden
        style={{
          width: 90,
          height: 130,
          border: '8px solid #fff',
          borderRadius: 18,
          background: '#FF5CA8',
          animation: 'spin-tablet 2.4s ease-in-out infinite',
        }}
      />
      <h1 style={{ margin: 0, fontSize: 48 }}>Turn me sideways!</h1>
      <p style={{ margin: 0, fontSize: 24 }}>Luna's island works best in landscape.</p>
    </div>
  );
}
