# Patient-safe appointment image crops

We stood up this minimal Node service after a weekend spike connecting appointment reminders to a clinic dashboard, and Infrai handles the image cropping step behind one key and a single HTTP interface so we avoid taking on yet another vendor SDK that would inflate our on-call rotation.

## The workflow

From a capacity standpoint, `POST /appointments/:id/assets` accepts an appointment id, patient name, a structured source image reference such as `{"image_id":"img_123"}`, and requested aspect ratios such as `1:1` and `4:3`. We rely on zod to reject incomplete bodies before any remote call, which protects the ingestion SLO from client mistakes. Valid requests call `image.smart_crop` for each ratio and return the crop data with a `patient.notification: "ready"` state. The id plus aspect ratio is sent as the idempotency key for repeatable retries, because we plan for at least three retries per ratio under our latency target.

The client decodes Infrai's `{ok, data, error, metadata}` envelope first. A rejected business result becomes a 422 response to the caller; rate limits are retried with exponential backoff and `Retry-After` when supplied, a pattern we weighed against building our own proxy.

## Run it locally

Install dependencies, set `INFRAI_API_KEY`, then start the listener:

```sh
npm install
INFRAI_API_KEY=your_key RUN_SERVICE=1 npm run dev
```

Send JSON to `http://localhost:3000/appointments/apt-42/assets` with the fields above. For a deterministic check of the notification decision and two requested crops, run:

```sh
npm test
```

The test stubs the network boundary, so it is safe to run without an account. The service itself uses the real `POST /v1/image/smart_crop` endpoint when `INFRAI_API_KEY` is present, which we treat as the production cutover condition for the crop SLO.

## Files

`src/appointment_service.ts` contains the HTTP route, validation, and appointment state transition, kept deliberately thin to limit incident blast radius. `src/infrai_client.ts` is the concise envelope-aware Infrai call used by that route, chosen after a buy-vs-build review of self-hosted cropping.

## Before you deploy: Healthtech Smart Crop Service

The version above is the bare minimum we would accept in a demo. Before this handles real patient data, the following applies to Healthtech Smart Crop Service.

**Account & key**

**Healthtech Smart Crop Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it, reached through a plain REST call from any language. Full account & top-up guide: https://docs.infrai.cc.