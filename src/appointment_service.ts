import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { smartCrop, InfraiError } from "./infrai_client.js";

const imageSchema = z.object({image_id:z.string().min(1)});
const requestSchema = z.object({appointmentId:z.string().min(1), patientName:z.string().min(1), image:imageSchema, aspects:z.array(z.string().regex(/^\d+:\d+$/)).min(1)});
export async function prepareAppointmentAssets(input: unknown) {
  const request = requestSchema.parse(input);
  const crops = await Promise.all(request.aspects.map(aspect=>smartCrop(request.image, aspect, `${request.appointmentId}-${aspect}`)));
  return {appointmentId:request.appointmentId, patient:{name:request.patientName, notification:"ready"}, crops};
}

export function start(port=Number(process.env.PORT ?? 3000)) {
  const server=createServer(async (req,res)=>{
    if (req.method!=="POST" || !req.url?.startsWith("/appointments/")) {res.writeHead(404); res.end(); return;}
    try { const body=await new Promise<string>((resolve,reject)=>{let raw=""; req.on("data",c=>raw+=c); req.on("end",()=>resolve(raw)); req.on("error",reject);}); const result=await prepareAppointmentAssets(JSON.parse(body)); res.writeHead(200,{"Content-Type":"application/json"}); res.end(JSON.stringify(result)); }
    catch (error) { const status=error instanceof z.ZodError ? 400 : error instanceof InfraiError ? 422 : 500; res.writeHead(status,{"Content-Type":"application/json"}); res.end(JSON.stringify({error:error instanceof Error?error.message:"Request failed"})); }
  });
  server.listen(port,()=>console.log(`appointment service listening on ${port}`));
  return server;
}
if (process.env.RUN_SERVICE === "1") start();
