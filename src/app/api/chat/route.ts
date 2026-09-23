import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateCopilotResponse } from '@/lib/ai/provider';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión para usar el asistente.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { messages, projectId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere una lista de mensajes válida.' },
        { status: 400 }
      );
    }

    // Obtener contexto de proyecto si se especificó
    let projectContext: { id: string; name: string; code: string } | null = null;
    if (projectId && projectId !== 'ALL') {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true, code: true },
      });
      if (project) {
        projectContext = project;
      }
    }

    const result = await generateCopilotResponse({
      messages,
      projectContext,
    });

    return NextResponse.json({
      text: result.text,
      toolsExecuted: result.toolsExecuted,
    });
  } catch (error: any) {
    console.error('Error en /api/chat:', error);
    return NextResponse.json(
      {
        error: error.message || 'Ocurrió un error al procesar la respuesta con el asistente de IA.',
      },
      { status: 500 }
    );
  }
}
