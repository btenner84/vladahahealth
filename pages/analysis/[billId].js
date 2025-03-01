import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../../firebase';
import { theme } from '../../styles/theme';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Document from 'next/document';

export default function BillAnalysis() {
  const router = useRouter();
  const { billId } = router.query;
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [billData, setBillData] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState('idle'); // idle, extracting, analyzing, complete, error
  const [rawData, setRawData] = useState({
    extractedText: '',
    loading: false
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        if (billId) {
          await fetchBillData(billId);
        }
      } else {
        router.push('/signin');
      }
      setIsLoading(false);
    });

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    if (typeof window !== 'undefined') {
      handleResize();
      window.addEventListener('resize', handleResize);
    }

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [router, billId]);

  const fetchBillData = async (id) => {
    try {
      const billDoc = await getDoc(doc(db, 'bills', id));
      if (!billDoc.exists()) {
        throw new Error('Bill not found');
      }
      const data = billDoc.data();
      setBillData(data);
      
      // Start extraction if not already done
      if (!data.extractedData) {
        startDataExtraction(data);
      } else {
        setExtractedData(data.extractedData);
        setAnalysisStatus('complete');
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
      setAnalysisStatus('error');
    }
  };

  const generateSummary = async (text) => {
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) throw new Error('Failed to generate summary');
      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('Summary generation failed:', error);
      return 'Failed to generate summary';
    }
  };

  const startDataExtraction = async (billData) => {
    setAnalysisStatus('loading');
    setRawData(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billId: billData.id,
          fileUrl: billData.fileUrl,
          userId: user.uid  // Add userId to request
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const data = await response.json();
      setExtractedData(data);
      
      // Get the raw extracted text from Firestore
      const docRef = doc(db, 'bills', billData.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const extractedText = docSnap.data().extractedText || '';
        console.log('Extracted text:', extractedText); // Add logging
        setRawData(prev => ({ ...prev, extractedText }));
      }

      setAnalysisStatus('complete');
    } catch (error) {
      console.error('Extraction error:', error);
      setAnalysisStatus('error');
      setExtractedData(error.cause || { error: error.message });
    } finally {
      setRawData(prev => ({ ...prev, loading: false }));
    }
  };

  if (isLoading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0F172A"
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "3px solid rgba(255, 255, 255, 0.1)",
          borderTopColor: "#3B82F6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F172A",
      color: "#E2E8F0"
    }}>
      {/* Navigation Bar */}
      <nav style={{
        padding: "1rem 2rem",
        background: "#1E293B",
        borderBottom: "1px solid #334155",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <Link href="/dashboard" style={{
          color: "#E2E8F0",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <span style={{
            fontSize: "1.5rem",
            fontWeight: "bold"
          }}>← Back to Dashboard</span>
        </Link>
      </nav>

      {/* Main Content */}
      <div style={{
        maxWidth: "1400px",
        margin: "2rem auto",
        padding: "0 2rem"
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "2rem"
        }}>
          {/* Document Viewer */}
          <div style={{
            background: "#1E293B",
            borderRadius: "0.75rem",
            overflow: "hidden",
            height: isMobile ? "50vh" : "calc(100vh - 150px)",
            position: "sticky",
            top: "2rem",
            border: "1px solid #334155"
          }}>
            {billData?.fileUrl ? (
              <iframe
                src={billData.fileUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  background: "#fff"
                }}
                title="Bill Document"
              />
            ) : (
              <div style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94A3B8"
              }}>
                Loading document...
              </div>
            )}
          </div>

          {/* Analysis Section */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "2rem"
          }}>
            {/* Extracted Data */}
            <div style={{
              background: "#1E293B",
              borderRadius: "0.75rem",
              padding: "2rem",
              border: "1px solid #334155"
            }}>
              <h2 style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "1.5rem",
                color: "#E2E8F0"
              }}>Analysis Results</h2>

              {analysisStatus === 'extracting' && (
                <div style={{
                  textAlign: "center",
                  padding: "2rem"
                }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    margin: "0 auto 1rem",
                    border: "3px solid rgba(255, 255, 255, 0.1)",
                    borderTopColor: "#3B82F6",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  <p style={{ color: "#94A3B8" }}>Analyzing your bill...</p>
                </div>
              )}

              {analysisStatus === 'complete' && extractedData && (
                <div style={{ display: "grid", gap: "2rem" }}>
                  {/* Patient Info */}
                  <div style={{
                    background: "#0F172A",
                    padding: "1.5rem",
                    borderRadius: "0.75rem",
                    border: "1px solid #334155"
                  }}>
                    <h3 style={{
                      fontSize: "1.1rem",
                      fontWeight: "600",
                      marginBottom: "1rem",
                      color: "#E2E8F0"
                    }}>Patient Information</h3>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {Object.entries(extractedData.patientInfo).map(([key, value]) => (
                        <p key={key} style={{ color: "#94A3B8" }}>
                          <strong style={{ color: "#E2E8F0" }}>{key}:</strong> {value}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Bill Info */}
                  <div style={{
                    background: "#0F172A",
                    padding: "1.5rem",
                    borderRadius: "0.75rem",
                    border: "1px solid #334155"
                  }}>
                    <h3 style={{
                      fontSize: "1.1rem",
                      fontWeight: "600",
                      marginBottom: "1rem",
                      color: "#E2E8F0"
                    }}>Bill Details</h3>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {Object.entries(extractedData.billInfo).map(([key, value]) => (
                        <p key={key} style={{ color: "#94A3B8" }}>
                          <strong style={{ color: "#E2E8F0" }}>{key}:</strong> {value}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Services */}
                  <div style={{
                    background: "#0F172A",
                    padding: "1.5rem",
                    borderRadius: "0.75rem",
                    border: "1px solid #334155"
                  }}>
                    <h3 style={{
                      fontSize: "1.1rem",
                      fontWeight: "600",
                      marginBottom: "1rem",
                      color: "#E2E8F0"
                    }}>Services</h3>
                    <div style={{ display: "grid", gap: "1rem" }}>
                      {extractedData.services.map((service, index) => (
                        <div key={index} style={{
                          padding: "1rem",
                          background: "#1E293B",
                          borderRadius: "0.5rem",
                          border: "1px solid #334155"
                        }}>
                          {Object.entries(service).map(([key, value]) => (
                            <p key={key} style={{ 
                              color: "#94A3B8",
                              marginBottom: "0.5rem"
                            }}>
                              <strong style={{ color: "#E2E8F0" }}>{key}:</strong> {value}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Insurance Info */}
                  {extractedData.insuranceInfo && (
                    <div style={{
                      background: "#0F172A",
                      padding: "1.5rem",
                      borderRadius: "0.75rem",
                      border: "1px solid #334155"
                    }}>
                      <h3 style={{
                        fontSize: "1.1rem",
                        fontWeight: "600",
                        marginBottom: "1rem",
                        color: "#E2E8F0"
                      }}>Insurance Information</h3>
                      <div style={{ display: "grid", gap: "0.5rem" }}>
                        {Object.entries(extractedData.insuranceInfo).map(([key, value]) => (
                          <p key={key} style={{ color: "#94A3B8" }}>
                            <strong style={{ color: "#E2E8F0" }}>{key}:</strong> {value}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {analysisStatus === 'error' && (
                <div style={{
                  padding: "2rem",
                  background: "rgba(239, 68, 68, 0.1)",
                  borderRadius: "0.75rem",
                  textAlign: "center",
                  border: "1px solid rgba(239, 68, 68, 0.2)"
                }}>
                  <h3 style={{
                    color: "#EF4444",
                    marginBottom: "1rem"
                  }}>Analysis Failed</h3>
                  {extractedData?.error && (
                    <div style={{
                      marginBottom: "1.5rem",
                      color: "#94A3B8"
                    }}>
                      <p>{extractedData.error}</p>
                      {extractedData.details && (
                        <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>{extractedData.details}</p>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => billData && startDataExtraction(billData)}
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: "#3B82F6",
                      color: "#E2E8F0",
                      border: "none",
                      borderRadius: "0.5rem",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontWeight: "500"
                    }}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {/* Raw Text */}
            <div style={{
              background: "#1E293B",
              borderRadius: "0.75rem",
              padding: "2rem",
              border: "1px solid #334155",
              marginTop: "2rem"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem"
              }}>
                <h2 style={{
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  color: "#E2E8F0"
                }}>Extracted Text</h2>
                <button
                  onClick={() => navigator.clipboard.writeText(rawData.extractedText)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#3B82F6",
                    color: "#E2E8F0",
                    border: "none",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontSize: "0.9rem"
                  }}
                >
                  Copy
                </button>
              </div>
              {rawData.loading ? (
                <div style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "#94A3B8"
                }}>
                  Extracting text...
                </div>
              ) : (
                <pre style={{
                  background: "#0F172A",
                  padding: "1.5rem",
                  borderRadius: "0.75rem",
                  color: "#94A3B8",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: "300px",
                  overflowY: "auto",
                  fontSize: "0.9rem",
                  lineHeight: "1.6",
                  border: "1px solid #334155"
                }}>
                  {rawData.extractedText || 'No text extracted yet'}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 