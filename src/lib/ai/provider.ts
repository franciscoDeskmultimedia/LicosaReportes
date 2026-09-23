import Groq from 'groq-sdk';
import { AI_TOOLS_DEFINITIONS, executeAiTool } from './tools';

/**
 * AI Provider Adapter
 * 
 * Actualmente configurado con GROQ (Llama 3.3 70B Versatile).
 * 
 * NOTA PARA MIGRAR A CLAUDE (Anthropic):
 * Cuando el cliente active su API key de Claude (console.anthropic.com):
 * 1. Instalar `@anthropic-ai/sdk`
 * 2. Cambiar esta llamada a `anthropic.messages.create(...)`
 * 3. Las herramientas (`src/lib/ai/tools.ts`) y la interfaz UI no requerirán ningún cambio.
 */

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

const DEFAULT_SYSTEM_PROMPT = `Eres "LICOSA Copilot", el asistente técnico de inteligencia artificial experto en ingeniería vial y control de obra para la empresa constructora LICOSA (Ecuador).
Tu objetivo es responder de manera profesional, precisa, concisa y basada exclusivamente en los datos reales del sistema.

REGLA FUNDAMENTAL DE IDIOMA:
- Debes responder SIEMPRE Y EXCLUSIVAMENTE en idioma español.
- Bajo ninguna circunstancia respondas en inglés ni en otro idioma, incluso si el usuario escribe en inglés o los nombres de las funciones o esquemas internos están en inglés.
- Todos los títulos, tablas, resúmenes, viñetas, observaciones y explicaciones técnicas deben estar 100% en español.

Reglas de comportamiento:
1. Siempre que el usuario pregunte sobre proyectos, avances, rubros, presupuesto, reportes diarios, maquinaria, materiales o solicitudes, UTILIZA LAS HERRAMIENTAS DISPONIBLES para consultar la base de datos antes de responder.
2. Si el usuario no especifica el proyecto y hay más de uno disponible, consulta primero la lista de proyectos con 'listUserProjects' y solicita aclaración o responde con base en el proyecto seleccionado.
3. Presenta los números y métricas de manera clara:
   - Formatea dineros en dólares con comas y 2 decimales (ej: $1,250,450.00).
   - Muestra porcentajes con 1 o 2 decimales (ej: 64.20%).
   - Usa viñetas o tablas markdown compactas para listar rubros o materiales.
4. Si un rubro supera el 100% de ejecución o un material está bajo su stock mínimo, resáltalo con un aviso de atención (⚠️).
5. Sé cortés, técnico y profesional (terminología de obras viales, fiscalización, planillaje, rubros contractuales, SPI, desfasajes).
6. Si alguna herramienta reporta un error o no hay datos, infórmaselo honestamente al usuario sin inventar información.
7. Si el usuario solicita un resumen general de la empresa, de todo el sistema o de múltiples obras, utiliza 'getSystemSummary' o 'listUserProjects' para responder directamente sin llamar herramientas adicionales de cada proyecto por separado.`;

export async function generateCopilotResponse({
  messages,
  projectContext,
}: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  projectContext?: { id: string; name: string; code: string } | null;
}): Promise<{
  text: string;
  toolsExecuted: string[];
}> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY no está configurada en el archivo de entorno .env.');
  }

  const systemPrompt = projectContext
    ? `${DEFAULT_SYSTEM_PROMPT}\n\n[CONTEXTO ACTIVO]: El usuario se encuentra consultando actualmente el proyecto "${projectContext.name}" (Código: ${projectContext.code}, ID: "${projectContext.id}"). Si la pregunta no menciona otro proyecto, asume que se refiere a este.`
    : DEFAULT_SYSTEM_PROMPT;

  // Preparamos historial de mensajes para la API
  const conversationHistory: any[] = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-10), // Limitamos al historial reciente para ahorrar contexto
  ];

  const toolsExecuted: string[] = [];
  let iterations = 0;
  const MAX_TOOL_ITERATIONS = 6; // Permite flujos complejos de herramientas

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    let response;
    try {
      response = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: conversationHistory,
        tools: AI_TOOLS_DEFINITIONS,
        tool_choice: 'auto',
        temperature: 0.2,
        max_completion_tokens: 1500,
      });
    } catch (modelError: any) {
      console.warn('Fallback a openai/gpt-oss-20b debido a:', modelError?.message);
      response = await groq.chat.completions.create({
        model: 'openai/gpt-oss-20b',
        messages: conversationHistory,
        tools: AI_TOOLS_DEFINITIONS,
        tool_choice: 'auto',
        temperature: 0.2,
        max_completion_tokens: 1500,
      });
    }

    const choice = response.choices[0];
    const message = choice.message;

    // Si el modelo solicita llamar a una o más herramientas
    if (message.tool_calls && message.tool_calls.length > 0) {
      conversationHistory.push(message);

      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        let functionArgs: Record<string, any> = {};
        try {
          functionArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          functionArgs = {};
        }

        // Si no se pasó projectId y tenemos un contexto activo, inyectarlo
        if (!functionArgs.projectId && projectContext?.id) {
          functionArgs.projectId = projectContext.id;
        }

        toolsExecuted.push(functionName);
        const result = await executeAiTool(functionName, functionArgs);

        conversationHistory.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: functionName,
          content: JSON.stringify(result),
        });
      }
      // Vuelve a iterar para que el modelo interprete los resultados de las herramientas
      continue;
    }

    // Respuesta final en texto
    return {
      text: message.content || 'No pude generar una respuesta para tu consulta.',
      toolsExecuted,
    };
  }

  // Si se alcanzó el límite de llamadas a herramientas, obligamos al modelo a sintetizar la respuesta con los datos que ya recopiló
  try {
    const finalResponse = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: conversationHistory,
      tool_choice: 'none',
      temperature: 0.2,
      max_completion_tokens: 1500,
    });
    return {
      text: finalResponse.choices[0]?.message?.content || 'Aquí está el resumen con la información recopilada en el sistema.',
      toolsExecuted,
    };
  } catch {
    return {
      text: 'Se recopilaron los datos del sistema, pero ocurrió un retraso al procesar la respuesta final. Por favor intenta consultar por un proyecto o rubro específico.',
      toolsExecuted,
    };
  }
}
