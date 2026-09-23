import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY no configurada.' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'No se recibió ningún archivo de audio válido.' },
        { status: 400 }
      );
    }

    // Llamada a Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: file as any,
      model: 'whisper-large-v3-turbo',
      language: 'es', // Español para máxima precisión técnica y acento latinoamericano
      temperature: 0.0,
      response_format: 'json',
    });

    return NextResponse.json({
      text: transcription.text || '',
    });
  } catch (error: any) {
    console.error('Error en /api/transcribe:', error);
    return NextResponse.json(
      { error: error.message || 'Error al transcribir el audio con Whisper.' },
      { status: 500 }
    );
  }
}
