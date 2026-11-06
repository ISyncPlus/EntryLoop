# Stable staging deployment plan · Stage 3

**Prepared locally; no staging deployment/account change performed.** No Vercel CLI or project linkage was found in this checkout. A new login/project/domain/protection change requires approval. Existing production `https://entry-loop.vercel.app` and its storage are outside deployment authorization. Never relink that project or transfer its private signing identities.

## Reviewable artifact

Run `npm run staging:prepare` from EntryLoop. This builds the current tree, then creates a new allowlisted source snapshot under `.cache/stage3/staging-<build>-<time>/`. `.cache/stage3/staging-latest.json` records its exact location, source revision/dirty flag/build fingerprint and SHA-256 per file. It never installs a CLI, logs in, links a project, deploys or pushes.

Copied: source/public assets, tests with synthetic fixtures, scripts, lockfile and necessary config/notices. Excluded: `.git`, `.vercel`, `.env*`, `.cache`, browser databases/profiles, certificates and key files. Symlinks/sensitive nested paths and credential-bearing npm config are refused. Runtime non-exportable keys are not source files and are never serialized. The build emits `build-info.json`; build fingerprint and revision/modified-checkout status appear in Storage context and recovery. A dirty build is identified as dirty, not represented as the exact clean HEAD. Metadata is descriptive, not a security attestation.

The snapshot's `build-provenance.json` retains original revision/dirty state when uploaded without `.git`. Source fingerprints include src/public/scripts/config/lockfile. Tailwind scanning is limited to app source so documentation/cache files cannot change staged CSS unexpectedly. Rebuild/hash comparison and final artifact identity are recorded in STAGE_3_REPORT.md. Do not upload the whole project folder containing browser test profiles.

## Approval needed before external actions

Approve a **separate Vercel project**, suggested name `entryloop-staging` (availability unverified), its owner/team, and one stable HTTPS hostname. Use its permanent project domain or a dedicated approved staging custom domain. Do not use random deployment URLs for persistence acceptance, move an existing production domain, or assume origin changes migrate IndexedDB.

After approval only:

1. Install/use Vercel CLI in an approved environment and authenticate interactively (`vercel login`); never paste tokens here or commit them. Record the chosen staging project ID from its dashboard. CLI/account installation/linking was not executed by Codex.
2. Enter the **generated snapshot directory**, never the production-linked checkout. Run `vercel link --project entryloop-staging`. Verify owner/project ID in `.vercel/project.json` against the approved dedicated staging project before any upload.
3. Set the approved project ID as a local nonsecret guard value and check it:

```sh
export ENTRYLOOP_APPROVED_STAGING_PROJECT_ID='the-reviewed-staging-project-id'
node --input-type=module -e 'import fs from "node:fs"; const p=JSON.parse(fs.readFileSync(".vercel/project.json","utf8")); if(!process.env.ENTRYLOOP_APPROVED_STAGING_PROJECT_ID || p.projectId!==process.env.ENTRYLOOP_APPROVED_STAGING_PROJECT_ID) throw Error("Stop: wrong project");'
```

4. Only after that check, deploy the snapshot using `vercel deploy --prod`. Here `--prod` means the stable deployment of the **separate staging project**, never EntryLoop's existing production project. Do not run it in `/Users/InhouseHQ/Desktop/EntryLoop/`. If there is any ambiguity about the project, stop; do not infer permission from the flag's name.
5. Record the actual stable hostname, deployment ID, snapshot manifest and live `/build-info.json`. Build command `npm run build`, output `dist`, Vite, supported Node >=22.12 (local evidence Node24.20). No signing secret environment variables or backend are required. Retain the stable origin for every subsequent build.

Do not disable account-wide deployment protection. Review protection only for this separate fictional-data staging project with explicit approval. An authentication redirect can serve login HTML instead of app assets/manifest/SW, so verify content and offline caching on each actual phone. A 200 response alone is insufficient. Never embed a bypass token into a PWA or ticket package.

## Post-deployment acceptance

- Direct `/`, `/events/new?scanner=stage3-organizer`, `/scan?scanner=gate-north`, and real event links must load and refresh through the existing SPA rewrite. A nonexistent path should show the app's not-found page, not a fake event.
- Verify build metadata against the snapshot, HTTPS, MIME types for JS/manifest/SW, cached resources, waiting-worker notice and normal all-window-close activation. Do not clear storage to update. Re-run the two-build persistence procedure on staging before relying on updates.
- Open the **same stable URL** on Android Chrome and iOS Safari; record browser/installed-app contexts, camera permission grant/denial, first normal offline reload, lazy decoder first use and retained native keys. Hardware tests have not been performed here; desktop WebKit is not physical iOS proof.
- Run PHYSICAL_ACCEPTANCE.md with fictional records. Keep original production contexts intact. Different hostname, scheme/port, browser profile/private window or installed-app partition can mean different storage; publishing code never migrates local data.
- On failure, retain current records and deployment/build evidence. Revert assets only to a schema-compatible build on the same staging project, following waiting-worker rules; never delete a database as rollback. Native v30 schema is unchanged in Stage 3. Unknown/new schemas remain recovery-required.

Staging success cannot waive the FAILED original persistence incident or independently certify security. Stage 4/deployment to actual production requires separate authorization.

Primary references: [Vercel CLI project linking](https://vercel.com/docs/cli/link), [CLI deployment](https://vercel.com/docs/projects/deploy-from-cli), [generated deployment URLs](https://vercel.com/docs/deployments/generated-urls), [deployment protection](https://vercel.com/docs/deployment-protection). Review current account-specific settings at execution time.

Local artifact verification completed: see STAGE_3_REPORT.md / STAGE_3_EVIDENCE.json for the exact tested source fingerprint/revision/dirty flag, snapshot folder and 15 matching output SHA-256 values. No live staging hostname is claimed. HTTPS/camera and SW lifecycle background: [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [MDN service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers). Source-scan configuration follows [Tailwind explicit source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files).
