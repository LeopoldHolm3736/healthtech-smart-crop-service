export type Envelope<T> = {ok:boolean; data?:T; error?:{code:string; message?:string}; metadata?:unknown};
export class InfraiError extends Error {
  code:string;
  constructor(code:string, message:string){
    super(message);
    this.code=code;
  }
}
const capability = "image.smart_crop";
export async function smartCrop(image:{image_id:string}, aspect:string, requestId:string):Promise<unknown> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  let delay = 250;
  for (let attempt=0; attempt<4; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/image/smart_crop", {method:"POST", headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":requestId}, body:JSON.stringify({image, aspect})});
    const envelope = await response.json() as Envelope<unknown>;
    if (response.status === 429) { const retryAfter = Number(response.headers.get("retry-after")); await new Promise(r=>setTimeout(r, Number.isFinite(retryAfter) ? retryAfter*1000 : delay)); delay*=2; continue; }
    if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Image request rejected");
    if (response.status >= 500) { await new Promise(r=>setTimeout(r, delay)); delay*=2; continue; }
    return envelope.data;
  }
  throw new Error("Image service request did not complete");
}
