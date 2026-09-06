import assert from "node:assert/strict";
import { prepareAppointmentAssets } from "./appointment_service.js";
const originalFetch=globalThis.fetch;
globalThis.fetch=async (_input, init)=>new Response(JSON.stringify({ok:true,data:{id:"crop-1"},metadata:{}}),{status:200,headers:{"content-type":"application/json"}});
const result=await prepareAppointmentAssets({appointmentId:"apt-42",patientName:"Mina",image:{image_id:"img_123"},aspects:["1:1","4:3"]});
assert.equal(result.patient.notification,"ready");
assert.equal(result.crops.length,2);
globalThis.fetch=originalFetch;
console.log("appointment asset decision passed");
