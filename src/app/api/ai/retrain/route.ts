// Modified: Added AI retrain proxy route to call Flask retrain endpoint
import { NextRequest, NextResponse } from 'next/server';

const FLASK_URL = process.env.FLASK_AI_URL || 'http://127.0.0.1:5001';

// Timeout wrapper for Flask calls
async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const res = await fetch(url, { signal: controller.signal, ...options });
    clearTimeout(timeout);
    return res;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Serveur IA timeout');
    throw new Error('Serveur IA non disponible');
  }
}

export async function POST() {
  try {
    const response = await fetchWithTimeout(`${FLASK_URL}/retrain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Flask retrain endpoint failed');
    }

    const retrainData = await response.json();
    return NextResponse.json(retrainData);
  } catch (error) {
    console.error('[ai-retrain]', error);
    return NextResponse.json({
      success: false,
      error: 'Impossible de contacter le serveur IA. Vérifiez que le serveur Flask est démarré.'
    }, { status: 500 });
  }
}
