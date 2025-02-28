export default function LoadingSpinner({ size = 24 }) {
  return (
    <div style={{
      display: 'inline-block',
      width: `${size}px`,
      height: `${size}px`,
      border: `${size/8}px solid rgba(255, 255, 255, 0.3)`,
      borderRadius: '50%',
      borderTop: `${size/8}px solid #fff`,
      animation: 'spin 1s linear infinite'
    }}>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 