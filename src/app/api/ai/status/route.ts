// Modified: Added AI status proxy route to monitor Flask server health
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

export async function GET() {
  try {
    // Check Flask server health
    const healthResponse = await fetchWithTimeout(`${FLASK_URL}/health`, {
      method: 'GET'
    });

    const modelInfoResponse = await fetchWithTimeout(`${FLASK_URL}/model-info`, {
      method: 'GET'
    });

    if (!healthResponse.ok) {
      throw new Error('Flask server unreachable');
    }

    const healthData = await healthResponse.json();
    
    // Model info may return 404 if models don't exist yet - this is acceptable
    let modelInfoData = null;
    if (modelInfoResponse.ok) {
      modelInfoData = await modelInfoResponse.json();
    }

    return NextResponse.json({
      flaskOnline: true,
      health: healthData,
      modelInfo: modelInfoData
    });
  } catch (error) {
    // Graceful fallback when Flask is offline
    return NextResponse.json({ 
      flaskOnline: false,
      message: 'Serveur Flask inaccessible'
    }, { status: 200 });
  }
}
