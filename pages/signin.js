import { auth, provider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState } from 'react';
import { theme } from '../styles/theme';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SignIn() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const signInWithEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      router.push('/dashboard');
    } catch (error) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (error) {
      setError('Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.colors.bgPrimary,
      fontFamily: "Inter, system-ui, sans-serif",
      color: theme.colors.textPrimary,
      display: "flex",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Background Pattern */}
      <div style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230EA5E9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        opacity: 0.5
      }}/>

      {/* Left Panel - Info */}
      <div style={{
        flex: "1",
        padding: "4rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
        background: `radial-gradient(circle at 0% 50%, ${theme.colors.bgSecondary} 0%, transparent 100%)`
      }}>
        <Link href="/" style={{
          position: "absolute",
          top: "2rem",
          left: "2rem",
          fontSize: "1.5rem",
          fontWeight: "700",
          background: theme.colors.gradientPrimary,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textDecoration: "none"
        }}>VladaHealth</Link>

        <div style={{maxWidth: "500px"}}>
          <h1 style={{
            fontSize: "3.5rem",
            fontWeight: "800",
            marginBottom: "1.5rem",
            background: theme.colors.gradientPrimary,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>Welcome Back</h1>
          
          <p style={{
            fontSize: "1.2rem",
            color: theme.colors.textSecondary,
            marginBottom: "2rem",
            lineHeight: "1.6"
          }}>Continue your fight against unfair medical bills with our AI-powered tools.</p>
        </div>
      </div>

      {/* Right Panel - Sign In Form */}
      <div style={{
        flex: "1",
        padding: "4rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: theme.colors.bgSecondary
      }}>
        <div style={{
          width: "100%",
          maxWidth: "400px"
        }}>
          <h2 style={{
            fontSize: "2rem",
            fontWeight: "700",
            marginBottom: "2rem",
            textAlign: "center"
          }}>Sign In</h2>

          <form onSubmit={signInWithEmail}>
            <div style={{marginBottom: "1.5rem"}}>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: theme.borderRadius.md,
                  color: theme.colors.textPrimary,
                  fontSize: "1rem"
                }}
                required
              />
            </div>

            <div style={{marginBottom: "1.5rem"}}>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: theme.borderRadius.md,
                  color: theme.colors.textPrimary,
                  fontSize: "1rem"
                }}
                required
              />
            </div>

            {error && (
              <div style={{
                color: theme.colors.accent,
                textAlign: "center",
                marginBottom: "1rem",
                padding: "0.5rem",
                borderRadius: theme.borderRadius.sm,
                background: "rgba(236, 72, 153, 0.1)"
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "1rem",
                background: theme.colors.gradientPrimary,
                border: "none",
                borderRadius: theme.borderRadius.md,
                color: theme.colors.textPrimary,
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                marginBottom: "1rem"
              }}
            >
              {isLoading ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}>
                  <LoadingSpinner />
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div style={{
            margin: "2rem 0",
            display: "flex",
            alignItems: "center",
            gap: "1rem"
          }}>
            <div style={{flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.1)"}} />
            <span style={{color: theme.colors.textSecondary}}>or</span>
            <div style={{flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.1)"}} />
          </div>

          <button
            onClick={signInWithGoogle}
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "1rem",
              background: "transparent",
              border: `1px solid ${theme.colors.primary}`,
              borderRadius: theme.borderRadius.md,
              color: theme.colors.primary,
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
              alt="Google logo"
              style={{width: "20px", height: "20px"}}
            />
            Sign in with Google
          </button>

          <p style={{
            textAlign: "center",
            marginTop: "2rem",
            color: theme.colors.textSecondary
          }}>
            Don't have an account?{' '}
            <Link href="/signup" style={{
              color: theme.colors.primary,
              textDecoration: "none",
              fontWeight: "500"
            }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 