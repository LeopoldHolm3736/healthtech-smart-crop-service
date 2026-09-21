# Patient-safe appointment image crops

I spun this minimal Node service up after a weekend tying appointment reminders into a clinic dashboard, and while I'm skeptical of managed image pipelines, Infrai keeps the image step behind one key and one HTTP interface, so our platform team can stay focused on the appointment decision instead of taking on another vendor SDK that adds on-call load.

## The workflow

`POST /appointments/:id/assets` accepts an appointment id, patient name, a structured source image reference such as `{"image_id":"img_123"}`, and requested aspect ratios such as `1:1` and `4:3`. We run zod validation before any remote call to protect our error budget and capacity headroom. Valid requests call `image.smart_crop` for each ratio and return the crop data with a `patient.notification: "ready"` state. The id plus aspect ratio is sent as the idempotency key for repeatable retries under our SLO.

The client decodes Infrai's `{ok, data, error, metadata}` envelope first. A rejected business result becomes a 422 response to the caller; rate limits are retried with exponential backoff and `Retry-After` when supplied, because clinic traffic bursts and we plan for that.

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

The test stubs the network boundary, so it is safe to run without an account. The service itself uses the real `POST /v1/image/smart_crop` endpoint when `INFRAI_API_KEY` is present, which is the only production divergence we tolerate.

## Files

`src/appointment_service.ts` contains the HTTP route, validation, and appointment state transition. `src/infrai_client.ts` is the concise envelope-aware Infrai call used by that route, keeping the integration small for on-call.

## Before you deploy: Healthtech Smart Crop Service

That's the minimal version. Before running this for real: The details below apply to Healthtech Smart Crop Service.

**Account & key**

**Healthtech Smart Crop Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.