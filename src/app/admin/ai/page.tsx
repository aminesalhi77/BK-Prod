// Modified: Added AI admin interface with 4 sections for Flask server integration
'use client';

import React, { useState, useEffect } from 'react';
import styles from './ai.module.css';

interface AIStatus {
  flaskOnline: boolean;
  health?: any;
  modelInfo?: any;
}

interface PredictionResult {
  success: boolean;
  recommendations?: string[];
  predictions?: {
    palettes_prevues: number;
    tonnage_prevu: number;
    cycles_prevus: number;
    boites_prevues: number;
    risque_alertes: number;
  };
  error?: string;
}

interface TrainResult {
  success: boolean;
  message?: string;
  output?: string;
  error?: string;
}

interface UploadResult {
  success: boolean;
  filename?: string;
  message?: string;
  error?: string;
}

export default function AIAdminPage() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingPredict, setLoadingPredict] = useState(false);
  const [loadingTrain, setLoadingTrain] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);
  
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [trainResult, setTrainResult] = useState<TrainResult | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDirectoryImport, setIsDirectoryImport] = useState(false);

  // Section 1: Server Status
  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const response = await fetch('/api/ai/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching AI status:', error);
      setStatus({ flaskOnline: false });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Auto-refresh status every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Section 2: Import Excel Data
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles);
      setIsDirectoryImport(false);
    }
  };

  const handleDirectoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const directory = e.target.files?.[0];
    if (directory) {
      // For directory import, we'll handle this differently
      setIsDirectoryImport(true);
      // We'll use the directory path in the upload function
      setFiles([directory]);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setUploadResult({
        success: false,
        error: 'Veuillez sélectionner un ou plusieurs fichiers Excel (.xlsx) à importer.'
      });
      return;
    }

    setLoadingUpload(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      
      if (isDirectoryImport) {
        // For directory import, send the directory path
        formData.append('directory', files[0].webkitRelativePath || files[0].name);
      } else {
        // For individual files, append each file
        files.forEach(file => {
          formData.append('files', file);
        });
      }

      const response = await fetch('/api/ai/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setUploadResult(result);
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadResult({
        success: false,
        error: 'Erreur lors de l\'importation des fichiers.'
      });
    } finally {
      setLoadingUpload(false);
    }
  };

  // Section 3: Train Model
  const handleTrain = async () => {
    setLoadingTrain(true);
    setTrainResult(null);

    try {
      const response = await fetch('/api/ai/retrain', {
        method: 'POST',
      });

      const result = await response.json();
      setTrainResult(result);
    } catch (error) {
      console.error('Error training model:', error);
      setTrainResult({
        success: false,
        error: 'Erreur lors de l\'entraînement du modèle.'
      });
    } finally {
      setLoadingTrain(false);
    }
  };

  // Section 4: Generate Tomorrow's Plan
  const handlePredict = async () => {
    setLoadingPredict(true);
    setPredictionResult(null);

    try {
      const response = await fetch('/api/ai/predict');
      const result = await response.json();
      setPredictionResult(result);
    } catch (error) {
      console.error('Error getting prediction:', error);
      setPredictionResult({
        success: false,
        error: 'Erreur lors de la génération du plan.'
      });
    } finally {
      setLoadingPredict(false);
    }
  };

  // Format recommendation lines
  const formatRecommendations = (recommendations: string[]) => {
    return recommendations.map((line, index) => {
      if (line.startsWith('===')) {
        return <div key={index} className={`${styles.recommendationLine} ${styles.divider}`}></div>;
      }
      
      let className = styles.recommendationLine;
      if (line.startsWith('❄️') || line.startsWith('🏭') || line.startsWith('🔥') || line.startsWith('📦') || line.startsWith('⏱️')) {
        className = `${styles.recommendationLine} ${styles.header}`;
      } else if (line.includes('🔴')) {
        className = `${styles.recommendationLine} ${styles.red}`;
      } else if (line.includes('🟡')) {
        className = `${styles.recommendationLine} ${styles.yellow}`;
      } else if (line.includes('🟢')) {
        className = `${styles.recommendationLine} ${styles.green}`;
      }

      return <div key={index} className={className}>{line}</div>;
    });
  };

  return (
    <div className={styles.container}>
      {/* Section 1: Server Status Card */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🤖 Serveur IA</h2>
        <div className={styles.statusCard}>
          <div className={styles.statusInfo}>
            <span className={styles.statusLabel}>État du serveur</span>
            {loadingStatus ? (
              <div className={styles.spinner}></div>
            ) : status ? (
              <span className={`${styles.statusBadge} ${status.flaskOnline ? styles.online : styles.offline}`}>
                {status.flaskOnline ? 'En ligne ✅' : 'Hors ligne ❌'}
              </span>
            ) : (
              <span className={`${styles.statusBadge} ${styles.offline}`}>Inconnu</span>
            )}
          </div>
          <div>
            <button className={styles.refreshBtn} onClick={fetchStatus} disabled={loadingStatus}>
              Rafraîchir
            </button>
          </div>
        </div>

        {status && status.flaskOnline && status.modelInfo ? (
          <div style={{ marginTop: '1rem' }}>
            <p>Modèles entraînés ✅</p>
            <p>Données d'entraînement: {status.modelInfo.rowCount} lignes</p>
            <p>Précision: {status.modelInfo.accuracy ? `${(status.modelInfo.accuracy * 100).toFixed(2)}%` : 'Non disponible'}</p>
          </div>
        ) : status && status.flaskOnline && !status.modelInfo ? (
          <div style={{ marginTop: '1rem' }}>
            <p>⚠️ Aucun modèle entraîné — importez des données et entraînez</p>
          </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            <p>Pour démarrer le serveur IA: <code>cd bkfood_ai && python 5_api_server.py</code></p>
          </div>
        )}
      </div>

      {/* Section 2: Import Excel Data */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📂 Importer données Excel</h2>
        <p>Exportez les données depuis le tableau de bord Admin, puis importez le fichier ici pour entraîner le modèle.</p>
        
        <div className={styles.uploadSection}>
          <div className={styles.uploadForm}>
            <div className={styles.fileInputContainer}>
              <label className={styles.fileInputLabel}>
                <input
                  type="file"
                  accept=".xlsx"
                  multiple
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
                <span className={styles.fileInputText}>Sélectionner fichiers Excel</span>
              </label>
              
              <div className={styles.orSeparator}>
                <span>ou</span>
              </div>
              
              <label className={styles.fileInputLabel}>
                <input
                  type="file"
                  // @ts-ignore - webkitdirectory is a non-standard attribute but supported by browsers
                  webkitdirectory=""
                  // @ts-ignore - directory is a non-standard attribute but supported by browsers
                  directory=""
                  onChange={handleDirectoryChange}
                  className={styles.fileInput}
                />
                <span className={styles.fileInputText}>Importer dossier complet</span>
              </label>
            </div>
            
            <div className={styles.fileList}>
              {files.length > 0 && (
                <div className={styles.selectedFiles}>
                  <strong>Fichiers sélectionnés ({files.length}):</strong>
                  <ul>
                    {files.map((file, index) => (
                      <li key={index} className={styles.fileItem}>
                        {isDirectoryImport ? '📁 ' : '📄 '}{file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button 
              className={styles.importBtn} 
              onClick={handleUpload} 
              disabled={loadingUpload || files.length === 0}
            >
              {loadingUpload ? 'Importation...' : 'Importer'}
            </button>
          </div>
          
          <div className={styles.workflowSteps}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Étapes du workflow:</h3>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>1</div>
              <span className={styles.stepText}>Exporter Excel depuis le dashboard Admin</span>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>2</div>
              <span className={styles.stepText}>Importer le fichier ici</span>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>3</div>
              <span className={styles.stepText}>Entraîner le modèle</span>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>4</div>
              <span className={styles.stepText}>Générer le plan</span>
            </div>
          </div>
        </div>

        {uploadResult && (
          <div className={`${styles.messageBox} ${uploadResult.success ? styles.success : styles.error}`}>
            {uploadResult.success ? '✅' : '❌'} {uploadResult.message || uploadResult.error}
          </div>
        )}
      </div>

      {/* Section 3: Train Model */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>⚙️ Entraîner le modèle</h2>
        <p>Lance l'entraînement avec toutes les données importées. Durée: 10–60 secondes selon le volume.</p>
        
        {/* Offline banner */}
        {status && !status.flaskOnline && (
          <div style={{ 
            background: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: '8px', 
            padding: '1rem', 
            marginBottom: '1rem',
            color: '#dc2626',
            fontWeight: '600'
          }}>
            ⚠️ Le serveur IA est arrêté.
            <br />
            Ouvrez un terminal et lancez:
            <br />
            <code style={{ background: '#fee2e2', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem' }}>
              cd bkfood_ai && python 5_api_server.py
            </code>
          </div>
        )}
        
        <div className={styles.trainSection}>
          <div className={styles.trainForm}>
            <button 
              className={styles.trainBtn} 
              onClick={handleTrain} 
              disabled={loadingTrain || (status?.flaskOnline === false)}
            >
              {loadingTrain ? 'Entraînement en cours...' : 'Entraîner maintenant'}
            </button>
          </div>
          
          <div className={styles.trainInfo}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Sortie de l'entraînement:</h3>
            {trainResult ? (
              trainResult.success ? (
                <div>
                  <div className={`${styles.messageBox} ${styles.success}`}>
                    ✅ {trainResult.message || 'Modèles entraînés avec succès'}
                  </div>
                  {trainResult.output && (
                    <div className={styles.outputBox}>
                      {trainResult.output}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`${styles.messageBox} ${styles.error}`}>
                  ❌ {trainResult.error || 'Erreur lors de l\'entraînement'}
                </div>
              )
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                Aucun résultat d'entraînement pour le moment.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 4: Generate Tomorrow's Plan */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📊 Plan d'action pour demain</h2>
        
        <div className={styles.predictSection}>
          <div className={styles.predictForm}>
            <button 
              className={styles.predictBtn} 
              onClick={handlePredict} 
              disabled={loadingPredict}
            >
              {loadingPredict ? 'Analyse en cours...' : 'Générer le plan'}
            </button>
          </div>
          
          <div className={styles.predictInfo}>
            {predictionResult ? (
              predictionResult.success ? (
                <div>
                  <div className={`${styles.messageBox} ${styles.success}`}>
                    ✅ Plan généré avec succès
                  </div>
                  
                  {predictionResult.predictions && (
                    <div>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Prédictions:</h3>
                      <div className={styles.predictionGrid}>
                        <div className={styles.predictionCard}>
                          <div className={styles.predictionLabel}>Palettes prévues</div>
                          <div className={styles.predictionValue}>{predictionResult.predictions.palettes_prevues} Palettes</div>
                        </div>
                        <div className={styles.predictionCard}>
                          <div className={styles.predictionLabel}>Tonnage prévu</div>
                          <div className={styles.predictionValue}>{predictionResult.predictions.tonnage_prevu} kg</div>
                        </div>
                        <div className={styles.predictionCard}>
                          <div className={styles.predictionLabel}>Cycles prévus</div>
                          <div className={styles.predictionValue}>{predictionResult.predictions.cycles_prevus}Cycles</div>
                        </div>
                        <div className={styles.predictionCard}>
                          <div className={styles.predictionLabel}>Boîtes prévues</div>
                          <div className={styles.predictionValue}>{predictionResult.predictions.boites_prevues}Boîtes</div>
                        </div>
                        <div className={styles.predictionCard}>
                          <div className={styles.predictionLabel}>Risque alertes</div>
                          <div className={styles.predictionValue}>{predictionResult.predictions.risque_alertes}%</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {predictionResult.recommendations && (
                    <div>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Recommandations:</h3>
                      <div className={styles.recommendationsBox}>
                        {formatRecommendations(predictionResult.recommendations)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`${styles.messageBox} ${styles.error}`}>
                  ❌ {predictionResult.error || 'Erreur lors de la génération du plan'}
                </div>
              )
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                Cliquez sur "Générer le plan" pour analyser les données d'aujourd'hui et obtenir les recommandations pour demain.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}