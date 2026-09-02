import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ALLOWED_PARTICIPANTS } from "./participants";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME!;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "*";

interface SubmitBody {
  participant?: string;
  link?: string;
  clientMeta?: Record<string, unknown>;
}

interface GeoInfo {
  city?: string;
  country?: string;
}

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    },
    body: JSON.stringify(body),
  };
}

function isValidLink(link: string): boolean {
  try {
    const url = new URL(link);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function lookupGeo(ip: string): Promise<GeoInfo | null> {
  if (!ip || ip === "127.0.0.1") return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,country`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return (await res.json()) as GeoInfo;
  } catch {
    return null; // geolocalizacion es best-effort, no debe bloquear el guardado del envio
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (!event.body) {
    return jsonResponse(400, { error: "Falta el cuerpo de la solicitud" });
  }

  let body: SubmitBody;
  try {
    body = JSON.parse(event.body) as SubmitBody;
  } catch {
    return jsonResponse(400, { error: "JSON inválido" });
  }

  const { participant, link, clientMeta } = body;

  if (!participant || !ALLOWED_PARTICIPANTS.includes(participant)) {
    return jsonResponse(400, { error: "Participante no válido" });
  }

  if (!link || typeof link !== "string" || link.length > 2000 || !isValidLink(link)) {
    return jsonResponse(400, { error: "Link no válido" });
  }

  const ip = event.requestContext.http.sourceIp;
  const geo = await lookupGeo(ip);

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        participant,
        submittedAt: new Date().toISOString(),
        link,
        ip,
        geo,
        clientMeta: clientMeta ?? {},
      },
    })
  );

  return jsonResponse(200, { ok: true });
};
